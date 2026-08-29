import {
	AudioLines,
	BadgeCheck,
	CalendarCheck,
	CalendarDays,
	Flag,
	Flame,
	Grid2x2,
	Handshake,
	Languages,
	type LucideIcon,
	MapPin,
	Moon,
	Radio,
	Rocket,
	Trophy,
	Users,
	Zap,
} from "lucide-react";

import { formatInVilnius } from "@/lib/date";

// Explicit map rather than a dynamic lucide lookup: keeps the icon set in the
// bundle honest and fails visibly when a definition names an icon we don't ship.
const ICONS: Record<string, LucideIcon> = {
	AudioLines,
	BadgeCheck,
	CalendarCheck,
	CalendarDays,
	Flag,
	Flame,
	Grid2x2,
	Handshake,
	Languages,
	MapPin,
	Moon,
	Radio,
	Rocket,
	Trophy,
	Users,
	Zap,
};

export interface AchievementView {
	description: string;
	group: string;
	icon: string;
	id: string;
	label: string;
	progress: number;
	target: number;
	tier: number;
	unlockedAt: Date | null;
}

/** Cancellation mark over an earned stamp, carrying the date it was struck. */
function Postmark({ date }: { date: Date }) {
	return (
		<span
			aria-hidden="true"
			className="pointer-events-none absolute -top-1 -right-1 size-14 rotate-[-12deg] opacity-45"
		>
			<svg fill="none" viewBox="0 0 56 56">
				<title>Antspaudas</title>
				<circle
					cx="28"
					cy="28"
					r="21"
					stroke="currentColor"
					strokeDasharray="2 3"
					strokeWidth="1"
				/>
				<circle
					cx="28"
					cy="28"
					r="17"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<text
					fill="currentColor"
					fontFamily="var(--font-mono)"
					fontSize="7"
					textAnchor="middle"
					x="28"
					y="26"
				>
					{formatInVilnius(date, "yyyy")}
				</text>
				<text
					fill="currentColor"
					fontFamily="var(--font-mono)"
					fontSize="7"
					textAnchor="middle"
					x="28"
					y="35"
				>
					{formatInVilnius(date, "MM-dd")}
				</text>
			</svg>
		</span>
	);
}

// Stamps sit in an album, not a grid of identical tiles: alternating tilt by
// index keeps the collection reading as pasted-in paper.
const TILTS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"] as const;

export function AchievementStamp({
	achievement,
	index,
}: {
	achievement: AchievementView;
	index: number;
}) {
	const Icon = ICONS[achievement.icon] ?? Grid2x2;
	const unlocked = achievement.unlockedAt !== null;
	const percent = Math.round((achievement.progress / achievement.target) * 100);
	const tilt = unlocked ? TILTS[index % TILTS.length] : "";

	return (
		// h-full down the chain so every stamp in a row measures the same, whatever
		// its description length — the perforation itself no longer cares.
		<li className="group h-full">
			<div
				className={`stamp-perforation h-full transition-transform duration-300 ease-out [--stamp-hole:3px] [--stamp-pitch:11px] group-hover:rotate-0 ${tilt} ${
					unlocked ? "bg-olive/20" : "bg-muted"
				}`}
			>
				<div
					className={`relative flex h-full flex-col items-center gap-2 px-4 py-6 text-center ${
						unlocked
							? "bg-card text-olive shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
							: "bg-card/60 text-muted-foreground/60"
					}`}
				>
					{unlocked && achievement.unlockedAt && (
						<Postmark date={achievement.unlockedAt} />
					)}

					<Icon aria-hidden="true" className="size-8" strokeWidth={1.5} />

					<h3
						className={`mt-1 font-mono text-[11px] uppercase tracking-[0.14em] ${
							unlocked ? "text-foreground" : "text-muted-foreground"
						}`}
					>
						{achievement.label}
					</h3>

					<p className="text-muted-foreground text-xs leading-snug">
						{achievement.description}
					</p>

					{!unlocked && (
						<div className="mt-auto w-full pt-3">
							<div
								aria-hidden="true"
								className="h-1 overflow-hidden rounded-full bg-muted"
							>
								<div
									className="h-full rounded-full bg-muted-foreground/50"
									style={{ width: `${percent}%` }}
								/>
							</div>
							<p className="mt-2 font-mono text-[10px] text-muted-foreground tabular-nums">
								{achievement.progress} / {achievement.target}
							</p>
						</div>
					)}
				</div>
			</div>
		</li>
	);
}
