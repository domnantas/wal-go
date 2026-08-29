import { useMemo, useState } from "react";

import { type MapOverlay, MapView } from "@/domains/map/map-view";
import {
	SQUARE_FORMS,
	TEAM_CONFIG,
	type Team,
	TOTAL_SQUARES,
} from "@/domains/season/team";
import { pluralizeLt } from "@/lib/plural";

interface ProfileMapProps {
	allTimeSquares: string[];
	isPending: boolean;
	seasonId: number | null;
	seasonName: string | null;
	seasonSquares: string[];
	team: Team | null;
}

export function ProfileMap({
	allTimeSquares,
	isPending,
	seasonId,
	seasonName,
	seasonSquares,
	team,
}: ProfileMapProps) {
	const [selectedSquareCode, setSelectedSquareCode] = useState<string | null>(
		null
	);

	// MapView rebuilds the whole grid GeoJSON whenever `overlay` changes
	// identity, so a fresh literal here would redraw every square on each
	// square selection.
	const overlay = useMemo<MapOverlay>(
		() => ({ kind: "worked", allTimeSquares, seasonSquares, team }),
		[allTimeSquares, seasonSquares, team]
	);

	const coverage = Math.round((allTimeSquares.length / TOTAL_SQUARES) * 100);
	const teamConfig = team ? TEAM_CONFIG[team] : null;
	const isEmpty = !isPending && allTimeSquares.length === 0;

	return (
		<section>
			<div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
				<h2 className="font-bold font-serif text-xl">Teritorija</h2>
				<p className="font-mono text-muted-foreground text-xs tabular-nums">
					{allTimeSquares.length} / {TOTAL_SQUARES} kvadratų · {coverage}%
				</p>
			</div>

			<div className="overflow-hidden rounded-4xl border border-border bg-card">
				<div aria-hidden="true" className="h-1 w-full bg-muted">
					<div
						className="h-full bg-foreground/60"
						style={{ width: `${coverage}%` }}
					/>
				</div>

				{/* MapView's root is `flex-1`, so its parent must be a flex container —
				    without it the map collapses to zero height. */}
				<div className="flex h-[26rem] sm:h-[32rem]">
					{isEmpty ? (
						<div className="flex flex-1 items-center justify-center px-6 text-center">
							<p className="max-w-sm text-muted-foreground text-sm">
								Dar nė vieno kvadrato. Užregistruok pirmą QSO ir jis atsiras
								žemėlapyje.
							</p>
						</div>
					) : (
						<MapView
							onSquareSelect={setSelectedSquareCode}
							overlay={overlay}
							seasonId={seasonId}
							selectedSquareCode={selectedSquareCode}
						/>
					)}
				</div>

				<div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-border border-t px-5 py-3 text-xs">
					{teamConfig && seasonName && (
						<span className="flex items-center gap-2">
							<span
								aria-hidden="true"
								className={`size-2.5 rounded-[3px] border-2 border-foreground/40 ${teamConfig.bar}`}
							/>
							<span className="text-muted-foreground">
								{seasonName} · {seasonSquares.length}{" "}
								{pluralizeLt(seasonSquares.length, SQUARE_FORMS)}
							</span>
						</span>
					)}
					<span className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className="size-2.5 rounded-[3px] bg-muted-foreground/50"
						/>
						<span className="text-muted-foreground">Visų laikų</span>
					</span>
					{selectedSquareCode && (
						<span className="ml-auto font-mono font-semibold">
							{selectedSquareCode}
						</span>
					)}
				</div>
			</div>
		</section>
	);
}
