import {
	Dialog,
	DialogContent,
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
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

const SKIP_REASON_LABELS: Record<string, string> = {
	callsignMismatch: "Šaukinys nesutampa",
	exactDuplicate: "Tikslus dublikatas",
	gameDuplicate: "Žaidimo dublikatas",
	invalidBand: "Neteisingas diapazonas",
	invalidCallsign: "Neteisingas šaukinys",
	invalidDate: "Neteisinga data",
	invalidMode: "Neteisinga moduliacija",
	invalidSquare: "Neteisingas kvadratas",
	malformedLine: "Klaidinga eilutė",
	outsideSeason: "Ne sezono laikotarpis",
	selfContact: "QSO su savimi",
};

function formatDateTime(date: Date) {
	return format(date, "yyyy-MM-dd HH:mm");
}

export function UploadsTab() {
	const uploads = useQuery(orpc.admin.uploads.list.queryOptions());
	const [selectedId, setSelectedId] = useState<null | number>(null);

	if (uploads.isPending) {
		return (
			<div className="flex justify-center py-10">
				<Spinner className="size-8" />
			</div>
		);
	}

	const rows = uploads.data ?? [];

	return (
		<>
			<div className="overflow-x-auto rounded-4xl border border-border bg-card">
				<Table className="text-sm">
					<TableHeader>
						<TableRow className="bg-muted/40 hover:bg-muted/40">
							<TableHead className="px-4">Data ir laikas</TableHead>
							<TableHead className="px-4">Šaukinys</TableHead>
							<TableHead className="px-4">Sezonas</TableHead>
							<TableHead className="px-4 text-right">Priimta</TableHead>
							<TableHead className="px-4 text-right">Praleista</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell
									className="px-4 py-10 text-center text-muted-foreground"
									colSpan={5}
								>
									Nėra įkėlimų
								</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
								<TableRow
									className="cursor-pointer"
									key={row.id}
									onClick={() => setSelectedId(row.id)}
								>
									<TableCell className="px-4 tabular-nums">
										{formatDateTime(new Date(row.uploadedAt))}
									</TableCell>
									<TableCell className="px-4 font-bold">
										{row.callsign}
									</TableCell>
									<TableCell className="px-4 text-muted-foreground">
										{row.seasonName}
									</TableCell>
									<TableCell className="px-4 text-right tabular-nums">
										<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-400">
											+{row.accepted}
										</span>
									</TableCell>
									<TableCell className="px-4 text-right tabular-nums">
										<span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs">
											{row.skipped}
										</span>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<Dialog
				onOpenChange={(open) => {
					if (!open) {
						setSelectedId(null);
					}
				}}
				open={selectedId !== null}
			>
				{selectedId !== null && <UploadDetail id={selectedId} />}
			</Dialog>
		</>
	);
}

function UploadDetail({ id }: { id: number }) {
	const upload = useQuery(
		orpc.admin.uploads.get.queryOptions({ input: { id } })
	);

	return (
		<DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
			<DialogHeader className="shrink-0 border-border border-b px-6 py-4">
				<DialogTitle>
					{upload.data
						? `${upload.data.callsign} — ${formatDateTime(new Date(upload.data.uploadedAt))}`
						: "Įkėlimo detalės"}
				</DialogTitle>
			</DialogHeader>

			{upload.isPending && (
				<div className="flex justify-center py-10">
					<Spinner className="size-8" />
				</div>
			)}
			{upload.data && <UploadDetailBody data={upload.data} />}
		</DialogContent>
	);
}

interface UploadData {
	cabrilloContent: string;
	importedLines: { content: string; line: number }[];
	skippedLines: { content: string; line: number; reason: string }[];
}

function UploadDetailBody({ data }: { data: UploadData }) {
	return (
		<div className="flex flex-col gap-6 overflow-y-auto p-6">
			<Section title={`Priimti QSO (${data.importedLines.length})`}>
				{data.importedLines.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nėra priimtų QSO</p>
				) : (
					<LineTable
						rows={data.importedLines.map((r) => ({
							line: r.line,
							content: r.content,
							badge: (
								<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-400">
									priimta
								</span>
							),
						}))}
					/>
				)}
			</Section>

			<Section title={`Praleisti QSO (${data.skippedLines.length})`}>
				{data.skippedLines.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nėra praleistų QSO</p>
				) : (
					<LineTable
						rows={data.skippedLines.map((r) => ({
							line: r.line,
							content: r.content,
							badge: (
								<span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground text-xs">
									{SKIP_REASON_LABELS[r.reason] ?? r.reason}
								</span>
							),
						}))}
					/>
				)}
			</Section>

			<Section title="Cabrillo turinys">
				<pre className="overflow-x-auto whitespace-pre rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">
					{data.cabrilloContent}
				</pre>
			</Section>
		</div>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="font-semibold text-sm">{title}</h3>
			{children}
		</div>
	);
}

function LineTable({
	rows,
}: {
	rows: { badge: React.ReactNode; content: string; line: number }[];
}) {
	return (
		<div className="overflow-x-auto rounded-xl border border-border">
			<Table className="text-xs">
				<TableHeader>
					<TableRow className="bg-muted/40 hover:bg-muted/40">
						<TableHead className="w-12 px-3 text-right">Eilutė</TableHead>
						<TableHead className="px-3">Turinys</TableHead>
						<TableHead className="px-3 text-right">Statusas</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.line}>
							<TableCell className="px-3 text-right text-muted-foreground tabular-nums">
								{row.line}
							</TableCell>
							<TableCell className="px-3 font-mono">{row.content}</TableCell>
							<TableCell className="px-3 text-right">{row.badge}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
