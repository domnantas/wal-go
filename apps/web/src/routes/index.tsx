import { Button } from "@WAL-GO/ui/components/button";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useSession } from "@better-auth-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Map as MapIcon, Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import walGoLogo from "@/assets/logo_512.png";
import { DiscordQslCard } from "@/components/discord-qsl-card";
import { MapView } from "@/domains/map/map-view";
import { ActivityFeedBox } from "@/domains/scoring/activity-feed-box";
import { SelectedSquareStatsBox } from "@/domains/scoring/selected-square-stats-box";
import { SeasonCountdownCard } from "@/domains/season/season-countdown-card";
import { SeasonWinnerHero } from "@/domains/season/season-winner-hero";
import type { Team } from "@/domains/season/team";
import { TeamStandingCard } from "@/domains/season/team-standing-card";
import { useWinnerConfetti } from "@/domains/season/use-winner-confetti";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const HOW_STEPS: ReadonlyArray<{
	n: number;
	title: string;
	body: React.ReactNode;
}> = [
	{
		n: 1,
		title: "Užregistruok savo šaukinį",
		body: (
			<>
				Sukurk paskyrą ir įvesk savo radijo mėgėjo šaukinį. Dar neturi šaukinio?{" "}
				<button
					className="underline hover:text-foreground"
					onClick={() => scrollToSection("duk")}
					type="button"
				>
					Sužinok kas yra radijo mėgėjai ir kaip gauti šaukinį.
				</button>
			</>
		),
	},
	{
		n: 2,
		title: "Prisijunk prie komandos",
		body: "Suk ratą ir būsi atsitiktinai paskirtas į vieną iš trijų komandų: geltoną, žalią arba raudoną.",
	},
	{
		n: 3,
		title: "Keliauk ir daryk QSO Lietuvoje",
		body: "QSO iš miško, nuo jūros ar miesto stogo – nesvarbu kur. Įkelk ataskaitą ir uždirbk taškus komandai.",
	},
	{
		n: 4,
		title: "Užvaldyk žemėlapį",
		body: "Komanda su daugiausiai taškų kvadrate tampa jo šeimininkais. Kuri komanda nuspalvins Lietuvą?",
	},
];

const FAQS: ReadonlyArray<{ q: string; a: React.ReactNode }> = [
	{
		q: "Kas yra radijo mėgėjai?",
		a: "Radijo mėgėjas — tai licencijuotas asmuo, turintis teisę naudotis radijo mėgėjams skirtais dažniais. Radijo mėgėjai mezga ryšius su kitais operatoriais visame pasaulyje, dalyvauja varžybose ir eksperimentuoja su įvairia radijo technika.",
	},
	{
		q: "Kaip gauti radijo mėgėjo šaukinį?",
		a: (
			<>
				Lietuvoje reikia išlaikyti Ryšių reguliavimo tarnybos (RRT)
				organizuojamą kvalifikacinį egzaminą ir gauti leidimą užsiimti radijo
				mėgėjų veikla. RRT suteikia individualų šaukinį (pvz., LY1JA).{" "}
				<a
					className="underline hover:text-foreground"
					href="https://rrt.lt/veiklos-sritys/elektroniniai-rysiai/radijo-spektras/radijo-megejai"
					rel="noopener noreferrer"
					target="_blank"
				>
					Daugiau informacijos RRT puslapyje
				</a>
				.
			</>
		),
	},
	{
		q: "Kas yra WAL kvadratas?",
		a: "WAL (Worked All Lithuania) — tai 10' × 10' platumos / ilgumos langelis, į kuriuos suskirstyta visa Lietuva. Iš viso ~210 kvadratų — kiekvienas turi savo kodą (pvz., A05, K12). Identiška sistema, kurią naudoja patys Lietuvos radijo mėgėjai.",
	},
	{
		q: "Ar galiu užmegzti ryšį su tuo pačiu korespondentu kelis kartus?",
		a: "Per vieną dieną (Lietuvos laiku) įskaitomas tik vienas ryšys su tuo pačiu korespondentu tame pačiame diapazone, moduliacijoje ir kvadrate. Pakeitus diapazoną, moduliaciją ar vienam iš radijo mėgėjų persikėlus į kitą kvadratą — galima užmegzti ryšį dar kartą.",
	},
	{
		q: "Kas atsitinka pasibaigus sezonui?",
		a: "Sezono pabaigoje fiksuojamas galutinis rezultatas ir paskelbiama nugalėjusi komanda. Kitas sezonas prasideda iš naujo — komandos paskirstomos atsitiktinai.",
	},
];

const LOG_DEMO_ROWS = [
	{ time: "14:32", call: "OH3JR", band: "20m", mode: "FT8", square: "K12" },
	{ time: "14:28", call: "SP9DLY", band: "20m", mode: "FT8", square: "K12" },
	{ time: "14:21", call: "LY5AT", band: "80m", mode: "CW", square: "K12" },
	{ time: "14:14", call: "EA7XYZ", band: "40m", mode: "SSB", square: "K12" },
	{ time: "14:02", call: "9A1ZRS", band: "40m", mode: "SSB", square: "K11" },
] as const;

function scrollToSection(id: string) {
	document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

function getStandingsEyebrow({
	isBetweenSeasons,
	recentlyEndedSeason,
	season,
}: {
	isBetweenSeasons: boolean;
	recentlyEndedSeason: { name: string } | null;
	season: { name: string } | null;
}) {
	if (isBetweenSeasons && recentlyEndedSeason) {
		return `Sezono rezultatai · ${recentlyEndedSeason.name}`;
	}
	if (season) {
		return `Tiesiogiai · ${season.name}`;
	}
	return "Tiesiogiai";
}

interface StandingRow {
	points: number;
	squaresControlled: number;
	team: Team;
}

interface TeamStandingsSectionProps {
	displayedSeasonId: number | null;
	eyebrow: string;
	isAuthenticated: boolean;
	isBetweenSeasons: boolean;
	isMapRevealed: boolean;
	selectedSquareCode: string | null;
	standings: StandingRow[];
	winner: StandingRow | undefined;
}

function TeamStandingsSection({
	standings,
	eyebrow,
	isBetweenSeasons,
	isAuthenticated,
	winner,
	isMapRevealed,
	selectedSquareCode,
	displayedSeasonId,
}: TeamStandingsSectionProps) {
	if (standings.length === 0) {
		return null;
	}
	return (
		<section className={cn("mx-auto max-w-6xl px-8 pt-6 pb-20")}>
			<div className="mb-6 flex flex-wrap items-end justify-between gap-8">
				<div>
					<SectionEyebrow>{eyebrow}</SectionEyebrow>
				</div>
				{isBetweenSeasons && isAuthenticated && (
					<Link
						className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm hover:text-foreground"
						to="/leaderboard"
					>
						Visi rezultatai
						<ArrowRight className="size-4" />
					</Link>
				)}
			</div>
			{isBetweenSeasons && winner && (
				<SeasonWinnerHero
					className="mb-6"
					points={winner.points}
					squaresControlled={winner.squaresControlled}
					team={winner.team}
				/>
			)}
			{isMapRevealed && selectedSquareCode && (
				<div className="fade-in slide-in-from-top-2 mx-auto mb-3 max-w-xl animate-in duration-300">
					<SelectedSquareStatsBox
						seasonId={displayedSeasonId}
						selectedSquareCode={selectedSquareCode}
						variant="row"
					/>
				</div>
			)}
			<div className="grid gap-3 md:grid-cols-3">
				{standings.map((s) => (
					<TeamStandingCard
						key={s.team}
						points={s.points}
						squaresControlled={s.squaresControlled}
						team={s.team}
					/>
				))}
			</div>
			{displayedSeasonId !== null && (
				<div className="mt-3 rounded-4xl border border-border bg-card p-5">
					<ActivityFeedBox seasonId={displayedSeasonId} variant="compact" />
				</div>
			)}
		</section>
	);
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
			{children}
		</p>
	);
}

function HomeComponent() {
	const queryClient = useQueryClient();
	const [isMapRevealed, setIsMapRevealed] = useState(false);
	const [selectedSquareCode, setSelectedSquareCode] = useState<string | null>(
		null
	);
	const revealMap = useCallback(() => {
		setIsMapRevealed(true);
	}, []);
	const hideMap = useCallback(() => {
		setIsMapRevealed(false);
		setSelectedSquareCode(null);
	}, []);
	const { data: session, isPending: isSessionPending } = useSession(authClient);
	const { data: currentSeason } = useQuery(orpc.seasons.current.queryOptions());
	const { data: seasons } = useQuery(orpc.seasons.list.queryOptions());

	const season =
		currentSeason ??
		seasons?.find((seasonRow) => seasonRow.status === "active") ??
		null;
	const upcomingSeason =
		seasons?.find((seasonRow) => seasonRow.status === "upcoming") ?? null;
	const recentlyEndedSeason =
		seasons?.findLast((seasonRow) => seasonRow.status === "ended") ?? null;
	const displayedSeasonId = season?.id ?? recentlyEndedSeason?.id ?? null;
	const isBetweenSeasons = !season && !!recentlyEndedSeason;

	const { data: teamStandings } = useQuery({
		...orpc.scoring.teamStandings.queryOptions({
			input: { seasonId: displayedSeasonId ?? undefined },
		}),
		enabled: displayedSeasonId !== null,
	});
	const standings = teamStandings ?? [];
	const winner = standings[0];

	useWinnerConfetti(displayedSeasonId, isBetweenSeasons);

	const standingsEyebrow = getStandingsEyebrow({
		isBetweenSeasons,
		recentlyEndedSeason,
		season,
	});
	const handleSeasonTimingComplete = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.current.queryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.list.queryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: orpc.seasons.myMembership.queryOptions().queryKey,
		});
	}, [queryClient]);
	const heroSeasonStatus = season ? (
		<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 font-medium text-muted-foreground text-xs backdrop-blur-sm">
			<span className="size-1.5 animate-pulse rounded-full bg-olive" />
			Sezonas {season.name}
		</div>
	) : null;
	const heroSeasonCountdown =
		!season && upcomingSeason ? (
			<SeasonCountdownCard
				className="mb-8"
				onComplete={handleSeasonTimingComplete}
				season={upcomingSeason}
				variant="badge"
			/>
		) : null;

	return (
		<main>
			{/* ── Hero ─────────────────────────────────────────────── */}
			<section className="relative flex min-h-[60vh] items-center overflow-hidden md:min-h-[85vh]">
				{/* Persistent, stationary map */}
				<div
					className={cn(
						"absolute inset-0 flex",
						isMapRevealed
							? "z-0"
							: "pointer-events-none [&_.maplibregl-ctrl-bottom-left]:hidden [&_.maplibregl-ctrl-bottom-right]:hidden [&_.maplibregl-ctrl-top-right]:hidden"
					)}
				>
					<MapView
						onSquareSelect={setSelectedSquareCode}
						seasonId={displayedSeasonId}
						selectedSquareCode={isMapRevealed ? selectedSquareCode : null}
					/>
				</div>

				{/* Gradient overlay — fades out when map revealed */}
				<div
					className={cn(
						"pointer-events-none absolute inset-0 bg-linear-to-b from-background/70 via-background/65 to-background transition-opacity duration-500",
						isMapRevealed && "opacity-0"
					)}
				/>

				{/* Hide-map button — fades in when map revealed */}
				<Button
					className={cn(
						"absolute top-4 left-4 z-20 shadow-md transition-all duration-500",
						isMapRevealed
							? "translate-y-0 opacity-100"
							: "pointer-events-none -translate-y-2 opacity-0"
					)}
					onClick={hideMap}
					size="sm"
					variant="secondary"
				>
					<X className="size-4" />
					Slėpti žemėlapį
				</Button>

				{/* Content — moves up and fades out when map revealed */}
				<div
					className={cn(
						"relative z-10 mx-auto w-full max-w-6xl px-6 pt-8 pb-14 text-center transition-all duration-500 md:px-8 md:pt-14 md:pb-24",
						isMapRevealed && "pointer-events-none -translate-y-4 opacity-0"
					)}
				>
					<img
						alt="WAL GO logo"
						className="fade-in slide-in-from-bottom-3 mx-auto mb-3 h-28 w-auto animate-in fill-mode-backwards drop-shadow-md duration-700 md:mb-4 md:h-40"
						src={walGoLogo}
					/>

					{heroSeasonStatus ?? heroSeasonCountdown}

					<h1
						className="fade-in slide-in-from-bottom-3 animate-in fill-mode-backwards font-bold font-serif leading-[1.02] tracking-tight duration-700 [animation-delay:150ms]"
						style={{ fontSize: "clamp(36px, 7vw, 96px)" }}
					>
						Atrask <span className="text-golden">Lietuvą</span>
						<br />
						per <span className="text-olive">radijo</span>{" "}
						<em
							className="text-rust italic"
							style={{
								textShadow: "1px 1px 0 oklch(0.45 0.08 55 / 0.4)",
							}}
						>
							bangas
						</em>
					</h1>

					<div className="fade-in slide-in-from-bottom-3 mt-6 flex animate-in flex-col items-center justify-center gap-3 fill-mode-backwards duration-700 [animation-delay:300ms] sm:flex-row md:mt-10">
						{!isSessionPending && session ? (
							<Button
								className="px-6"
								nativeButton={false}
								render={<Link to="/map" />}
								size="lg"
							>
								Žiūrėti žemėlapį
								<ArrowRight className="size-4" />
							</Button>
						) : (
							<>
								<Button
									className="px-6"
									nativeButton={false}
									render={
										<Link params={{ path: "sign-in" }} to="/auth/$path" />
									}
									size="lg"
								>
									Prisijungti
									<ArrowRight className="size-4" />
								</Button>
								<Button onClick={revealMap} size="lg" variant="outline">
									<MapIcon className="size-4" />
									Žiūrėti žemėlapį
								</Button>
							</>
						)}
						<Button
							onClick={() => scrollToSection("kaip-tai-veikia")}
							size="lg"
							variant="ghost"
						>
							Kaip tai veikia?
						</Button>
					</div>
				</div>
			</section>

			{/* Selected square stats — under the map when revealed */}

			{/* ── Team standings ───────────────────────────────────── */}
			<TeamStandingsSection
				displayedSeasonId={displayedSeasonId}
				eyebrow={standingsEyebrow}
				isAuthenticated={!!session}
				isBetweenSeasons={isBetweenSeasons}
				isMapRevealed={isMapRevealed}
				selectedSquareCode={selectedSquareCode}
				standings={standings}
				winner={winner}
			/>

			{/* ── How it works ─────────────────────────────────────── */}
			<section
				className="relative border-border border-y bg-foreground/2.5"
				id="kaip-tai-veikia"
			>
				<div
					aria-hidden="true"
					className="graticule pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_85%_90%_at_50%_0%,black,transparent_80%)]"
				/>
				<div className="relative mx-auto max-w-6xl px-8 py-24">
					<div className="mx-auto mb-16 max-w-3xl text-center">
						<SectionEyebrow>Kaip tai veikia</SectionEyebrow>
						<h2 className="mt-3 font-bold font-serif text-5xl tracking-tight">
							Kaip žaisti <em className="text-rust italic">WAL GO</em> ?
						</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{HOW_STEPS.map((s) => (
							<div
								className="group relative overflow-hidden rounded-4xl border border-border bg-card p-7 transition-colors hover:border-foreground/25"
								key={s.n}
							>
								<span
									aria-hidden="true"
									className="pointer-events-none absolute top-1 right-4 select-none font-bold font-mono text-7xl text-foreground/6"
								>
									{String(s.n).padStart(2, "0")}
								</span>
								<p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
									Žingsnis {String(s.n).padStart(2, "0")}
								</p>
								<h3 className="mt-2 font-bold font-serif text-2xl leading-tight">
									{s.title}
								</h3>
								<p className="mt-3 text-foreground/75 leading-relaxed">
									{s.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── QSO log strip ────────────────────────────────────── */}
			<section className="relative overflow-hidden">
				<div
					aria-hidden="true"
					className="radio-rings pointer-events-none absolute inset-0 opacity-70 [--rings-x:82%] [--rings-y:45%] [mask-image:radial-gradient(ellipse_45%_70%_at_82%_45%,black,transparent_75%)] max-md:hidden"
				/>
				<div className="relative mx-auto max-w-6xl px-8 py-20">
					<div className="grid items-center gap-12 md:grid-cols-2">
						<div>
							<SectionEyebrow>Žurnalas</SectionEyebrow>
							<h2 className="mt-3 font-bold font-serif text-4xl leading-tight tracking-tight md:text-5xl">
								Kiekvienas QSO –
								<br />
								<em className="text-olive italic">taškas komandai.</em>
							</h2>
							<p className="mt-5 text-base text-foreground/75 leading-relaxed">
								Įkelk log failą iš savo mėgstamo loggerio – taškus pagal WAL
								kvadratus suskaičiuosim mes, o žemėlapis atsinaujins per kelias
								sekundes.
							</p>
							<div className="mt-6 flex flex-wrap gap-2">
								{[
									"N1MM",
									"QRZ.com",
									"Log4OM",
									"Ham Radio Deluxe",
									"WSJT-X",
									"DXKeeper",
									"WRL",
									"Ir kiti...",
								].map((t) => (
									<span
										className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-muted-foreground text-xs"
										key={t}
									>
										{t}
									</span>
								))}
							</div>
						</div>
						<div className="rotate-[0.8deg] rounded-4xl border border-border bg-card p-5 shadow-[0_16px_40px_-24px_rgb(0_0_0/0.4)] transition-transform duration-300 hover:rotate-0">
							<div className="mb-4 flex items-center justify-between border-border border-b border-dashed pb-3">
								<span className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
									log_2026_04_18.adi
								</span>
								<span className="-rotate-3 rounded border-2 border-olive/70 px-2 py-0.5 font-bold font-mono text-[10px] text-olive uppercase tracking-[0.16em]">
									Apdorota
								</span>
							</div>
							<div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-3 gap-y-2.5 text-sm">
								{LOG_DEMO_ROWS.flatMap((r) => [
									<span
										className="font-mono text-muted-foreground text-xs"
										key={`${r.call}-time`}
									>
										{r.time}
									</span>,
									<span
										className="font-mono font-semibold"
										key={`${r.call}-call`}
									>
										{r.call}
									</span>,
									<span
										className="rounded-full bg-muted px-2 py-0.5 text-center font-mono text-[10px]"
										key={`${r.call}-band`}
									>
										{r.band}
									</span>,
									<span
										className="rounded-full border border-border px-2 py-0.5 text-center font-mono text-[10px] text-muted-foreground"
										key={`${r.call}-mode`}
									>
										{r.mode}
									</span>,
									<span
										className="rounded-full bg-rust/15 px-2 py-0.5 text-center font-mono font-semibold text-[10px] text-rust"
										key={`${r.call}-square`}
									>
										+1 {r.square}
									</span>,
								])}
							</div>
							<div className="mt-4 flex items-center justify-between border-border border-t border-dashed pt-3 text-xs">
								<span className="text-muted-foreground">
									5 QSO · 2 kvadratai
								</span>
								<span className="font-semibold text-rust">
									+5 taškai komandai
								</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ── FAQ ──────────────────────────────────────────────── */}
			<section className="border-border border-y bg-foreground/2.5" id="duk">
				<div className="mx-auto max-w-3xl px-8 py-24">
					<div className="mb-12 text-center">
						<SectionEyebrow>D.U.K.</SectionEyebrow>
						<h2 className="mt-3 font-bold font-serif text-5xl tracking-tight">
							Dažnai užduodami <em className="text-golden italic">klausimai</em>
						</h2>
					</div>
					<div className="space-y-3">
						{FAQS.map((f) => (
							<details
								className="group rounded-4xl border border-border bg-card transition-colors hover:border-foreground/25"
								key={f.q}
							>
								<summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
									<h3 className="font-bold font-serif text-xl">{f.q}</h3>
									<span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45">
										<Plus className="size-3.5" />
									</span>
								</summary>
								<p className="mx-5 border-border border-t border-dashed pt-4 pb-5 text-foreground/75 leading-relaxed">
									{f.a}
								</p>
							</details>
						))}
					</div>
				</div>
			</section>

			{/* ── Discord / QSL ────────────────────────────────────── */}
			<section className="relative overflow-hidden" id="bendruomene">
				<div
					aria-hidden="true"
					className="radio-rings pointer-events-none absolute inset-0 [--rings-y:115%] [mask-image:radial-gradient(ellipse_75%_85%_at_50%_100%,black,transparent)]"
				/>
				<div className="relative mx-auto max-w-4xl px-6 py-24 md:px-8">
					<div className="text-center">
						<SectionEyebrow>Bendruomenė</SectionEyebrow>
						<h2 className="mt-3 font-bold font-serif text-5xl leading-tight tracking-tight md:text-6xl">
							Patvirtinkim <em className="text-rust italic">ryšį.</em>
						</h2>
						<p className="mx-auto mt-5 max-w-2xl text-base text-foreground/75 leading-relaxed md:text-lg">
							Radijo mėgėjai ryšius patvirtina QSL kortelėmis — štai mūsiškė,
							skirta tau. Aptark taisykles, susirask aktyvius korespondentus,
							pranešk apie išvykas į WAL kvadratus ir sek naujienas.
						</p>
					</div>
					<DiscordQslCard />
				</div>
			</section>

			{/* ── Footer ───────────────────────────────────────────── */}
			<footer className="border-border border-t bg-card/40">
				{/* Radio dial scale */}
				<div aria-hidden="true" className="relative">
					<div className="absolute inset-x-0 top-0 h-1.5 [background-image:repeating-linear-gradient(to_right,var(--border)_0_1px,transparent_1px_9px)]" />
					<div className="mx-auto flex max-w-6xl justify-between px-8">
						{["1.8", "3.5", "7", "14", "21", "28", "50 MHz"].map((band) => (
							<span className="flex flex-col items-center gap-1" key={band}>
								<span className="h-2.5 w-px bg-muted-foreground/40" />
								<span className="font-mono text-[9px] text-muted-foreground/60 tracking-wide">
									{band}
								</span>
							</span>
						))}
					</div>
				</div>
				<div className="mx-auto grid max-w-6xl gap-8 px-8 py-10 text-sm md:grid-cols-4">
					<div className="space-y-3">
						<p className="font-bold font-serif text-xl">WAL GO</p>
						<p
							aria-hidden="true"
							className="font-mono text-muted-foreground/60 text-xs tracking-[0.2em]"
						>
							·–– ·– ·–·· ––· –––
						</p>
						<p className="text-muted-foreground text-xs">
							Atrask Lietuvą per radijo bangas.
						</p>
					</div>
					<div>
						<p className="mb-3 font-bold text-xs uppercase tracking-wider">
							Žaidimas
						</p>
						<ul className="space-y-2 text-muted-foreground">
							<li>
								<button
									className="hover:text-foreground"
									onClick={() => scrollToSection("kaip-tai-veikia")}
									type="button"
								>
									Kaip žaisti?
								</button>
							</li>
							<li>
								<Link className="hover:text-foreground" to="/rules">
									Taisyklės
								</Link>
							</li>
						</ul>
					</div>
					<div>
						<p className="mb-3 font-bold text-xs uppercase tracking-wider">
							Paskyra
						</p>
						<ul className="space-y-2 text-muted-foreground">
							<li>
								<Link
									className="hover:text-foreground"
									params={{ path: "sign-in" }}
									to="/auth/$path"
								>
									Prisijungti
								</Link>
							</li>
							<li>
								<Link
									className="hover:text-foreground"
									params={{ path: "sign-up" }}
									to="/auth/$path"
								>
									Registruotis
								</Link>
							</li>
						</ul>
					</div>
					<div>
						<p className="mb-3 font-bold text-xs uppercase tracking-wider">
							Pagalba
						</p>
						<ul className="space-y-2 text-muted-foreground">
							<li>
								<button
									className="hover:text-foreground"
									onClick={() => scrollToSection("duk")}
									type="button"
								>
									D.U.K.
								</button>
							</li>
						</ul>
					</div>
				</div>
				<div className="border-border border-t">
					<div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4 text-muted-foreground text-xs">
						<span>© 2026 WAL GO</span>
						<span className="font-mono">73 de LY1JA</span>
					</div>
				</div>
			</footer>
		</main>
	);
}
