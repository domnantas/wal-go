import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@WAL-GO/ui/components/avatar";

import { TEAM_CONFIG, type Team } from "@/domains/season/team";
import { formatInVilnius } from "@/lib/date";

interface ProfileHeaderProps {
	callsign: string;
	currentSeason: { name: string; team: Team } | null;
	image: string | null;
	memberSince: Date;
}

/**
 * Sits on the page ground, not in a card — the operator's identity is the page
 * masthead, so it gets the graticule backdrop and open space instead of a box.
 */
export function ProfileHeader({
	callsign,
	currentSeason,
	image,
	memberSince,
}: ProfileHeaderProps) {
	const teamConfig = currentSeason ? TEAM_CONFIG[currentSeason.team] : null;

	return (
		<header className="relative isolate flex flex-wrap items-center gap-x-6 gap-y-4 pt-2 pb-8 pl-6 sm:pl-8">
			<div
				aria-hidden="true"
				className="graticule pointer-events-none absolute inset-x-0 -inset-y-4 -z-10 [--graticule-size:44px] [mask-image:radial-gradient(120%_100%_at_0%_50%,black,transparent_70%)]"
			/>

			<Avatar className="size-20 shrink-0">
				{image && <AvatarImage alt="" src={image} />}
				<AvatarFallback className="bg-muted font-mono font-semibold text-xl">
					{callsign.slice(0, 2)}
				</AvatarFallback>
			</Avatar>

			<div className="min-w-0">
				<h1 className="break-all font-bold font-mono text-4xl tracking-tight sm:text-5xl">
					{callsign}
				</h1>
				<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
					{currentSeason && teamConfig ? (
						<span className="flex items-center gap-2">
							<span
								aria-hidden="true"
								className={`size-2.5 rounded-full ${teamConfig.dot}`}
							/>
							<span className="font-medium">{teamConfig.label}</span>
							<span className="font-serif text-muted-foreground">
								{currentSeason.name}
							</span>
						</span>
					) : (
						<span className="text-muted-foreground">Šį sezoną nedalyvauja</span>
					)}
					<span aria-hidden="true" className="text-border">
						·
					</span>
					<span className="font-mono text-muted-foreground text-xs">
						Nuo {formatInVilnius(memberSince, "yyyy-MM-dd")}
					</span>
				</div>
			</div>
		</header>
	);
}
