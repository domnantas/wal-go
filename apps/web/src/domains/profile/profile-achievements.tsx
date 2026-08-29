import { Link } from "@tanstack/react-router";
import { Stamp } from "lucide-react";

import {
	AchievementStamp,
	type AchievementView,
} from "@/domains/profile/achievement-stamp";

interface ProfileAchievementsProps {
	achievements: AchievementView[];
	/** Only the signed-in operator gets a route to the full catalogue. */
	isOwnProfile: boolean;
}

export function ProfileAchievements({
	achievements,
	isOwnProfile,
}: ProfileAchievementsProps) {
	const earned = achievements
		.filter((achievement) => achievement.unlockedAt !== null)
		.sort(
			(a, b) => (b.unlockedAt?.getTime() ?? 0) - (a.unlockedAt?.getTime() ?? 0)
		);

	return (
		<section>
			<div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
				<h2 className="font-bold font-serif text-xl">Pasiekimai</h2>
				<div className="flex items-center gap-4">
					<p className="font-mono text-muted-foreground text-xs tabular-nums">
						{earned.length} / {achievements.length}
					</p>
					{isOwnProfile && (
						<Link
							className="font-mono text-xs underline-offset-4 hover:underline"
							to="/achievements"
						>
							Visi pasiekimai
						</Link>
					)}
				</div>
			</div>

			{earned.length === 0 ? (
				<div className="flex flex-col items-center gap-3 py-10 text-center">
					<Stamp
						aria-hidden="true"
						className="size-8 text-muted-foreground/40"
						strokeWidth={1.5}
					/>
					<p className="max-w-sm text-muted-foreground text-sm">
						Pasiekimų albumas dar tuščias.
					</p>
					{isOwnProfile && (
						<Link
							className="font-mono text-xs underline underline-offset-4"
							to="/achievements"
						>
							Pažiūrėti, ką galima surinkti
						</Link>
					)}
				</div>
			) : (
				<ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
					{earned.map((achievement, index) => (
						<AchievementStamp
							achievement={achievement}
							index={index}
							key={achievement.id}
						/>
					))}
				</ul>
			)}
		</section>
	);
}
