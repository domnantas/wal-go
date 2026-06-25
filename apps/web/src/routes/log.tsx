import type { QsoBand } from "@WAL-GO/api/routers/qsos";
import { normalizeCallsign } from "@WAL-GO/callsign";
import { type ParseResult, parseLog } from "@WAL-GO/log-parse";
import { Button } from "@WAL-GO/ui/components/button";
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
import { cn } from "@WAL-GO/ui/lib/utils";
import { sessionOptions } from "@better-auth-ui/react";
import { usePostHog } from "@posthog/react";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	MapPinned,
	Radio,
	Star,
	Trash2,
	Upload,
	Users,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AddQsoDialog } from "@/domains/log/add-qso-dialog";
import { EditQsoDialog } from "@/domains/log/edit-qso-dialog";
import {
	type ImportResult,
	LogReviewDialog,
	SKIP_REASON_LABELS,
} from "@/domains/log/log-review-dialog";
import { SeasonCountdownCard } from "@/domains/season/season-countdown-card";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { formatInVilnius } from "@/lib/date";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/log")({
	async beforeLoad({ context: { queryClient } }) {
		const session = await getUser();
		queryClient.setQueryData(sessionOptions(authClient).queryKey, session);
		if (!session) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
		return { session };
	},
	component: RouteComponent,
});

interface Qso {
	band: string;
	confirmed: boolean;
	contactCallsign: string;
	contactSquare: null | string;
	id: number;
	mode: string;
	operatorSquare: string;
	qsoAt: Date | string;
	score: number;
}

interface SeasonListItem {
	endsAt: Date;
	id: number;
	name: string;
	startsAt: Date;
	status: "upcoming" | "active" | "ended";
}

function sortViewableSeasons(a: SeasonListItem, b: SeasonListItem) {
	if (a.status === "active") {
		return -1;
	}
	if (b.status === "active") {
		return 1;
	}
	return b.startsAt.getTime() - a.startsAt.getTime();
}

function selectSeasonContext(
	currentSeason: { id: number; name: string } | null | undefined,
	seasons: SeasonListItem[] | undefined,
	participated: SeasonListItem[] | undefined,
	selectedSeasonId: number | null
) {
	const activeSeason =
		currentSeason ??
		seasons?.find((season) => season.status === "active") ??
		null;
	const upcomingSeason =
		seasons?.find((season) => season.status === "upcoming") ?? null;
	const viewableSeasons = [...(participated ?? [])]
		.filter((season) => season.status !== "upcoming")
		.sort(sortViewableSeasons);
	const displaySeason =
		viewableSeasons.find((season) => season.id === selectedSeasonId) ??
		viewableSeasons[0] ??
		null;
	return {
		activeSeason,
		upcomingSeason,
		viewableSeasons,
		displaySeason,
		displaySeasonId: displaySeason?.id,
		showSeasonSelector: viewableSeasons.length > 1,
	};
}

function SeasonSelect({
	displaySeason,
	onChange,
	seasons,
}: {
	displaySeason: SeasonListItem;
	onChange: (seasonId: number) => void;
	seasons: SeasonListItem[];
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<Select
				onValueChange={(value) => onChange(Number(value))}
				value={String(displaySeason.id)}
			>
				<SelectTrigger className="w-56">
					<SelectValue>{() => displaySeason.name}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{seasons.map((season) => (
						<SelectItem key={season.id} value={String(season.id)}>
							{season.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const [page, setPage] = useState(0);
	const [band, setBand] = useState<QsoBand | undefined>(undefined);
	const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
	const logRef = useRef<HTMLDivElement>(null);

	function handleBandChange(newBand: QsoBand | undefined) {
		setBand(newBand);
		setPage(0);
	}

	function handleSeasonChange(seasonId: number) {
		setSelectedSeasonId(seasonId);
		setBand(undefined);
		setPage(0);
	}

	const { data: currentSeason, isPending: isCurrentSeasonPending } = useQuery(
		orpc.seasons.current.queryOptions()
	);
	const { data: membership, isPending: isMembershipPending } = useQuery(
		orpc.seasons.myMembership.queryOptions()
	);
	const { data: seasons, isPending: isSeasonsPending } = useQuery(
		orpc.seasons.list.queryOptions()
	);
	const { data: participated, isPending: isParticipatedPending } = useQuery(
		orpc.seasons.participated.queryOptions()
	);

	const {
		activeSeason,
		upcomingSeason,
		viewableSeasons,
		displaySeason,
		displaySeasonId,
		showSeasonSelector,
	} = selectSeasonContext(
		currentSeason,
		seasons,
		participated,
		selectedSeasonId
	);

	const { data: qsoPage, isPending: isQsosPending } = useQuery(
		orpc.qsos.list.queryOptions({
			input: { page, band, seasonId: displaySeasonId },
			placeholderData: keepPreviousData,
		})
	);
	const { data: stats, isPending: isStatsPending } = useQuery(
		orpc.qsos.stats.queryOptions({ input: { seasonId: displaySeasonId } })
	);
	const items = qsoPage?.items ?? [];
	const total = qsoPage?.total ?? 0;
	const bands = qsoPage?.bands ?? [];
	const statValues = stats ?? {
		totalQsos: 0,
		uniqueSquares: 0,
		points: 0,
		uniqueContactCallsigns: 0,
	};

	const isInitialLoading =
		isCurrentSeasonPending ||
		isMembershipPending ||
		isSeasonsPending ||
		isParticipatedPending ||
		isStatsPending ||
		isQsosPending;
	const canAddQso =
		!!activeSeason && !!membership && displaySeason?.status === "active";
	const showLog = !!displaySeason;

	const handleSeasonTimingComplete = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.current.queryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.list.queryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.myMembership.queryOptions().queryKey,
		});
	}, [queryClient]);

	if (isInitialLoading) {
		return (
			<main className="container mx-auto flex max-w-5xl justify-center px-4 py-16">
				<Spinner className="size-8" />
			</main>
		);
	}

	return (
		<main className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
						{displaySeason ? `Žurnalas · ${displaySeason.name}` : "Žurnalas"}
					</p>
					<h1 className="mt-2 font-bold font-serif text-4xl tracking-tight">
						Stoties žurnalas
					</h1>
				</div>
				{showSeasonSelector && displaySeason ? (
					<SeasonSelect
						displaySeason={displaySeason}
						onChange={handleSeasonChange}
						seasons={viewableSeasons}
					/>
				) : null}
			</div>

			{!activeSeason && upcomingSeason ? (
				<SeasonCountdownCard
					onComplete={handleSeasonTimingComplete}
					season={upcomingSeason}
				/>
			) : null}

			{activeSeason && !isMembershipPending && !membership ? (
				<div className="flex items-center justify-between gap-4 rounded-4xl border border-border bg-card px-5 py-4">
					<p className="text-muted-foreground text-sm">
						Prisijunkite prie sezono, kad galėtumėte pridėti QSO.
					</p>
					<Button
						nativeButton={false}
						render={<Link to="/join-season" />}
						size="sm"
					>
						Prisijungti
					</Button>
				</div>
			) : null}

			{showLog ? (
				<>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<StatCard
							icon={<Radio className="size-4" />}
							label="Iš viso QSO"
							value={statValues.totalQsos}
						/>
						<StatCard
							icon={<MapPinned className="size-4" />}
							label="Aplankyti kvadratai"
							value={statValues.uniqueSquares}
						/>
						<StatCard
							icon={<Star className="size-4" />}
							label="Surinkti taškai"
							value={statValues.points}
						/>
						<StatCard
							icon={<Users className="size-4" />}
							label="Unikalūs korespondentai"
							value={statValues.uniqueContactCallsigns}
						/>
					</div>

					{canAddQso ? <LogDropzone /> : null}

					<div ref={logRef}>
						<QsoLog
							band={band}
							bands={bands}
							canAddQso={canAddQso}
							items={items}
							onBandChange={handleBandChange}
							onPageChange={setPage}
							page={page}
							requiresContactSquare={currentSeason?.scoringRuleSet === "beta"}
							total={total}
						/>
					</div>
				</>
			) : null}
		</main>
	);
}

function toDisplayDate(value: Date | string) {
	return formatInVilnius(value, "yyyy-MM-dd HH:mm");
}

function StatCard({
	icon,
	label,
	value,
}: {
	icon: ReactNode;
	label: string;
	value: number;
}) {
	return (
		<div className="rounded-4xl border border-border bg-card p-5">
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
					{label}
				</span>
				<span className="text-muted-foreground/60">{icon}</span>
			</div>
			<span className="mt-2 block font-bold font-serif text-4xl tabular-nums">
				{value}
			</span>
		</div>
	);
}

type DropzoneState =
	| { status: "idle" }
	| { status: "review"; parseResult: ParseResult; content: string }
	| { status: "done"; result: ImportResult }
	| { status: "error"; message: string };

function LogDropzone() {
	const [state, setState] = useState<DropzoneState>({ status: "idle" });
	const [isDragging, setIsDragging] = useState(false);
	const [errorsExpanded, setErrorsExpanded] = useState(false);
	const [importedExpanded, setImportedExpanded] = useState(true);
	const { data: session } = useQuery(sessionOptions(authClient));
	const { data: currentSeason } = useQuery(orpc.seasons.current.queryOptions());
	const userCallsign = session?.user.name
		? normalizeCallsign(session.user.name)
		: "";

	function handleFile(file: File) {
		if (file.size > 2 * 1024 * 1024) {
			setState({ status: "error", message: "Failas per didelis (maks. 2 MB)" });
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result;
			if (typeof content !== "string") {
				return;
			}
			const parseResult = parseLog(content);
			if (parseResult.qsos.length === 0) {
				setState({ status: "error", message: "Faile nerasta QSO įrašų" });
				return;
			}
			setState({ status: "review", parseResult, content });
		};
		reader.readAsText(file);
	}

	function handleDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) {
			handleFile(file);
		}
	}

	function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		setIsDragging(true);
	}

	function handleDragLeave() {
		setIsDragging(false);
	}

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			handleFile(file);
		}
		e.target.value = "";
	}

	if (state.status === "done") {
		const { result } = state;
		return (
			<div className="flex w-full flex-col gap-3 rounded-4xl border border-border bg-card px-6 py-5">
				<div className="flex items-center justify-between gap-4">
					<div className="flex flex-wrap gap-4">
						<span className="font-medium text-foreground text-sm">
							Įkelta:{" "}
							<span className="font-bold text-accent">{result.accepted}</span>{" "}
							QSO
						</span>
						{result.skipped > 0 && (
							<span className="text-muted-foreground text-sm">
								Praleista: {result.skipped}
							</span>
						)}
					</div>
					<Button
						onClick={() => {
							setState({ status: "idle" });
							setErrorsExpanded(false);
							setImportedExpanded(true);
						}}
						size="sm"
						variant="ghost"
					>
						Įkelti dar kartą
					</Button>
				</div>
				{result.imported.length > 0 && (
					<div>
						<button
							className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
							onClick={() => setImportedExpanded((value) => !value)}
							type="button"
						>
							{importedExpanded ? (
								<ChevronUp className="size-3.5" />
							) : (
								<ChevronDown className="size-3.5" />
							)}
							Sėkmingai įkelti QSO
						</button>
						{importedExpanded && (
							<div className="mt-2 max-h-72 overflow-auto rounded-2xl border border-border">
								<table className="w-full text-xs">
									<thead className="bg-muted/40">
										<tr>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Eilutė
											</th>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Data
											</th>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Šaukinys
											</th>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Diapazonas
											</th>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Kvadratai
											</th>
										</tr>
									</thead>
									<tbody>
										{result.imported.map((importedQso) => (
											<tr
												className="border-border border-t"
												key={importedQso.qso.id}
											>
												<td className="px-3 py-1.5 text-muted-foreground tabular-nums">
													{importedQso.line}
												</td>
												<td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground tabular-nums">
													{toDisplayDate(importedQso.qso.qsoAt)}
												</td>
												<td className="px-3 py-1.5 font-bold text-foreground">
													{importedQso.qso.contactCallsign}
												</td>
												<td className="px-3 py-1.5 text-muted-foreground">
													{importedQso.qso.band} / {importedQso.qso.mode}
												</td>
												<td className="px-3 py-1.5 text-muted-foreground">
													<span className="font-mono">
														{importedQso.qso.operatorSquare}
													</span>
													{importedQso.qso.contactSquare ? (
														<span className="font-mono">
															{" "}
															- {importedQso.qso.contactSquare}
														</span>
													) : null}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}
				{result.errors.length > 0 && (
					<div>
						<button
							className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
							onClick={() => setErrorsExpanded((value) => !value)}
							type="button"
						>
							{errorsExpanded ? (
								<ChevronUp className="size-3.5" />
							) : (
								<ChevronDown className="size-3.5" />
							)}
							Praleistos eilutės
						</button>
						{errorsExpanded && (
							<div className="mt-2 max-h-60 overflow-auto rounded-2xl border border-border">
								<table className="w-full text-xs">
									<thead className="bg-muted/40">
										<tr>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Eilutė
											</th>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Turinys
											</th>
											<th className="px-3 py-2 text-left font-medium text-muted-foreground">
												Priežastis
											</th>
										</tr>
									</thead>
									<tbody>
										{result.errors.map((err) => (
											<tr
												className="border-border border-t"
												key={`${err.line}-${err.reason}`}
											>
												<td className="px-3 py-1.5 text-muted-foreground tabular-nums">
													{err.line}
												</td>
												<td className="max-w-xs truncate px-3 py-1.5 font-mono text-foreground">
													{err.content}
												</td>
												<td className="px-3 py-1.5 text-muted-foreground">
													{SKIP_REASON_LABELS[err.reason]}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				)}
			</div>
		);
	}

	if (state.status === "error") {
		return (
			<div className="flex w-full flex-col gap-3 rounded-4xl border border-destructive/50 bg-card px-6 py-5">
				<div className="flex items-center justify-between gap-4">
					<p className="text-destructive text-sm">{state.message}</p>
					<Button
						onClick={() => setState({ status: "idle" })}
						size="sm"
						variant="ghost"
					>
						Bandyti dar kartą
					</Button>
				</div>
			</div>
		);
	}

	return (
		<>
			{state.status === "review" ? (
				<LogReviewDialog
					content={state.content}
					onCommitted={(result) => {
						setImportedExpanded(true);
						setState({ status: "done", result });
					}}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							setState({ status: "idle" });
						}
					}}
					open
					parseResult={state.parseResult}
					requiresContactSquare={currentSeason?.scoringRuleSet === "beta"}
					seasonEnd={currentSeason?.endsAt}
					seasonStart={currentSeason?.startsAt}
					userCallsign={userCallsign}
				/>
			) : null}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: HTML5 drag-and-drop zone; keyboard/click handled by inner label */}
			{/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: HTML5 drag-and-drop zone; keyboard/click handled by inner label */}
			<div
				className={cn(
					"group rounded-4xl border-2 border-dashed bg-card transition-colors",
					isDragging
						? "border-accent bg-accent/5"
						: "border-border hover:border-accent hover:bg-accent/5"
				)}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
			>
				<label
					className="flex w-full cursor-pointer flex-col items-center gap-2 px-6 py-10 text-center"
					htmlFor="log-file-input"
				>
					<input
						accept=".log,.cbr,.cabrillo,.adi,.adif"
						className="sr-only"
						id="log-file-input"
						onChange={handleInputChange}
						type="file"
					/>
					<Upload
						className={cn(
							"size-8 transition-colors",
							isDragging
								? "text-accent"
								: "text-muted-foreground group-hover:text-accent"
						)}
					/>
					<p className="font-medium text-sm">
						Įkelti žurnalą (Cabrillo arba ADIF)
					</p>
					<p className="text-muted-foreground text-xs">
						Vilkite failą arba paspauskite (.log, .cbr, .cabrillo, .adi, .adif)
					</p>
				</label>
			</div>
		</>
	);
}

function getQsoColumns({
	canEdit,
	deletingQsoId,
	onDelete,
	requiresContactSquare,
}: {
	canEdit: boolean;
	deletingQsoId: null | number;
	onDelete: (id: number) => void;
	requiresContactSquare: boolean;
}): ColumnDef<Qso>[] {
	return [
		{
			accessorKey: "qsoAt",
			header: "Data ir laikas",
			cell: ({ getValue }) => (
				<span className="tabular-nums">
					{toDisplayDate(getValue<Date | string>())}
				</span>
			),
		},
		{
			accessorKey: "contactCallsign",
			header: "Šaukinys",
			cell: ({ getValue }) => (
				<span className="font-bold">{getValue<string>()}</span>
			),
		},
		{
			accessorKey: "band",
			header: "Diapazonas",
			cell: ({ getValue }) => (
				<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground text-xs">
					{getValue<string>()}
				</span>
			),
		},
		{
			accessorKey: "mode",
			header: "Moduliacija",
			meta: { className: "hidden sm:table-cell" },
			cell: ({ getValue }) => (
				<span className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
					{getValue<string>()}
				</span>
			),
		},
		{
			id: "squares",
			header: "Kvadratai",
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1.5">
					<SquareBadge label={row.original.operatorSquare} />
					{row.original.contactSquare ? (
						<SquareBadge label={row.original.contactSquare} muted />
					) : null}
				</div>
			),
		},
		{
			id: "score",
			header: "Taškai",
			cell: ({ row }) => (
				<ScoreBadge
					confirmed={row.original.confirmed}
					score={row.original.score}
				/>
			),
		},
		{
			id: "actions",
			header: "",
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => {
				const isDeleting = deletingQsoId === row.original.id;
				return (
					<div className="flex justify-end gap-1">
						<EditQsoDialog
							disabled={!canEdit || deletingQsoId !== null}
							qso={row.original}
							requiresContactSquare={requiresContactSquare}
						/>
						<Button
							aria-label="Ištrinti QSO"
							disabled={deletingQsoId !== null}
							onClick={() => onDelete(row.original.id)}
							size="icon-sm"
							variant="ghost"
						>
							{isDeleting ? <Spinner /> : <Trash2 />}
						</Button>
					</div>
				);
			},
		},
	];
}

function ScoreBadge({
	confirmed,
	score,
}: {
	confirmed: boolean;
	score: number;
}) {
	return (
		<span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
			{score}
			{confirmed ? (
				<span
					className="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent"
					title="Patvirtintas ryšys – dvigubi taškai"
				>
					×2
				</span>
			) : null}
		</span>
	);
}

function SquareBadge({
	label,
	muted = false,
}: {
	label: string;
	muted?: boolean;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs",
				muted
					? "border border-border bg-card text-muted-foreground"
					: "bg-muted text-foreground"
			)}
		>
			{label}
		</span>
	);
}

const PAGE_SIZE = 20;

function QsoLog({
	band,
	bands,
	canAddQso,
	items,
	onBandChange,
	onPageChange,
	page,
	requiresContactSquare,
	total,
}: {
	band: QsoBand | undefined;
	bands: QsoBand[];
	canAddQso: boolean;
	items: Qso[];
	onBandChange: (band: QsoBand | undefined) => void;
	onPageChange: (page: number) => void;
	page: number;
	requiresContactSquare: boolean;
	total: number;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const queryClient = useQueryClient();
	const posthog = usePostHog();
	const [deletingQsoId, setDeletingQsoId] = useState<null | number>(null);
	const deleteQso = useMutation(
		orpc.qsos.delete.mutationOptions({
			onMutate: ({ id }) => {
				setDeletingQsoId(id);
			},
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.list.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.stats.queryOptions().queryKey,
				});
				posthog.capture("qso_deleted");
				toast.success("QSO ištrintas");
			},
			onError: (error) => {
				toast.error(error.message);
			},
			onSettled: () => {
				setDeletingQsoId(null);
			},
		})
	);

	const columns = useMemo(
		() =>
			getQsoColumns({
				canEdit: canAddQso,
				deletingQsoId,
				onDelete: (id) => deleteQso.mutate({ id }),
				requiresContactSquare,
			}),
		[canAddQso, deleteQso, deletingQsoId, requiresContactSquare]
	);

	const table = useReactTable({
		data: items,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const pageCount = Math.ceil(total / PAGE_SIZE);

	function navigateBand(newBand: QsoBand | undefined) {
		onBandChange(newBand);
	}

	function changePage(newPage: number) {
		onPageChange(newPage);
		containerRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}

	if (total === 0 && !band) {
		return (
			<div className="flex flex-col items-center gap-2 rounded-4xl border border-border bg-card px-6 py-16 text-center">
				<Radio className="size-10 text-muted-foreground" />
				<h3 className="font-bold font-serif text-xl">Dar nėra QSO</h3>
				<p className="text-muted-foreground text-sm">
					Pridėkite pirmą ryšį naudodami formą
				</p>
				<AddQsoDialog
					disabled={!canAddQso}
					requiresContactSquare={requiresContactSquare}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6" ref={containerRef}>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-2">
					<BandChip
						active={!band}
						label="Visi diapazonai"
						onClick={() => navigateBand(undefined)}
					/>
					{bands.map((b) => (
						<BandChip
							active={band === b}
							key={b}
							label={b}
							onClick={() => navigateBand(b)}
						/>
					))}
				</div>
				<AddQsoDialog
					disabled={!canAddQso}
					requiresContactSquare={requiresContactSquare}
				/>
			</div>

			<div className="overflow-x-auto overflow-y-hidden rounded-4xl border border-border bg-card">
				<Table className="text-sm">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								className="bg-muted/40 hover:bg-muted/40"
								key={headerGroup.id}
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										className={cn(
											"px-4",
											(header.column.columnDef.meta as { className?: string })
												?.className
										)}
										key={header.id}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										className={cn(
											"px-4",
											(cell.column.columnDef.meta as { className?: string })
												?.className
										)}
										key={cell.id}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{pageCount > 1 ? (
				<div className="flex items-center justify-between gap-4">
					<p className="text-muted-foreground text-sm">
						{total} QSO &middot; puslapis {page + 1} iš {pageCount}
					</p>
					<div className="flex gap-2">
						<Button
							disabled={page <= 0}
							onClick={() => changePage(page - 1)}
							size="icon-sm"
							variant="outline"
						>
							<ChevronLeft />
						</Button>
						<Button
							disabled={page >= pageCount - 1}
							onClick={() => changePage(page + 1)}
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

function BandChip({
	active,
	label,
	onClick,
}: {
	active: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			className={cn(
				"rounded-full border px-3.5 py-1.5 font-medium text-sm transition-colors",
				active
					? "border-accent bg-accent text-accent-foreground"
					: "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
			)}
			onClick={onClick}
			type="button"
		>
			{label}
		</button>
	);
}
