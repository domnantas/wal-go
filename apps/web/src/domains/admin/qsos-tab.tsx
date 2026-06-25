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
import { Label } from "@WAL-GO/ui/components/label";
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
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ScoreBadge } from "@/domains/scoring/score-badge";
import { orpc } from "@/utils/orpc";

function formatDateTime(date: Date) {
	return format(date, "yyyy-MM-dd HH:mm");
}

export function QsosTab() {
	const { data: seasons } = useQuery(orpc.admin.seasons.list.queryOptions());
	const [seasonId, setSeasonId] = useState<null | number>(null);
	const seasonOptions = seasons ?? [];

	const activeSeasonId =
		seasonOptions.find((s) => s.status === "active")?.id ?? null;
	useEffect(() => {
		if (seasonId === null && activeSeasonId !== null) {
			setSeasonId(activeSeasonId);
		}
	}, [seasonId, activeSeasonId]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3">
				<Label htmlFor="qso-season-select">Sezonas</Label>
				<Select
					onValueChange={(v) => setSeasonId(Number(v))}
					value={seasonId === null ? "" : String(seasonId)}
				>
					<SelectTrigger id="qso-season-select">
						<SelectValue>
							{(value: unknown) => {
								const strValue = value as string;
								return strValue
									? (seasonOptions.find((s) => String(s.id) === strValue)
											?.name ?? strValue)
									: "Pasirinkite sezoną";
							}}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{seasonOptions.map((s) => (
							<SelectItem key={s.id} value={String(s.id)}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{seasonId === null ? (
				<p className="py-10 text-center text-muted-foreground text-sm">
					Pasirinkite sezoną, kad matytumėte QSO
				</p>
			) : (
				<QsosContent key={seasonId} seasonId={seasonId} />
			)}
		</div>
	);
}

function QsosContent({ seasonId }: { seasonId: number }) {
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const { data: qsos, isPending: isQsosPending } = useQuery(
		orpc.admin.qsos.list.queryOptions({ input: { seasonId, page } })
	);
	const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

	const invalidateAndClear = () => {
		queryClient.invalidateQueries({
			queryKey: orpc.admin.qsos.list.key({ input: { seasonId } }),
		});
		setSelectedIds(new Set());
	};

	const deleteQso = useMutation(
		orpc.admin.qsos.delete.mutationOptions({
			onSuccess: () => {
				invalidateAndClear();
				toast.success("QSO ištrintas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	const deleteQsos = useMutation(
		orpc.admin.qsos.deleteMany.mutationOptions({
			onSuccess: (_data, variables) => {
				invalidateAndClear();
				toast.success(`Ištrinta QSO: ${variables.ids.length}`);
			},
			onError: (e) => toast.error(e.message),
		})
	);

	if (isQsosPending) {
		return (
			<div className="flex justify-center py-10">
				<Spinner className="size-8" />
			</div>
		);
	}

	const rows = qsos?.rows ?? [];
	const pageCount = qsos?.pageCount ?? 1;
	const total = qsos?.total ?? 0;
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
			<div className="overflow-x-auto rounded-4xl border border-border bg-card">
				<Table className="text-sm">
					<TableHeader>
						<TableRow className="bg-muted/40 hover:bg-muted/40">
							<TableHead className="px-4">
								<Checkbox
									aria-label="Pažymėti visus"
									checked={allSelected}
									disabled={rows.length === 0}
									indeterminate={someSelected && !allSelected}
									onCheckedChange={(checked) => toggleAll(checked === true)}
								/>
							</TableHead>
							<TableHead className="px-4">Data ir laikas</TableHead>
							<TableHead className="px-4">Operatorius</TableHead>
							<TableHead className="px-4">Korespondentas</TableHead>
							<TableHead className="px-4">Diapazonas</TableHead>
							<TableHead className="px-4">Moduliacija</TableHead>
							<TableHead className="px-4">Kvadratai</TableHead>
							<TableHead className="px-4">Taškai</TableHead>
							<TableHead className="px-4" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell
									className="px-4 py-10 text-center text-muted-foreground"
									colSpan={9}
								>
									Nėra QSO šiame sezone
								</TableCell>
							</TableRow>
						) : (
							rows.map((q) => (
								<TableRow
									data-state={selectedIds.has(q.id) ? "selected" : undefined}
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
									<TableCell className="px-4 font-bold">
										{q.operatorCallsign}
									</TableCell>
									<TableCell className="px-4">{q.contactCallsign}</TableCell>
									<TableCell className="px-4">
										<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground text-xs">
											{q.band}
										</span>
									</TableCell>
									<TableCell className="px-4">
										<span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
											{q.mode}
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
									<TableCell className="px-4">
										<ScoreBadge confirmed={q.confirmed} score={q.score} />
									</TableCell>
									<TableCell className="px-4 text-right">
										<AlertDialog>
											<AlertDialogTrigger
												render={
													<Button
														aria-label="Ištrinti QSO"
														size="icon-sm"
														variant="ghost"
													>
														<Trash2 className="size-4" />
													</Button>
												}
											/>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Ištrinti QSO?</AlertDialogTitle>
													<AlertDialogDescription>
														{formatDateTime(new Date(q.qsoAt))} —{" "}
														{q.operatorCallsign} / {q.contactCallsign} {q.band}{" "}
														{q.mode}. Taškai bus perskaičiuoti.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Atšaukti</AlertDialogCancel>
													<AlertDialogAction
														onClick={() => deleteQso.mutate({ id: q.id })}
														variant="destructive"
													>
														Ištrinti
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
			{pageCount > 1 ? (
				<div className="flex items-center justify-between gap-4">
					<p className="text-muted-foreground text-sm">
						{total} QSO &middot; puslapis {page} iš {pageCount}
					</p>
					<div className="flex gap-2">
						<Button
							disabled={page <= 1}
							onClick={() => setPage((prev) => Math.max(1, prev - 1))}
							size="icon-sm"
							variant="outline"
						>
							<ChevronLeft />
						</Button>
						<Button
							disabled={page >= pageCount}
							onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
							size="icon-sm"
							variant="outline"
						>
							<ChevronRight />
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
