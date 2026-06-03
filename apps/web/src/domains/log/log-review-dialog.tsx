import type { ImportError, ImportSuccess } from "@WAL-GO/api/routers/qsos";
import {
	BLOCKED_CALLSIGN_REGEX,
	isValidCallsign,
	normalizeCallsign,
} from "@WAL-GO/callsign";
import { isValidWalSquare, normalizeWalSquare } from "@WAL-GO/grid";
import type { DraftQso, ParseResult, SkipReason } from "@WAL-GO/log-parse";
import { Button } from "@WAL-GO/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@WAL-GO/ui/components/dialog";
import { Input } from "@WAL-GO/ui/components/input";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@WAL-GO/ui/components/table";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { formatInVilnius } from "@/lib/date";
import { orpc } from "@/utils/orpc";

export interface ImportResult {
	accepted: number;
	errors: ImportError[];
	imported: ImportSuccess[];
	skipped: number;
}

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
	blockedCallsign: "Blokuojamas šaukinys. Слава Україні! 🇺🇦",
	callsignMismatch: "Operatoriaus šaukinys nesutampa",
	exactDuplicate: "Jau užregistruotas",
	gameDuplicate: "Pakartotinis pagal žaidimo taisykles",
	invalidBand: "Neatpažintas diapazonas",
	invalidCallsign: "Neteisingas šaukinys",
	invalidDate: "Neteisinga data",
	invalidMode: "Neatpažinta moduliacija",
	invalidSquare: "Neteisingas WAL kvadratas",
	malformedLine: "Neteisingas formatas",
	outsideSeason: "Už sezono ribų",
	selfContact: "QSO su savimi",
};

const PAGE_SIZE = 20;

function formatTime(value: null | string) {
	return value ? formatInVilnius(value, "yyyy-MM-dd HH:mm") : "—";
}

interface ReviewRow {
	contactSquare: string;
	draft: DraftQso;
	operatorSquare: string;
}

function isContactSquareValid(value: string) {
	const normalized = normalizeWalSquare(value);
	return (
		normalized === "" || normalized === "DX" || isValidWalSquare(normalized)
	);
}

type RowStatus = "fixable" | "ok" | "structural";

interface SeasonWindow {
	end: number;
	start: number;
}

interface RowStatusResult {
	reason: null | SkipReason;
	status: RowStatus;
}

function contactSquareKeyPart(value: string) {
	const normalized = normalizeWalSquare(value);
	return normalized === "DX" ? "" : normalized;
}

/** Mirrors the server exact-duplicate key (qsos.ts getExactDuplicateKey). */
function exactDuplicateKey(row: ReviewRow) {
	return [
		normalizeCallsign(row.draft.contactCallsign),
		row.draft.band,
		row.draft.mode,
		row.draft.qsoAt,
		normalizeWalSquare(row.operatorSquare),
		contactSquareKeyPart(row.contactSquare),
	].join(":");
}

/** Mirrors the alpha game-duplicate key (one per call/band/mode/squares/day). */
function gameDuplicateKey(row: ReviewRow) {
	const day = row.draft.qsoAt
		? formatInVilnius(row.draft.qsoAt, "yyyy-MM-dd")
		: "";
	return [
		normalizeCallsign(row.draft.contactCallsign),
		row.draft.band,
		row.draft.mode,
		normalizeWalSquare(row.operatorSquare),
		contactSquareKeyPart(row.contactSquare),
		day,
	].join(":");
}

/**
 * Per-row checks that don't depend on other rows. Returns a terminal status, or
 * null when the row is otherwise importable (a duplicate candidate).
 */
function getBaseStatus(
	row: ReviewRow,
	userCallsign: string,
	season: null | SeasonWindow
): null | RowStatusResult {
	const structural = row.draft.issues[0];
	if (structural) {
		return { reason: structural, status: "structural" };
	}
	// Time and callsign can't be fixed by editing squares, so these problems are
	// surfaced like structural issues and excluded from import.
	if (season && row.draft.qsoAt) {
		const at = Date.parse(row.draft.qsoAt);
		if (!Number.isNaN(at) && (at < season.start || at > season.end)) {
			return { reason: "outsideSeason", status: "structural" };
		}
	}
	if (userCallsign && row.draft.operatorCallsign) {
		const operatorCallsign = normalizeCallsign(row.draft.operatorCallsign);
		if (operatorCallsign !== userCallsign) {
			return { reason: "callsignMismatch", status: "structural" };
		}
	}
	const contactCallsign = normalizeCallsign(row.draft.contactCallsign);
	if (!isValidCallsign(contactCallsign)) {
		return { reason: "invalidCallsign", status: "structural" };
	}
	if (userCallsign && contactCallsign === userCallsign) {
		return { reason: "selfContact", status: "structural" };
	}
	if (BLOCKED_CALLSIGN_REGEX.test(contactCallsign)) {
		return { reason: "blockedCallsign", status: "structural" };
	}
	if (!isValidWalSquare(row.operatorSquare)) {
		return { reason: "invalidSquare", status: "fixable" };
	}
	if (!isContactSquareValid(row.contactSquare)) {
		return { reason: "invalidSquare", status: "fixable" };
	}
	return null;
}

/**
 * Two-pass status: per-row base checks, then within-log duplicate detection
 * across the importable rows. Editing a square changes the key, so duplicates
 * are "fixable" and recompute as the user edits. Cross-log duplicates (against
 * the database) can only be caught at commit.
 */
function computeStatuses(
	rows: ReviewRow[],
	userCallsign: string,
	season: null | SeasonWindow
): RowStatusResult[] {
	const seenExact = new Set<string>();
	const seenGame = new Set<string>();
	return rows.map((row) => {
		const base = getBaseStatus(row, userCallsign, season);
		if (base) {
			return base;
		}
		const exactKey = exactDuplicateKey(row);
		if (seenExact.has(exactKey)) {
			return { reason: "exactDuplicate", status: "fixable" };
		}
		const gameKey = gameDuplicateKey(row);
		if (seenGame.has(gameKey)) {
			return { reason: "gameDuplicate", status: "fixable" };
		}
		seenExact.add(exactKey);
		seenGame.add(gameKey);
		return { reason: null, status: "ok" };
	});
}

export function LogReviewDialog({
	content,
	onCommitted,
	onOpenChange,
	open,
	parseResult,
	seasonEnd,
	seasonStart,
	userCallsign,
}: {
	content: string;
	onCommitted: (result: ImportResult) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	parseResult: ParseResult;
	seasonEnd: Date | null | string | undefined;
	seasonStart: Date | null | string | undefined;
	userCallsign: string;
}) {
	const queryClient = useQueryClient();
	const posthog = usePostHog();
	const [page, setPage] = useState(0);
	const [rows, setRows] = useState<ReviewRow[]>(() =>
		parseResult.qsos.map((draft) => ({
			draft,
			operatorSquare: draft.operatorSquare,
			contactSquare: draft.contactSquare,
		}))
	);

	const season = useMemo<null | SeasonWindow>(() => {
		if (!(seasonStart && seasonEnd)) {
			return null;
		}
		const start = new Date(seasonStart).getTime();
		const end = new Date(seasonEnd).getTime();
		return Number.isNaN(start) || Number.isNaN(end) ? null : { end, start };
	}, [seasonStart, seasonEnd]);

	const statuses = useMemo(
		() => computeStatuses(rows, userCallsign, season),
		[rows, userCallsign, season]
	);
	const importableCount = statuses.filter((s) => s.status === "ok").length;
	const invalidCount = rows.length - importableCount;
	const hasCallsignMismatch = Boolean(
		parseResult.stationCallsign &&
			userCallsign &&
			normalizeCallsign(parseResult.stationCallsign) !== userCallsign
	);

	const commitMutation = useMutation(
		orpc.qsos.commitUpload.mutationOptions({
			onSuccess: (result) => {
				posthog.capture("log_committed", {
					format: parseResult.format,
					accepted: result.accepted,
					skipped: result.skipped,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.list.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.stats.queryOptions().queryKey,
				});
				onCommitted(result);
			},
			onError: (error) => {
				toast.error(error.message);
			},
		})
	);

	function updateSquare(
		index: number,
		field: "contactSquare" | "operatorSquare",
		value: string
	) {
		const next = value.toUpperCase();
		setRows((current) =>
			current.map((row, i) => (i === index ? { ...row, [field]: next } : row))
		);
	}

	function handleSubmit() {
		commitMutation.mutate({
			content,
			format: parseResult.format,
			qsos: rows.map((row) => ({
				line: row.draft.index,
				raw: row.draft.raw,
				operatorCallsign: row.draft.operatorCallsign,
				contactCallsign: row.draft.contactCallsign,
				band: row.draft.band ?? "",
				mode: row.draft.mode ?? "",
				qsoAt: row.draft.qsoAt,
				operatorSquare: row.operatorSquare,
				contactSquare: row.contactSquare || null,
			})),
		});
	}

	const pageCount = Math.ceil(rows.length / PAGE_SIZE);
	const pageStart = page * PAGE_SIZE;
	const pageRows = rows
		.map((row, index) => ({ index, row, status: statuses[index] }))
		.slice(pageStart, pageStart + PAGE_SIZE);

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
				<DialogHeader className="shrink-0 border-border border-b px-6 py-4">
					<DialogTitle>
						Peržiūrėkite QSO ({parseResult.format.toUpperCase()})
					</DialogTitle>
					<DialogDescription>
						Redaguokite kvadratus prieš įkeldami. Pažymėtos eilutės su klaidomis
						nebus įkeltos.
						<br />
						Jeigu eilutė pažymėta <StatusBadge reason={null} /> tai dar
						nereiškia, kad ji bus patvirtinta – pasikartojantys QSO žurnale bus
						atmesti.
					</DialogDescription>
				</DialogHeader>

				{hasCallsignMismatch ? (
					<div className="shrink-0 border-border border-b bg-amber-500/10 px-6 py-3 text-amber-700 text-sm dark:text-amber-400">
						Žurnalo šaukinys ({parseResult.stationCallsign}) nesutampa su jūsų
						paskyros šaukiniu ({userCallsign}). Bus įkelti tik tie QSO, kurių
						operatoriaus šaukinys sutampa su jūsų.
					</div>
				) : null}

				<div className="flex-1 overflow-auto px-6 py-4">
					<div className="overflow-x-auto rounded-2xl border border-border">
						<Table className="text-sm">
							<TableHeader>
								<TableRow className="bg-muted/40 hover:bg-muted/40">
									<TableHead className="px-3">Laikas</TableHead>
									<TableHead className="px-3">Operatorius</TableHead>
									<TableHead className="px-3">Korespondentas</TableHead>
									<TableHead className="px-3">Diapazonas</TableHead>
									<TableHead className="px-3">Mano kvadratas</TableHead>
									<TableHead className="px-3">
										Korespondento kvadratas
									</TableHead>
									<TableHead className="px-3 text-right">Statusas</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{pageRows.map(({ index, row, status }) => {
									const isStructural = status?.status === "structural";
									const isFixable = status?.status === "fixable";
									return (
										<TableRow
											className={cn(
												isStructural && "bg-destructive/5",
												isFixable && "bg-amber-500/5"
											)}
											key={row.draft.index}
										>
											<TableCell className="whitespace-nowrap px-3 tabular-nums">
												{formatTime(row.draft.qsoAt)}
											</TableCell>
											<TableCell className="px-3 font-medium">
												{row.draft.operatorCallsign || "—"}
											</TableCell>
											<TableCell className="px-3 font-bold">
												{row.draft.contactCallsign || "—"}
											</TableCell>
											<TableCell className="px-3 text-muted-foreground">
												{row.draft.band ?? "—"}
												{row.draft.mode ? ` / ${row.draft.mode}` : ""}
											</TableCell>
											<TableCell className="px-3">
												<Input
													aria-invalid={
														isFixable && !isValidWalSquare(row.operatorSquare)
													}
													autoCapitalize="characters"
													className="h-8 w-20"
													disabled={isStructural || commitMutation.isPending}
													maxLength={3}
													onChange={(event) =>
														updateSquare(
															index,
															"operatorSquare",
															event.target.value
														)
													}
													placeholder="A05"
													value={row.operatorSquare}
												/>
											</TableCell>
											<TableCell className="px-3">
												<Input
													aria-invalid={
														isFixable &&
														!isContactSquareValid(row.contactSquare)
													}
													autoCapitalize="characters"
													className="h-8 w-20"
													disabled={isStructural || commitMutation.isPending}
													maxLength={3}
													onChange={(event) =>
														updateSquare(
															index,
															"contactSquare",
															event.target.value
														)
													}
													placeholder="B12 / DX"
													value={row.contactSquare}
												/>
											</TableCell>
											<TableCell className="px-3 text-right">
												<StatusBadge reason={status?.reason ?? null} />
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>

					{pageCount > 1 ? (
						<div className="mt-3 flex items-center justify-between gap-4">
							<p className="text-muted-foreground text-xs">
								{rows.length} QSO &middot; puslapis {page + 1} iš {pageCount}
							</p>
							<div className="flex gap-2">
								<Button
									disabled={page <= 0}
									onClick={() => setPage((p) => p - 1)}
									size="icon-sm"
									variant="outline"
								>
									<ChevronLeft />
								</Button>
								<Button
									disabled={page >= pageCount - 1}
									onClick={() => setPage((p) => p + 1)}
									size="icon-sm"
									variant="outline"
								>
									<ChevronRight />
								</Button>
							</div>
						</div>
					) : null}
				</div>

				<div className="flex shrink-0 items-center justify-between gap-4 border-border border-t px-6 py-4">
					<p className="text-muted-foreground text-sm">
						Įkelsime{" "}
						<span className="font-bold text-accent">{importableCount}</span> QSO
						{invalidCount > 0 ? ` · ${invalidCount} su klaidomis` : ""}
					</p>
					<Button
						disabled={importableCount === 0 || commitMutation.isPending}
						onClick={handleSubmit}
					>
						{commitMutation.isPending ? <Spinner /> : <Upload />}
						Įkelti
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function StatusBadge({ reason }: { reason: null | SkipReason }) {
	if (!reason) {
		return (
			<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-400">
				Gerai
			</span>
		);
	}
	return (
		<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
			{SKIP_REASON_LABELS[reason]}
		</span>
	);
}
