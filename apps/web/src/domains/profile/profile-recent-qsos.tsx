import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@WAL-GO/ui/components/table";
import { BadgeCheck } from "lucide-react";

import { formatInVilnius } from "@/lib/date";

export interface RecentQso {
	band: string;
	confirmed: boolean;
	contactCallsign: string;
	contactSquare: string | null;
	id: number;
	mode: string;
	operatorSquare: string;
	qsoAt: Date;
	score: number;
}

export function ProfileRecentQsos({ qsos }: { qsos: RecentQso[] }) {
	return (
		<section>
			<h2 className="mb-3 font-bold font-serif text-xl">Paskutiniai ryšiai</h2>
			<div className="overflow-x-auto rounded-4xl border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Šaukinys</TableHead>
							<TableHead>Juosta</TableHead>
							<TableHead>Rūšis</TableHead>
							<TableHead>Kvadratas</TableHead>
							<TableHead>Laikas</TableHead>
							<TableHead className="w-20 text-right">Taškai</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{qsos.map((qso) => (
							<TableRow key={qso.id}>
								<TableCell className="font-mono font-semibold">
									{qso.contactCallsign}
								</TableCell>
								<TableCell className="font-mono text-muted-foreground">
									{qso.band}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{qso.mode}
								</TableCell>
								<TableCell className="font-mono text-muted-foreground">
									{qso.operatorSquare}
									{qso.contactSquare ? ` → ${qso.contactSquare}` : ""}
								</TableCell>
								<TableCell className="font-mono text-muted-foreground text-xs">
									{formatInVilnius(qso.qsoAt, "yyyy-MM-dd HH:mm")}
								</TableCell>
								<TableCell className="text-right">
									<span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
										{qso.score}
										{qso.confirmed && (
											<BadgeCheck
												aria-label="Patvirtinta"
												className="size-4 text-olive"
											/>
										)}
									</span>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
				{qsos.length === 0 && (
					<p className="px-5 py-8 text-center text-muted-foreground text-sm">
						Dar nėra užregistruotų ryšių.
					</p>
				)}
			</div>
		</section>
	);
}
