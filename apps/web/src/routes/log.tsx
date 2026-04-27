import { Button } from "@WAL-GO/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@WAL-GO/ui/components/table";
import { cn } from "@WAL-GO/ui/lib/utils";
import { createFileRoute, redirect } from "@tanstack/react-router";
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
	MapPinned,
	Plus,
	Radio,
	Star,
	Trash2,
	Upload,
	Waves,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/log")({
	beforeLoad({ context }) {
		if (!context.session) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
	},
	component: RouteComponent,
});

interface Qso {
	band: string;
	callsign: string;
	date: string;
	id: number;
	mode: string;
	square: string;
	time: string;
}

const MOCK_QSOS: Qso[] = [
	{
		id: 1,
		callsign: "LY2ABC",
		date: "2026-04-10",
		time: "14:32",
		band: "20m",
		mode: "SSB",
		square: "A05",
	},
	{
		id: 2,
		callsign: "LY3BN",
		date: "2026-04-10",
		time: "15:01",
		band: "40m",
		mode: "CW",
		square: "B12",
	},
	{
		id: 3,
		callsign: "LY4K",
		date: "2026-04-11",
		time: "09:48",
		band: "20m",
		mode: "FT8",
		square: "C03",
	},
	{
		id: 4,
		callsign: "OH2BNH",
		date: "2026-04-11",
		time: "18:22",
		band: "80m",
		mode: "SSB",
		square: "A05",
	},
	{
		id: 5,
		callsign: "ES1OA",
		date: "2026-04-12",
		time: "11:15",
		band: "20m",
		mode: "CW",
		square: "D07",
	},
];

function RouteComponent() {
	const totalQsos = MOCK_QSOS.length;
	const uniqueSquares = new Set(MOCK_QSOS.map((q) => q.square)).size;
	const uniqueBands = new Set(MOCK_QSOS.map((q) => q.band)).size;
	const points = totalQsos;

	return (
		<main className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<AdifDropzone />

			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				<StatCard
					icon={<Radio className="size-5" />}
					label="Iš viso QSO"
					value={totalQsos}
				/>
				<StatCard
					icon={<MapPinned className="size-5" />}
					label="Unikalūs kvadratai"
					value={uniqueSquares}
				/>
				<StatCard
					icon={<Star className="size-5" />}
					label="Surinkti taškai"
					value={points}
				/>
				<StatCard
					icon={<Waves className="size-5" />}
					label="Naudoti diapazonai"
					value={uniqueBands}
				/>
			</div>

			<QsoLog qsos={MOCK_QSOS} />
		</main>
	);
}

function StatCard({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
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

function AdifDropzone() {
	return (
		<button
			className="group flex w-full flex-col items-center gap-2 rounded-4xl border-2 border-border border-dashed bg-card px-6 py-10 text-center transition-colors hover:border-accent hover:bg-accent/5"
			disabled
			type="button"
		>
			<Upload className="size-8 text-muted-foreground group-hover:text-accent" />
			<p className="font-medium text-sm">
				Įkelkite .adif failą arba spustelėkite naršymui
			</p>
			<p className="text-muted-foreground text-xs">
				Palaikomi .adi, .adif, .log formatai
			</p>
		</button>
	);
}

const QSO_COLUMNS: ColumnDef<Qso>[] = [
	{
		accessorKey: "date",
		header: "Data",
		cell: ({ getValue }) => (
			<span className="tabular-nums">{getValue<string>()}</span>
		),
	},
	{
		accessorKey: "time",
		header: "Laikas",
		cell: ({ getValue }) => (
			<span className="font-mono text-muted-foreground">
				{getValue<string>()}
			</span>
		),
	},
	{
		accessorKey: "callsign",
		header: "Šaukinys",
		cell: ({ getValue }) => (
			<span className="font-bold">{getValue<string>()}</span>
		),
	},
	{
		accessorKey: "band",
		header: "Diapazonas",
		cell: ({ getValue }) => (
			<span className="inline-flex items-center rounded-full bg-olive/10 px-2.5 py-0.5 font-medium text-olive text-xs">
				{getValue<string>()}
			</span>
		),
	},
	{
		accessorKey: "mode",
		header: "Modas",
		cell: ({ getValue }) => (
			<span className="inline-flex items-center rounded-full bg-rust/10 px-2.5 py-0.5 font-medium text-rust text-xs">
				{getValue<string>()}
			</span>
		),
	},
	{
		accessorKey: "square",
		header: "Kvadratas",
		cell: ({ getValue }) => (
			<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-mono text-foreground text-xs">
				{getValue<string>()}
			</span>
		),
	},
	{
		id: "actions",
		header: "",
		enableSorting: false,
		enableColumnFilter: false,
		cell: () => (
			<div className="text-right">
				<Button
					aria-label="Ištrinti QSO"
					disabled
					size="icon-sm"
					variant="ghost"
				>
					<Trash2 />
				</Button>
			</div>
		),
	},
];

function QsoLog({ qsos }: { qsos: Qso[] }) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

	const bandOptions = useMemo(() => {
		const unique = Array.from(new Set(qsos.map((q) => q.band)));
		return unique.sort(
			(a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10)
		);
	}, [qsos]);

	const table = useReactTable({
		data: qsos,
		columns: QSO_COLUMNS,
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
					Įkelkite ADIF failą, kad pridėtumėte ryšius
				</p>
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
				<Button disabled>
					<Plus />
					Pridėti QSO
				</Button>
			</div>

			<div className="overflow-hidden rounded-4xl border border-border bg-card">
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
