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
import { Checkbox } from "@WAL-GO/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@WAL-GO/ui/components/dialog";
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
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

function formatDateTime(date: Date) {
	return format(date, "yyyy-MM-dd HH:mm");
}

export function UserQsosDialog({
	userId,
	userName,
	onClose,
}: {
	userId: string;
	userName: string;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const { data: qsos, isPending: isQsosPending } = useQuery(
		orpc.admin.users.qsos.queryOptions({ input: { userId } })
	);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

	const invalidateAndClear = () => {
		queryClient.invalidateQueries({
			queryKey: orpc.admin.users.qsos.queryOptions({ input: { userId } })
				.queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: orpc.admin.dashboard.queryOptions().queryKey,
		});
		setSelectedIds(new Set());
	};

	const deleteQsos = useMutation(
		orpc.admin.qsos.deleteMany.mutationOptions({
			onSuccess: (_data, variables) => {
				invalidateAndClear();
				toast.success(`Ištrinta QSO: ${variables.ids.length}`);
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const rows = qsos ?? [];
	const allSelected = rows.length > 0 && selectedIds.size === rows.length;
	const someSelected = selectedIds.size > 0;

	const toggleAll = (checked: boolean) =>
		setSelectedIds(checked ? new Set(rows.map((q) => q.id)) : new Set());

	const toggleOne = (id: number, checked: boolean) =>
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(id);
			} else {
				next.delete(id);
			}
			return next;
		});

	return (
		<Dialog onOpenChange={(o) => !o && onClose()} open>
			<DialogContent className="sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>{userName} QSO</DialogTitle>
					<DialogDescription>
						Peržiūrėkite ir ištrinkite naudotojo QSO. Taškai bus perskaičiuoti.
					</DialogDescription>
				</DialogHeader>

				{isQsosPending ? (
					<div className="flex justify-center py-10">
						<Spinner className="size-8" />
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{someSelected && (
							<div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-2">
								<span className="text-sm">Pažymėta: {selectedIds.size}</span>
								<AlertDialog>
									<AlertDialogTrigger
										render={
											<Button size="sm" variant="destructive">
												<Trash2 className="size-4" />
												Ištrinti pažymėtus
											</Button>
										}
									/>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Ištrinti {selectedIds.size} QSO?
											</AlertDialogTitle>
											<AlertDialogDescription>
												Pažymėti QSO bus negrįžtamai ištrinti. Taškai bus
												perskaičiuoti.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Atšaukti</AlertDialogCancel>
											<AlertDialogAction
												onClick={() =>
													deleteQsos.mutate({ ids: Array.from(selectedIds) })
												}
												variant="destructive"
											>
												Ištrinti
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						)}
						<div className="max-h-[60svh] overflow-auto rounded-2xl border border-border">
							<Table className="text-sm">
								<TableHeader>
									<TableRow className="bg-muted/40 hover:bg-muted/40">
										<TableHead className="px-4">
											<Checkbox
												aria-label="Pažymėti visus"
												checked={allSelected}
												disabled={rows.length === 0}
												indeterminate={someSelected && !allSelected}
												onCheckedChange={(checked) =>
													toggleAll(checked === true)
												}
											/>
										</TableHead>
										<TableHead className="px-4">Data ir laikas</TableHead>
										<TableHead className="px-4">Sezonas</TableHead>
										<TableHead className="px-4">Korespondentas</TableHead>
										<TableHead className="px-4">Diapazonas</TableHead>
										<TableHead className="px-4">Kvadratai</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.length === 0 ? (
										<TableRow>
											<TableCell
												className="px-4 py-10 text-center text-muted-foreground"
												colSpan={6}
											>
												Naudotojas neturi QSO
											</TableCell>
										</TableRow>
									) : (
										rows.map((q) => (
											<TableRow
												data-state={
													selectedIds.has(q.id) ? "selected" : undefined
												}
												key={q.id}
											>
												<TableCell className="px-4">
													<Checkbox
														aria-label="Pažymėti QSO"
														checked={selectedIds.has(q.id)}
														onCheckedChange={(checked) =>
															toggleOne(q.id, checked === true)
														}
													/>
												</TableCell>
												<TableCell className="px-4 tabular-nums">
													{formatDateTime(new Date(q.qsoAt))}
												</TableCell>
												<TableCell className="px-4 text-muted-foreground">
													{q.seasonName}
												</TableCell>
												<TableCell className="px-4">
													{q.contactCallsign}
												</TableCell>
												<TableCell className="px-4">
													<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground text-xs">
														{q.band}
													</span>
												</TableCell>
												<TableCell className="px-4">
													<div className="flex flex-wrap gap-1">
														<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-mono text-foreground text-xs">
															{q.operatorSquare}
														</span>
														{q.contactSquare && (
															<span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-muted-foreground text-xs">
																{q.contactSquare}
															</span>
														)}
													</div>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
