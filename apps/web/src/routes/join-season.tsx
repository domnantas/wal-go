import { Button } from "@WAL-GO/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@WAL-GO/ui/components/card";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";

import { getUser } from "@/functions/get-user";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/join-season")({
	async beforeLoad() {
		const session = await getUser();
		if (!session?.user) {
			throw redirect({ to: "/auth/$path", params: { path: "sign-in" } });
		}
		return { session };
	},
	component: RouteComponent,
});

type Team = "yellow" | "green" | "red";

const TEAM_LABELS: Record<Team, string> = {
	yellow: "Geltona",
	green: "Žalia",
	red: "Raudona",
};

const TEAM_CLASSES: Record<Team, string> = {
	yellow: "bg-golden text-golden-foreground",
	green: "bg-olive text-olive-foreground",
	red: "bg-rust text-rust-foreground",
};

// Conic gradient starts at top (0°) clockwise. Pointer sits at 3 o'clock (90°).
// Center of each segment, in clockwise degrees from top:
//   yellow: 60°, green: 180°, red: 300°.
// To land segment under pointer we need rotation R such that center + R ≡ 90°.
const TEAM_TARGET_OFFSET: Record<Team, number> = {
	yellow: 30,
	green: 270,
	red: 150,
};

const SPIN_SPEED_DEG_PER_SEC = 1440;
const MIN_SPIN_MS = 1500;
const LANDING_REVS = 4;
const LANDING_DURATION_MS = 3200;

const dateFormatter = new Intl.DateTimeFormat("lt-LT", {
	year: "numeric",
	month: "long",
	day: "numeric",
});

function formatRange(startsAt: Date | string, endsAt: Date | string) {
	const start = dateFormatter.format(new Date(startsAt));
	const end = dateFormatter.format(new Date(endsAt));
	return `${start} – ${end}`;
}

type Phase = "idle" | "spinning" | "landing" | "landed";

function stopRaf(rafRef: RefObject<number | null>) {
	if (rafRef.current !== null) {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = null;
	}
}

function applyRotation(
	wheelRef: RefObject<HTMLDivElement | null>,
	deg: number,
	transition: string
) {
	const node = wheelRef.current;
	if (!node) {
		return;
	}
	node.style.transition = transition;
	node.style.transform = `rotate(${deg}deg)`;
}

function RouteComponent() {
	const queryClient = useQueryClient();
	const current = useQuery(orpc.seasons.current.queryOptions());
	const membership = useQuery(orpc.seasons.myMembership.queryOptions());
	const join = useMutation(orpc.seasons.join.mutationOptions());

	const [phase, setPhase] = useState<Phase>("idle");
	const wheelRef = useRef<HTMLDivElement>(null);
	const rotationRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	const startTimeRef = useRef(0);

	useEffect(() => () => stopRaf(rafRef), []);

	const handleSpin = () => {
		if (phase !== "idle" || join.isPending) {
			return;
		}
		setPhase("spinning");
		startTimeRef.current = performance.now();
		const tick = (now: number) => {
			const elapsed = now - startTimeRef.current;
			rotationRef.current = (elapsed / 1000) * SPIN_SPEED_DEG_PER_SEC;
			applyRotation(wheelRef, rotationRef.current, "none");
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		join.mutate({});
	};

	useEffect(() => {
		if (phase !== "spinning" || !join.data) {
			return;
		}
		const team = join.data.team as Team;
		const elapsed = performance.now() - startTimeRef.current;
		const wait = Math.max(0, MIN_SPIN_MS - elapsed);
		const landTimer = setTimeout(() => {
			stopRaf(rafRef);
			const jitter = (Math.random() - 0.5) * 100;
			const offset = TEAM_TARGET_OFFSET[team] + jitter;
			const baseRevs = Math.ceil(rotationRef.current / 360) + LANDING_REVS;
			const target = baseRevs * 360 + offset;
			rotationRef.current = target;
			applyRotation(
				wheelRef,
				target,
				`transform ${LANDING_DURATION_MS}ms cubic-bezier(0, 0, 0.2, 1)`
			);
			setPhase("landing");
		}, wait);
		return () => clearTimeout(landTimer);
	}, [phase, join.data]);

	useEffect(() => {
		if (phase !== "landing") {
			return;
		}
		const t = setTimeout(() => {
			setPhase("landed");
			if (join.data) {
				queryClient.setQueryData(
					orpc.seasons.myMembership.queryOptions().queryKey,
					join.data
				);
			}
		}, LANDING_DURATION_MS + 100);
		return () => clearTimeout(t);
	}, [phase, join.data, queryClient]);

	useEffect(() => {
		if (phase === "spinning" && join.isError) {
			stopRaf(rafRef);
			applyRotation(wheelRef, 0, "transform 400ms ease-out");
			rotationRef.current = 0;
			setPhase("idle");
		}
	}, [phase, join.isError]);

	if (current.isPending || membership.isPending) {
		return (
			<main className="container mx-auto flex max-w-2xl items-center justify-center px-4 py-16">
				<Spinner className="size-8" />
			</main>
		);
	}

	if (!current.data) {
		return (
			<main className="container mx-auto flex max-w-2xl flex-col items-center px-4 py-16">
				<Card className="w-full">
					<CardHeader>
						<CardTitle>Šiuo metu sezonas nevyksta</CardTitle>
						<CardDescription>
							Apie naujo sezono pradžią pranešime atskirai.
						</CardDescription>
					</CardHeader>
				</Card>
			</main>
		);
	}

	const season = current.data;
	const settledTeam =
		phase === "landed"
			? ((join.data?.team ?? membership.data?.team) as Team | undefined)
			: undefined;

	const showResultOnly = membership.data && phase === "idle";

	if (showResultOnly && membership.data) {
		const team = membership.data.team as Team;
		return (
			<main className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
				<Card>
					<CardHeader>
						<CardTitle>{season.name}</CardTitle>
						<CardDescription>
							{formatRange(season.startsAt, season.endsAt)}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<p className="text-muted-foreground text-sm">Tavo komanda</p>
						<div
							className={`flex h-32 w-32 items-center justify-center rounded-full font-bold font-serif text-2xl ${TEAM_CLASSES[team]}`}
						>
							{TEAM_LABELS[team]}
						</div>
					</CardContent>
				</Card>
			</main>
		);
	}

	return (
		<main className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
			<Card>
				<CardHeader>
					<CardTitle>{season.name}</CardTitle>
					<CardDescription>
						{formatRange(season.startsAt, season.endsAt)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">
						<Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
						<p className="text-muted-foreground">
							Sukite ratą ir prisijunkite prie atsitiktinės komandos
						</p>
					</div>
				</CardContent>
				<CardContent className="flex flex-col items-center gap-6">
					<div className="relative h-48 w-48">
						<div
							className="h-full w-full rounded-full ring-2 ring-foreground/10"
							ref={wheelRef}
							style={{
								background:
									"conic-gradient(var(--color-golden) 0 33.33%, var(--color-olive) 33.33% 66.66%, var(--color-rust) 66.66% 100%)",
								willChange: "transform",
							}}
						/>
						<div className="absolute top-1/2 right-0 h-0 w-0 -translate-y-1/2 border-y-8 border-y-transparent border-r-12 border-r-foreground" />
					</div>
					{settledTeam ? (
						<div className="flex flex-col items-center gap-2">
							<p className="text-muted-foreground text-sm">Tavo komanda</p>
							<div
								className={`rounded-full px-6 py-2 font-bold font-serif text-xl ${TEAM_CLASSES[settledTeam]}`}
							>
								{TEAM_LABELS[settledTeam]}
							</div>
						</div>
					) : (
						<Button
							disabled={phase !== "idle" || join.isPending}
							onClick={handleSpin}
							size="lg"
						>
							{phase === "spinning" ? "Sukama..." : "Sukti ratą"}
						</Button>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
