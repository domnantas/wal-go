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
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

function formatDateTime(date: Date) {
	return format(date, "yyyy-MM-dd HH:mm");
}

export function QsosTab() {
	const seasons = useQuery(orpc.admin.seasons.list.queryOptions());
	const [seasonId, setSeasonId] = useState<null | number>(null);
	const seasonOptions = seasons.data ?? [];

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
				<QsosContent seasonId={seasonId} />
			)}
		</div>
	);
}

function QsosContent({ seasonId }: { seasonId: number }) {
	const queryClient = useQueryClient();
	const qsos = useQuery(
		orpc.admin.qsos.list.queryOptions({ input: { seasonId } })
	);

	const deleteQso = useMutation(
		orpc.admin.qsos.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.admin.qsos.list.queryOptions({ input: { seasonId } })
						.queryKey,
				});
				toast.success("QSO ištrintas");
			},
			onError: (e) => toast.error(e.message),
		})
	);

	if (qsos.isPending) {
		return (
			<div className="flex justify-center py-10">
				<Spinner className="size-8" />
			</div>
		);
	}

	const rows = qsos.data ?? [];

	return (
		<div className="overflow-x-auto rounded-4xl border border-border bg-card">
			<Table className="text-sm">
				<TableHeader>
					<TableRow className="bg-muted/40 hover:bg-muted/40">
						<TableHead className="px-4">Data ir laikas</TableHead>
						<TableHead className="px-4">Operatorius</TableHead>
						<TableHead className="px-4">Korespondentas</TableHead>
						<TableHead className="px-4">Diapazonas</TableHead>
						<TableHead className="px-4">Moduliacija</TableHead>
						<TableHead className="px-4">Kvadratai</TableHead>
						<TableHead className="px-4" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.length === 0 ? (
						<TableRow>
							<TableCell
								className="px-4 py-10 text-center text-muted-foreground"
								colSpan={7}
							>
								Nėra QSO šiame sezone
							</TableCell>
						</TableRow>
					) : (
						rows.map((q) => (
							<TableRow key={q.id}>
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
	);
}
