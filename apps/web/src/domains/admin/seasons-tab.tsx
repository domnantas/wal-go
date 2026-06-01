import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@WAL-GO/ui/components/alert-dialog";
import { Button } from "@WAL-GO/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@WAL-GO/ui/components/dialog";
import { Input } from "@WAL-GO/ui/components/input";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@WAL-GO/ui/components/table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import { MembershipsDialog } from "./memberships-dialog";

interface SeasonRow {
	endsAt: Date;
	id: number;
	name: string;
	startsAt: Date;
	status: "active" | "ended" | "upcoming";
}

const STATUS_LABELS: Record<SeasonRow["status"], string> = {
	active: "Aktyvus",
	upcoming: "Būsimas",
	ended: "Pasibaigęs",
};

const STATUS_CLASSES: Record<SeasonRow["status"], string> = {
	active:
		"inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 font-medium text-accent text-xs",
	upcoming:
		"inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs",
	ended:
		"inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground/40 text-xs",
};

function formatDateTime(date: Date) {
	return format(date, "yyyy-MM-dd HH:mm");
}

function toDatetimeLocal(date: Date) {
	return format(date, "yyyy-MM-dd'T'HH:mm");
}

function deriveStatus(
	startsAt: Date,
	endsAt: Date
): "active" | "ended" | "upcoming" {
	const now = new Date();
	if (now < startsAt) {
		return "upcoming";
	}
	if (now > endsAt) {
		return "ended";
	}
	return "active";
}

export function SeasonsTab() {
	const queryClient = useQueryClient();
	const seasons = useQuery(orpc.admin.seasons.list.queryOptions());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingSeason, setEditingSeason] = useState<null | SeasonRow>(null);
	const [membersSeasonId, setMembersSeasonId] = useState<null | number>(null);

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: orpc.admin.seasons.list.queryOptions().queryKey,
		});

	const deleteSeason = useMutation(
		orpc.admin.seasons.delete.mutationOptions({
			onSuccess: (_, { id }) => {
				queryClient.setQueryData(
					orpc.admin.seasons.list.queryOptions().queryKey,
					(old) => old?.filter((s) => s.id !== id) ?? []
				);
				invalidate();
				toast.success("Sezonas ištrintas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	function openCreate() {
		setEditingSeason(null);
		setDialogOpen(true);
	}

	function openEdit(season: SeasonRow) {
		setEditingSeason(season);
		setDialogOpen(true);
	}

	if (seasons.isPending) {
		return (
			<div className="flex justify-center py-10">
				<Spinner className="size-8" />
			</div>
		);
	}

	const rows = seasons.data ?? [];
	const membersSeasonName = rows.find((s) => s.id === membersSeasonId)?.name;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-end">
				<SeasonFormDialog
					key={editingSeason?.id ?? "create"}
					onClose={() => setDialogOpen(false)}
					onSaved={invalidate}
					open={dialogOpen}
					season={editingSeason}
				>
					<Button onClick={openCreate} size="sm">
						<Plus className="size-4" />
						Naujas sezonas
					</Button>
				</SeasonFormDialog>
			</div>
			<div className="overflow-x-auto rounded-4xl border border-border bg-card">
				<Table className="text-sm">
					<TableHeader>
						<TableRow className="bg-muted/40 hover:bg-muted/40">
							<TableHead className="px-4">Pavadinimas</TableHead>
							<TableHead className="px-4">Pradžia</TableHead>
							<TableHead className="px-4">Pabaiga</TableHead>
							<TableHead className="px-4">Būsena</TableHead>
							<TableHead className="px-4 text-right">Veiksmai</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((s) => (
							<TableRow key={s.id}>
								<TableCell className="px-4 font-medium">{s.name}</TableCell>
								<TableCell className="px-4 text-muted-foreground tabular-nums">
									{formatDateTime(new Date(s.startsAt))}
								</TableCell>
								<TableCell className="px-4 text-muted-foreground tabular-nums">
									{formatDateTime(new Date(s.endsAt))}
								</TableCell>
								<TableCell className="px-4">
									<span className={STATUS_CLASSES[s.status]}>
										{STATUS_LABELS[s.status]}
									</span>
								</TableCell>
								<TableCell className="px-4">
									<div className="flex justify-end gap-2">
										<Button
											onClick={() => setMembersSeasonId(s.id)}
											size="sm"
											variant="ghost"
										>
											<UserPlus className="size-4" />
											Nariai
										</Button>
										<Button
											onClick={() => openEdit(s)}
											size="sm"
											variant="ghost"
										>
											Redaguoti
										</Button>
										<AlertDialog>
											<AlertDialogTrigger
												render={
													<Button size="sm" variant="ghost">
														Ištrinti
													</Button>
												}
											/>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Ištrinti {s.name}?
													</AlertDialogTitle>
													<AlertDialogDescription>
														Bus ištrinti visi su sezonu susiję QSO ir narystės.
														Šis veiksmas negrįžtamas.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Atšaukti</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => deleteSeason.mutate({ id: s.id })}
														variant="destructive"
													>
														Ištrinti
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			{membersSeasonId !== null && (
				<MembershipsDialog
					onClose={() => setMembersSeasonId(null)}
					seasonId={membersSeasonId}
					seasonName={membersSeasonName ?? ""}
				/>
			)}
		</div>
	);
}

function SeasonFormDialog({
	open,
	onClose,
	onSaved,
	season,
	children,
}: {
	open: boolean;
	onClose: () => void;
	onSaved: () => void;
	season: null | SeasonRow;
	children: React.ReactNode;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState(season?.name ?? "");
	const [startsAt, setStartsAt] = useState(
		season ? toDatetimeLocal(new Date(season.startsAt)) : ""
	);
	const [endsAt, setEndsAt] = useState(
		season ? toDatetimeLocal(new Date(season.endsAt)) : ""
	);

	const listKey = orpc.admin.seasons.list.queryOptions().queryKey;

	const create = useMutation(
		orpc.admin.seasons.create.mutationOptions({
			onSuccess: (data) => {
				const startsAtDate = new Date(data.startsAt);
				const endsAtDate = new Date(data.endsAt);
				queryClient.setQueryData(listKey, (old) => [
					...(old ?? []),
					{
						id: data.id,
						name: data.name,
						startsAt: startsAtDate,
						endsAt: endsAtDate,
						status: deriveStatus(startsAtDate, endsAtDate),
					},
				]);
				onSaved();
				onClose();
				toast.success("Sezonas sukurtas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const update = useMutation(
		orpc.admin.seasons.update.mutationOptions({
			onSuccess: (_, { id, name: newName, startsAt: s, endsAt: e }) => {
				const startsAtDate = new Date(s);
				const endsAtDate = new Date(e);
				queryClient.setQueryData(
					listKey,
					(old) =>
						old?.map((row) =>
							row.id === id
								? {
										...row,
										name: newName,
										startsAt: startsAtDate,
										endsAt: endsAtDate,
										status: deriveStatus(startsAtDate, endsAtDate),
									}
								: row
						) ?? []
				);
				onSaved();
				onClose();
				toast.success("Sezonas atnaujintas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const isPending = create.isPending || update.isPending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const startsAtIso = new Date(startsAt).toISOString();
		const endsAtIso = new Date(endsAt).toISOString();
		if (season) {
			update.mutate({
				id: season.id,
				name,
				startsAt: startsAtIso,
				endsAt: endsAtIso,
			});
		} else {
			create.mutate({ name, startsAt: startsAtIso, endsAt: endsAtIso });
		}
	}

	return (
		<Dialog
			onOpenChange={(o) => {
				if (!o) {
					onClose();
				}
			}}
			open={open}
		>
			<DialogTrigger render={<span />}>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{season ? "Redaguoti sezoną" : "Naujas sezonas"}
					</DialogTitle>
				</DialogHeader>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<div className="flex flex-col gap-2">
						<Label htmlFor="season-name">Pavadinimas</Label>
						<Input
							id="season-name"
							onChange={(e) => setName(e.target.value)}
							placeholder="WAL GO 2026"
							required
							value={name}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="season-starts">Pradžia (vietinis laikas)</Label>
						<Input
							id="season-starts"
							onChange={(e) => setStartsAt(e.target.value)}
							required
							type="datetime-local"
							value={startsAt}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="season-ends">Pabaiga (vietinis laikas)</Label>
						<Input
							id="season-ends"
							onChange={(e) => setEndsAt(e.target.value)}
							required
							type="datetime-local"
							value={endsAt}
						/>
					</div>
					<DialogFooter>
						<Button disabled={isPending} type="submit">
							{isPending ? <Spinner /> : null}
							{season ? "Išsaugoti" : "Sukurti"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
