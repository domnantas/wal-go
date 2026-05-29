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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@WAL-GO/ui/components/tabs";
import { sessionOptions } from "@better-auth-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { format } from "date-fns";
import { Plus, Shield, ShieldOff, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin")({
	async beforeLoad({ context: { queryClient } }) {
		const session = await getUser();
		queryClient.setQueryData(sessionOptions(authClient).queryKey, session);
		if (!session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
		if (session.user.role !== "admin") {
			throw redirect({ to: "/" });
		}
		return { session };
	},
	component: AdminPage,
});

function AdminPage() {
	return (
		<main className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<h1 className="font-bold font-serif text-3xl">Administravimas</h1>
			<Tabs defaultValue="users">
				<TabsList>
					<TabsTrigger value="users">Naudotojai</TabsTrigger>
					<TabsTrigger value="seasons">Sezonai</TabsTrigger>
				</TabsList>
				<TabsContent value="users">
					<UsersTab />
				</TabsContent>
				<TabsContent value="seasons">
					<SeasonsTab />
				</TabsContent>
			</Tabs>
		</main>
	);
}

interface UserRow {
	banned: boolean;
	banReason: null | string;
	createdAt: Date;
	email: string;
	id: string;
	name: string;
	role: string;
}

function UsersTab() {
	const queryClient = useQueryClient();
	const users = useQuery(orpc.admin.users.list.queryOptions());

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: orpc.admin.users.list.queryOptions().queryKey,
		});

	const setRole = useMutation(
		orpc.admin.users.setRole.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Rolė pakeista");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const ban = useMutation(
		orpc.admin.users.ban.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Naudotojas užblokuotas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const unban = useMutation(
		orpc.admin.users.unban.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Naudotojas atblokuotas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	if (users.isPending) {
		return (
			<div className="flex justify-center py-10">
				<Spinner className="size-8" />
			</div>
		);
	}

	const rows = users.data ?? [];

	return (
		<div className="overflow-x-auto rounded-4xl border border-border bg-card">
			<Table className="text-sm">
				<TableHeader>
					<TableRow className="bg-muted/40 hover:bg-muted/40">
						<TableHead className="px-4">Šaukinys</TableHead>
						<TableHead className="px-4">El. paštas</TableHead>
						<TableHead className="px-4">Rolė</TableHead>
						<TableHead className="px-4">Būsena</TableHead>
						<TableHead className="px-4 text-right">Veiksmai</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((u) => (
						<UserRow
							key={u.id}
							onBan={(userId) => ban.mutate({ userId })}
							onSetRole={(userId, role) => setRole.mutate({ userId, role })}
							onUnban={(userId) => unban.mutate({ userId })}
							user={u}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function UserRow({
	user,
	onSetRole,
	onBan,
	onUnban,
}: {
	user: UserRow;
	onSetRole: (userId: string, role: "admin" | "user") => void;
	onBan: (userId: string) => void;
	onUnban: (userId: string) => void;
}) {
	return (
		<TableRow>
			<TableCell className="px-4 font-bold">{user.name}</TableCell>
			<TableCell className="px-4 text-muted-foreground">{user.email}</TableCell>
			<TableCell className="px-4">
				<span
					className={
						user.role === "admin"
							? "inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 font-medium text-accent text-xs"
							: "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground text-xs"
					}
				>
					{user.role === "admin" ? "Administratorius" : "Naudotojas"}
				</span>
			</TableCell>
			<TableCell className="px-4">
				{user.banned ? (
					<span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 font-medium text-destructive text-xs">
						Užblokuotas
					</span>
				) : (
					<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
						Aktyvus
					</span>
				)}
			</TableCell>
			<TableCell className="px-4">
				<div className="flex justify-end gap-2">
					<Button
						onClick={() =>
							onSetRole(user.id, user.role === "admin" ? "user" : "admin")
						}
						size="sm"
						title={
							user.role === "admin" ? "Pažeminti į naudotoją" : "Suteikti admin"
						}
						variant="ghost"
					>
						{user.role === "admin" ? (
							<ShieldOff className="size-4" />
						) : (
							<Shield className="size-4" />
						)}
						{user.role === "admin" ? "Atimti admin" : "Suteikti admin"}
					</Button>
					{user.banned ? (
						<Button onClick={() => onUnban(user.id)} size="sm" variant="ghost">
							<UserCheck className="size-4" />
							Atblokuoti
						</Button>
					) : (
						<AlertDialog>
							<AlertDialogTrigger
								render={
									<Button size="sm" variant="ghost">
										<UserX className="size-4" />
										Užblokuoti
									</Button>
								}
							/>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Užblokuoti {user.name}?</AlertDialogTitle>
									<AlertDialogDescription>
										Naudotojas nebegalės prisijungti.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Atšaukti</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => onBan(user.id)}
										variant="destructive"
									>
										Užblokuoti
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}

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

const dateFormatter = new Intl.DateTimeFormat("lt-LT", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

function toDatetimeLocal(date: Date) {
	return format(date, "yyyy-MM-dd'T'HH:mm");
}

function SeasonsTab() {
	const queryClient = useQueryClient();
	const seasons = useQuery(orpc.admin.seasons.list.queryOptions());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingSeason, setEditingSeason] = useState<null | SeasonRow>(null);

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: orpc.admin.seasons.list.queryOptions().queryKey,
		});

	const deleteSeason = useMutation(
		orpc.admin.seasons.delete.mutationOptions({
			onSuccess: () => {
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

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-end">
				<SeasonFormDialog
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
									{dateFormatter.format(new Date(s.startsAt))}
								</TableCell>
								<TableCell className="px-4 text-muted-foreground tabular-nums">
									{dateFormatter.format(new Date(s.endsAt))}
								</TableCell>
								<TableCell className="px-4">
									<span className={STATUS_CLASSES[s.status]}>
										{STATUS_LABELS[s.status]}
									</span>
								</TableCell>
								<TableCell className="px-4">
									<div className="flex justify-end gap-2">
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
	const [name, setName] = useState(season?.name ?? "");
	const [startsAt, setStartsAt] = useState(
		season ? toDatetimeLocal(new Date(season.startsAt)) : ""
	);
	const [endsAt, setEndsAt] = useState(
		season ? toDatetimeLocal(new Date(season.endsAt)) : ""
	);

	const create = useMutation(
		orpc.admin.seasons.create.mutationOptions({
			onSuccess: () => {
				onSaved();
				onClose();
				toast.success("Sezonas sukurtas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const update = useMutation(
		orpc.admin.seasons.update.mutationOptions({
			onSuccess: () => {
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
