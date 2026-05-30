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
import { Shield, ShieldOff, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

interface UserData {
	banned: boolean;
	banReason: null | string;
	createdAt: Date;
	email: string;
	id: string;
	name: string;
	role: string;
}

export function UsersTab() {
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
						<UserTableRow
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

function UserTableRow({
	user,
	onSetRole,
	onBan,
	onUnban,
}: {
	user: UserData;
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
