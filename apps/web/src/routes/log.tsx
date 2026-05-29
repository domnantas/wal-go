import type {
	ImportError,
	ImportSuccess,
	SkipReason,
} from "@WAL-GO/api/routers/qsos";
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
import { cn } from "@WAL-GO/ui/lib/utils";
import { sessionOptions } from "@better-auth-ui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronDown,
	ChevronUp,
	MapPinned,
	Radio,
	Star,
	Trash2,
	Upload,
	Users,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddQsoDialog } from "@/domains/log/add-qso-dialog";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
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
	contactCallsign: string;
	contactSquare: null | string;
	id: number;
	mode: string;
	operatorSquare: string;
	qsoAt: Date | string;
}

const dateTimeFormatter = new Intl.DateTimeFormat("lt-LT", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

function RouteComponent() {
	const qsos = useQuery(orpc.qsos.list.queryOptions());
	const stats = useQuery(orpc.qsos.stats.queryOptions());
	const currentSeason = useQuery(orpc.seasons.current.queryOptions());
	const membership = useQuery(orpc.seasons.myMembership.queryOptions());
	const data = qsos.data ?? [];
	const statValues = stats.data ?? {
		totalQsos: 0,
		uniqueSquares: 0,
		points: 0,
		uniqueContactCallsigns: 0,
	};

	const canAddQso =
		!(currentSeason.isPending || membership.isPending) &&
		!!currentSeason.data &&
		!!membership.data;

	return (
		<main className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<CabrilloDropzone />

			{currentSeason.data && !membership.isPending && !membership.data ? (
				<div className="flex items-center justify-between gap-4 rounded-4xl border border-border bg-card px-5 py-4">
					<p className="text-muted-foreground text-sm">
						Prisijunkite prie sezono, kad galėtumėte pridėti QSO.
					</p>
					<Button render={<Link to="/join-season" />} size="sm">
						Prisijungti
					</Button>
				</div>
			) : null}

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<StatCard
					icon={<Radio className="size-5" />}
					label="Iš viso QSO"
					value={statValues.totalQsos}
				/>
				<StatCard
					icon={<MapPinned className="size-5" />}
					label="Unikalūs kvadratai"
					value={statValues.uniqueSquares}
				/>
				<StatCard
					icon={<Star className="size-5" />}
					label="Surinkti taškai"
					value={statValues.points}
				/>
				<StatCard
					icon={<Users className="size-5" />}
					label="Unikalūs korespondentai"
					value={statValues.uniqueContactCallsigns}
				/>
			</div>

			{qsos.isPending ? (
				<div className="flex justify-center py-10">
					<Spinner className="size-8" />
				</div>
			) : (
				<QsoLog canAddQso={canAddQso} qsos={data} />
			)}
		</main>
	);
}

function toDisplayDate(value: Date | string) {
	return dateTimeFormatter.format(new Date(value));
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
		<div className="flex flex-col gap-1.5 rounded-4xl border border-border bg-card p-5">
			<div className="flex items-center justify-between">
				<span className="font-bold font-serif text-3xl tabular-nums">
					{value}
				</span>
				<span className="text-accent">{icon}</span>
			</div>
			<span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</span>
		</div>
	);
}

interface ImportResult {
	accepted: number;
	errors: ImportError[];
	imported: ImportSuccess[];
	skipped: number;
}

type DropzoneState =
	| { status: "idle" }
	| { status: "importing" }
	| { status: "done"; result: ImportResult }
	| { status: "error"; message: string };

const SKIP_REASON_LABELS: Record<SkipReason, string> = {
	callsignMismatch: "Šaukinys nesutampa",
	exactDuplicate: "Jau užregistruotas",
	gameDuplicate: "Pakartotinis pagal žaidimo taisykles",
	invalidBand: "Neatpažintas diapazonas",
	invalidDate: "Neteisinga data",
	invalidMode: "Neatpažinta moduliacija",
	invalidSquare: "Neteisingas WAL kvadratas",
	outsideSeason: "Už sezono ribų",
	malformedLine: "Neteisingas formatas",
	invalidCallsign: "Neteisingas šaukinys",
};

function CabrilloDropzone() {
	const queryClient = useQueryClient();
	const [state, setState] = useState<DropzoneState>({ status: "idle" });
	const [isDragging, setIsDragging] = useState(false);
	const [errorsExpanded, setErrorsExpanded] = useState(false);
	const [importedExpanded, setImportedExpanded] = useState(true);

	const importMutation = useMutation(
		orpc.qsos.importCabrillo.mutationOptions({
			onSuccess: (result) => {
				setState({ status: "done", result });
				setImportedExpanded(true);
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.list.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.stats.queryOptions().queryKey,
				});
			},
			onError: (error) => {
				setState({ status: "error", message: error.message });
			},
		})
	);

	function handleFile(file: File) {
		if (file.size > 2 * 1024 * 1024) {
			setState({ status: "error", message: "Failas per didelis (maks. 2 MB)" });
			return;
		}
		setState({ status: "importing" });
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result;
			if (typeof content === "string") {
				importMutation.mutate({ content });
			}
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

	if (state.status === "importing") {
		return (
			<div className="flex w-full flex-col items-center gap-2 rounded-4xl border-2 border-border border-dashed bg-card px-6 py-10 text-center">
				<Spinner className="size-8" />
				<p className="font-medium text-sm">Įkeliama...</p>
			</div>
		);
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
							<div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border">
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
							<div className="mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border">
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
		// biome-ignore lint/a11y/noStaticElementInteractions: HTML5 drag-and-drop zone; keyboard/click handled by inner label
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: HTML5 drag-and-drop zone; keyboard/click handled by inner label
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
				htmlFor="cabrillo-file-input"
			>
				<input
					accept=".log,.cbr,.cabrillo"
					className="sr-only"
					id="cabrillo-file-input"
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
				<p className="font-medium text-sm">Įkelti Cabrillo failą</p>
				<p className="text-muted-foreground text-xs">
					Vilkite failą arba paspauskite (.log, .cbr, .cabrillo)
				</p>
			</label>
		</div>
	);
}

function getQsoColumns({
	deletingQsoId,
	onDelete,
}: {
	deletingQsoId: null | number;
	onDelete: (id: number) => void;
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
			id: "actions",
			header: "",
			enableSorting: false,
			enableColumnFilter: false,
			cell: ({ row }) => {
				const isDeleting = deletingQsoId === row.original.id;
				return (
					<div className="text-right">
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

function QsoLog({ canAddQso, qsos }: { canAddQso: boolean; qsos: Qso[] }) {
	const queryClient = useQueryClient();
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
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

	const bandOptions = useMemo(() => {
		const unique = Array.from(new Set(qsos.map((q) => q.band)));
		return unique.sort(
			(a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10)
		);
	}, [qsos]);

	const columns = useMemo(
		() =>
			getQsoColumns({
				deletingQsoId,
				onDelete: (id) => deleteQso.mutate({ id }),
			}),
		[deleteQso, deletingQsoId]
	);

	const table = useReactTable({
		data: qsos,
		columns,
		state: { columnFilters },
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const activeBand =
		(table.getColumn("band")?.getFilterValue() as string | undefined) ?? "all";

	function setBand(band: string) {
		table.getColumn("band")?.setFilterValue(band === "all" ? undefined : band);
	}

	if (qsos.length === 0) {
		return (
			<div className="flex flex-col items-center gap-2 rounded-4xl border border-border bg-card px-6 py-16 text-center">
				<Radio className="size-10 text-muted-foreground" />
				<h3 className="font-medium text-base">Dar nėra QSO</h3>
				<p className="text-muted-foreground text-sm">
					Pridėkite pirmą ryšį naudodami formą
				</p>
				<AddQsoDialog disabled={!canAddQso} />
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-2">
					<BandChip
						active={activeBand === "all"}
						label="Visi diapazonai"
						onClick={() => setBand("all")}
					/>
					{bandOptions.map((band) => (
						<BandChip
							active={activeBand === band}
							key={band}
							label={band}
							onClick={() => setBand(band)}
						/>
					))}
				</div>
				<AddQsoDialog disabled={!canAddQso} />
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
									<TableHead className="px-4" key={header.id}>
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
									<TableCell className="px-4" key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</>
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
