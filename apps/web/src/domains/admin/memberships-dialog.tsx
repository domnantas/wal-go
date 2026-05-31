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
	DialogHeader,
	DialogTitle,
} from "@WAL-GO/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@WAL-GO/ui/components/select";
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
import { UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

const TEAM_LABELS: Record<"yellow" | "green" | "red", string> = {
	yellow: "Geltona",
	green: "Žalia",
	red: "Raudona",
};

interface MembershipRow {
	id: number;
	joinedAt: Date;
	team: "green" | "red" | "yellow";
	userEmail: string;
	userId: string;
	userName: string;
}

export function MembershipsDialog({
	seasonId,
	seasonName,
	onClose,
}: {
	seasonId: number;
	seasonName: string;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const memberships = useQuery(
		orpc.admin.memberships.list.queryOptions({ input: { seasonId } })
	);
	const users = useQuery(orpc.admin.users.list.queryOptions());
	const [addUserId, setAddUserId] = useState("");
	const [addTeam, setAddTeam] = useState<"green" | "red" | "yellow">("yellow");

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: orpc.admin.memberships.list.queryOptions({
				input: { seasonId },
			}).queryKey,
		});

	const addMembership = useMutation(
		orpc.admin.memberships.add.mutationOptions({
			onSuccess: () => {
				invalidate();
				setAddUserId("");
				toast.success("Narys pridėtas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const removeMembership = useMutation(
		orpc.admin.memberships.remove.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Narys pašalintas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const setTeam = useMutation(
		orpc.admin.memberships.setTeam.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Komanda pakeista");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const existingUserIds = new Set(
		(memberships.data ?? []).map((m) => m.userId)
	);
	const availableUsers = (users.data ?? []).filter(
		(u) => !existingUserIds.has(u.id)
	);

	function handleAdd(e: React.FormEvent) {
		e.preventDefault();
		if (!addUserId) {
			return;
		}
		addMembership.mutate({ seasonId, userId: addUserId, team: addTeam });
	}

	return (
		<Dialog onOpenChange={(o) => !o && onClose()} open>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Nariai — {seasonName}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4 overflow-x-auto">
					{memberships.isPending ? (
						<div className="flex justify-center py-6">
							<Spinner className="size-6" />
						</div>
					) : (
						<div className="overflow-x-auto rounded-2xl border border-border">
							<Table className="text-sm">
								<TableHeader>
									<TableRow className="bg-muted/40 hover:bg-muted/40">
										<TableHead className="px-4">Šaukinys</TableHead>
										<TableHead className="px-4">El. paštas</TableHead>
										<TableHead className="px-4">Komanda</TableHead>
										<TableHead className="px-4 text-right">Veiksmai</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(memberships.data ?? []).map((m) => (
										<MembershipTableRow
											key={m.id}
											membership={m as MembershipRow}
											onRemove={(id) =>
												removeMembership.mutate({ membershipId: id })
											}
											onSetTeam={(id, team) =>
												setTeam.mutate({ membershipId: id, team })
											}
										/>
									))}
									{(memberships.data ?? []).length === 0 && (
										<TableRow>
											<TableCell
												className="px-4 py-6 text-center text-muted-foreground"
												colSpan={4}
											>
												Narių nėra
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</div>
					)}
					<form
						className="flex flex-col gap-3 rounded-2xl border border-border p-4"
						onSubmit={handleAdd}
					>
						<p className="font-medium text-sm">Pridėti narį</p>
						<div className="flex gap-2">
							<Select onValueChange={setAddUserId} value={addUserId}>
								<SelectTrigger className="flex-1">
									<SelectValue placeholder="Pasirinkti naudotoją" />
								</SelectTrigger>
								<SelectContent>
									{availableUsers.map((u) => (
										<SelectItem key={u.id} value={u.id}>
											{u.name} ({u.email})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								onValueChange={(v) =>
									setAddTeam(v as "green" | "red" | "yellow")
								}
								value={addTeam}
							>
								<SelectTrigger className="w-36">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="yellow">{TEAM_LABELS.yellow}</SelectItem>
									<SelectItem value="green">{TEAM_LABELS.green}</SelectItem>
									<SelectItem value="red">{TEAM_LABELS.red}</SelectItem>
								</SelectContent>
							</Select>
							<Button
								disabled={!addUserId || addMembership.isPending}
								size="sm"
								type="submit"
							>
								{addMembership.isPending ? (
									<Spinner className="size-4" />
								) : (
									<UserPlus className="size-4" />
								)}
								Pridėti
							</Button>
						</div>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function MembershipTableRow({
	membership,
	onRemove,
	onSetTeam,
}: {
	membership: MembershipRow;
	onRemove: (id: number) => void;
	onSetTeam: (id: number, team: "green" | "red" | "yellow") => void;
}) {
	return (
		<TableRow>
			<TableCell className="px-4 font-bold">{membership.userName}</TableCell>
			<TableCell className="px-4 text-muted-foreground">
				{membership.userEmail}
			</TableCell>
			<TableCell className="px-4">
				<Select
					onValueChange={(v) =>
						onSetTeam(membership.id, v as "green" | "red" | "yellow")
					}
					value={membership.team}
				>
					<SelectTrigger className="h-7 w-28 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="yellow">{TEAM_LABELS.yellow}</SelectItem>
						<SelectItem value="green">{TEAM_LABELS.green}</SelectItem>
						<SelectItem value="red">{TEAM_LABELS.red}</SelectItem>
					</SelectContent>
				</Select>
			</TableCell>
			<TableCell className="px-4">
				<div className="flex justify-end">
					<AlertDialog>
						<AlertDialogTrigger
							render={
								<Button size="sm" variant="ghost">
									<UserMinus className="size-4" />
									Pašalinti
								</Button>
							}
						/>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Pašalinti {membership.userName}?
								</AlertDialogTitle>
								<AlertDialogDescription>
									Narystė bus ištrinta. Naudotojas galės iš naujo prisijungti
									prie sezono.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Atšaukti</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => onRemove(membership.id)}
									variant="destructive"
								>
									Pašalinti
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</TableCell>
		</TableRow>
	);
}
