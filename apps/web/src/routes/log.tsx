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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { MapPinned, Radio, Star, Trash2, Upload, Waves } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";

import { AddQsoDialog } from "@/domains/log/add-qso-dialog";
import { orpc } from "@/utils/orpc";

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
	const data = qsos.data ?? [];
	const totalQsos = data.length;
	const uniqueSquares = countUniqueSquares(data);
	const uniqueBands = new Set(data.map((q) => q.band)).size;
	const points = countCreditedSquares(data);

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

			{qsos.isPending ? (
				<div className="flex justify-center py-10">
					<Spinner className="size-8" />
				</div>
			) : (
				<QsoLog qsos={data} />
			)}
		</main>
	);
}

function countCreditedSquares(qsos: Qso[]) {
	return qsos.reduce(
		(total, qso) => total + 1 + (qso.contactSquare ? 1 : 0),
		0
	);
}

function countUniqueSquares(qsos: Qso[]) {
	const squares = new Set<string>();
	for (const qso of qsos) {
		squares.add(qso.operatorSquare);
		if (qso.contactSquare) {
			squares.add(qso.contactSquare);
		}
	}
	return squares.size;
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

function AdifDropzone() {
	return (
		<button
			className="group flex w-full flex-col items-center gap-2 rounded-4xl border-2 border-border border-dashed bg-card px-6 py-10 text-center transition-colors hover:border-accent hover:bg-accent/5"
			disabled
			type="button"
		>
			<Upload className="size-8 text-muted-foreground group-hover:text-accent" />
			<p className="font-medium text-sm">ADIF importas bus pridėtas vėliau</p>
			<p className="text-muted-foreground text-xs">
				Šiuo metu QSO pridėkite rankiniu būdu žemiau
			</p>
		</button>
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

function QsoLog({ qsos }: { qsos: Qso[] }) {
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
				<AddQsoDialog />
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
				<AddQsoDialog />
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
