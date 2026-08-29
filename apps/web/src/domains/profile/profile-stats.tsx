import {
	BadgeCheck,
	Flame,
	type LucideIcon,
	Radio,
	Target,
	Users,
} from "lucide-react";

import { pluralizeLt } from "@/lib/plural";

interface StatCard {
	career: number;
	icon: LucideIcon;
	label: string;
	note: string | null;
}

interface ProfileStatsProps {
	career: {
		confirmedCount: number;
		distinctCallsigns: number;
		longestStreak: number;
		points: number;
		qsoCount: number;
	} | null;
	season: {
		confirmedCount: number;
		distinctCallsigns: number;
		longestStreak: number;
		points: number;
		qsoCount: number;
	} | null;
}

/** Log stat card language: mono label + faded icon, serif tabular number. */
export function ProfileStats({ career, season }: ProfileStatsProps) {
	const seasonNote = (value: number | undefined) =>
		value === undefined ? null : `${value} šį sezoną`;

	const cards: StatCard[] = [
		{
			label: "Taškai",
			icon: Target,
			career: career?.points ?? 0,
			note: seasonNote(season?.points),
		},
		{
			label: "QSO",
			icon: Radio,
			career: career?.qsoCount ?? 0,
			note: seasonNote(season?.qsoCount),
		},
		{
			label: "Patvirtinta",
			icon: BadgeCheck,
			career: career?.confirmedCount ?? 0,
			note: seasonNote(season?.confirmedCount),
		},
		{
			label: "Šaukinių",
			icon: Users,
			career: career?.distinctCallsigns ?? 0,
			note: seasonNote(season?.distinctCallsigns),
		},
		{
			label: "Serija",
			icon: Flame,
			career: career?.longestStreak ?? 0,
			note:
				season === null
					? null
					: `${season.longestStreak} ${pluralizeLt(season.longestStreak, {
							one: "diena",
							few: "dienos",
							many: "dienų",
						})} iš eilės šį sezoną`,
		},
	];

	return (
		<section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
			{cards.map((card) => (
				<div
					className="rounded-3xl border border-border bg-card p-5"
					key={card.label}
				>
					<div className="flex items-center justify-between gap-2">
						<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
							{card.label}
						</span>
						<card.icon
							aria-hidden="true"
							className="size-4 text-muted-foreground/40"
						/>
					</div>
					<span className="mt-2 block font-bold font-serif text-4xl tabular-nums">
						{card.career}
					</span>
					{card.note && (
						<span className="mt-1 block text-muted-foreground text-xs tabular-nums">
							{card.note}
						</span>
					)}
				</div>
			))}
		</section>
	);
}
