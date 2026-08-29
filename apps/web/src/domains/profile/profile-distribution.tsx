interface DistributionEntry {
	key: string;
	total: number;
}

function DistributionList({
	entries,
	title,
}: {
	entries: DistributionEntry[];
	title: string;
}) {
	const max = Math.max(...entries.map((entry) => entry.total), 1);

	return (
		<div className="rounded-4xl border border-border bg-card p-6">
			<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
				{title}
			</p>
			{entries.length === 0 ? (
				<p className="mt-4 text-muted-foreground text-sm">Dar nėra duomenų.</p>
			) : (
				<ul className="mt-4 flex flex-col gap-2.5">
					{entries.map((entry) => (
						<li className="flex items-center gap-3" key={entry.key}>
							<span className="w-14 shrink-0 font-mono text-sm">
								{entry.key}
							</span>
							<span
								aria-hidden="true"
								className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
							>
								<span
									className="block h-full rounded-full bg-foreground/70"
									style={{ width: `${(entry.total / max) * 100}%` }}
								/>
							</span>
							<span className="w-12 shrink-0 text-right text-muted-foreground text-sm tabular-nums">
								{entry.total}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

interface ProfileDistributionProps {
	bands: DistributionEntry[];
	modes: DistributionEntry[];
}

export function ProfileDistribution({
	bands,
	modes,
}: ProfileDistributionProps) {
	return (
		<section className="grid gap-3 md:grid-cols-2">
			<DistributionList entries={bands} title="Dažnių juostos" />
			<DistributionList entries={modes} title="Rūšys" />
		</section>
	);
}
