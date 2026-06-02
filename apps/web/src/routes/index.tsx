import { Button, buttonVariants } from "@WAL-GO/ui/components/button";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useSession } from "@better-auth-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Map as MapIcon, Plus, X } from "lucide-react";
import { useCallback, useState } from "react";
import walGoLogo from "@/assets/logo_512.png";
import { DiscordIcon } from "@/components/discord-icon";
import { MapView } from "@/domains/map/map-view";
import { SelectedSquareStatsBox } from "@/domains/scoring/selected-square-stats-box";
import { SeasonCountdownCard } from "@/domains/season/season-countdown-card";
import { authClient } from "@/lib/auth-client";
import { DISCORD_INVITE_URL } from "@/lib/constants";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TOTAL_SQUARES = 210;

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

const TEAM_CONFIG = {
	yellow: { label: "Geltona", dot: "bg-golden", bar: "bg-golden" },
	green: { label: "Žalia", dot: "bg-olive", bar: "bg-olive" },
	red: { label: "Raudona", dot: "bg-rust", bar: "bg-rust" },
} as const;

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

function SectionEyebrow({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
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
	const { data: teamStandings } = useQuery(
		orpc.scoring.teamStandings.queryOptions({ input: {} })
	);

	const season =
		currentSeason ??
		seasons?.find((seasonRow) => seasonRow.status === "active") ??
		null;
	const upcomingSeason =
		seasons?.find((seasonRow) => seasonRow.status === "upcoming") ?? null;
	const recentlyEndedSeason =
		seasons?.findLast((seasonRow) => seasonRow.status === "ended") ?? null;
	const displayedSeasonId = season?.id ?? recentlyEndedSeason?.id ?? null;
	const standings = teamStandings ?? [];
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
						className="mx-auto mb-3 h-28 w-auto drop-shadow-md md:mb-4 md:h-40"
						src={walGoLogo}
					/>

					{heroSeasonStatus ?? heroSeasonCountdown}

					<h1
						className="font-bold font-serif leading-[1.02] tracking-tight"
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

					<div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-10">
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
			{isMapRevealed && selectedSquareCode && (
				<div className="fade-in slide-in-from-top-2 mx-auto max-w-xl animate-in px-8 pt-6 duration-300">
					<SelectedSquareStatsBox
						seasonId={displayedSeasonId}
						selectedSquareCode={selectedSquareCode}
						variant="row"
					/>
				</div>
			)}

			{/* ── Team standings ───────────────────────────────────── */}
			{standings.length > 0 && (
				<section className={cn("mx-auto max-w-6xl px-8 pt-12 pb-20")}>
					<div className="mb-8 flex flex-wrap items-end justify-between gap-8">
						<div>
							<SectionEyebrow>
								{season ? `Tiesiogiai · ${season.name}` : "Tiesiogiai"}
							</SectionEyebrow>
						</div>
					</div>
					<div className="grid gap-3 md:grid-cols-3">
						{standings.map((s) => {
							const config = TEAM_CONFIG[s.team as keyof typeof TEAM_CONFIG];
							const pct = (s.squaresControlled / TOTAL_SQUARES) * 100;
							return (
								<div
									className="rounded-4xl border border-border bg-card p-5"
									key={s.team}
								>
									<div className="mb-3 flex items-center justify-between">
										<div className="flex items-center gap-2.5">
											<span className={`size-3 rounded-full ${config.dot}`} />
											<span className="font-bold font-serif text-xl">
												{config.label}
											</span>
										</div>
										<span className="font-mono font-semibold text-sm">
											{s.squaresControlled}/{TOTAL_SQUARES}
										</span>
									</div>
									<div className="h-1.5 overflow-hidden rounded-full bg-muted">
										<div
											className={`h-full ${config.bar}`}
											style={{ width: `${pct}%` }}
										/>
									</div>
									<div className="mt-3 flex items-center justify-end text-muted-foreground text-xs">
										<span>{pct.toFixed(1)}% teritorijos</span>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{/* ── How it works ─────────────────────────────────────── */}
			<section
				className="border-border border-y bg-foreground/2.5"
				id="kaip-tai-veikia"
			>
				<div className="mx-auto max-w-6xl px-8 py-24">
					<div className="mx-auto mb-16 max-w-3xl text-center">
						<SectionEyebrow>Kaip tai veikia</SectionEyebrow>
						<h2 className="mt-3 font-bold font-serif text-5xl tracking-tight">
							Kaip žaisti <em className="text-rust italic">WAL GO</em> ?
						</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{HOW_STEPS.map((s) => (
							<div
								className="rounded-4xl border border-border bg-card p-7"
								key={s.n}
							>
								<div className="mb-4 flex items-center gap-3">
									<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground font-bold font-mono text-background text-lg leading-none">
										{s.n}
									</span>
									<h3 className="font-bold font-serif text-2xl leading-tight">
										{s.title}
									</h3>
								</div>
								<p className="text-foreground/75 leading-relaxed">{s.body}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── QSO log strip ────────────────────────────────────── */}
			<section className="mx-auto max-w-6xl px-8 py-20">
				<div className="grid items-center gap-12 md:grid-cols-2">
					<div>
						<SectionEyebrow>Žurnalas</SectionEyebrow>
						<h2 className="mt-3 font-bold font-serif text-4xl leading-tight tracking-tight md:text-5xl">
							Kiekvienas QSO –
							<br />
							<em className="text-olive italic">taškas komandai.</em>
						</h2>
						<p className="mt-5 text-base text-foreground/75 leading-relaxed">
							Įkelk Cabrillo failą iš savo loggerio – taškus pagal WAL kvadratus
							suskaičiuosim mes, o žemėlapis atsinaujins per kelias sekundes.
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
					<div className="rounded-4xl border border-border bg-card p-5">
						<div className="mb-4 flex items-center justify-between border-border border-b pb-3">
							<span className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
								log_2026_04_18.cbr
							</span>
							<span className="font-semibold text-olive text-xs">
								✓ Apdorota
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
						<div className="mt-4 flex items-center justify-between border-border border-t pt-3 text-xs">
							<span className="text-muted-foreground">5 QSO · 2 kvadratai</span>
							<span className="font-semibold text-rust">
								+5 taškai komandai
							</span>
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
								className="group rounded-4xl border border-border bg-card"
								key={f.q}
							>
								<summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5">
									<h3 className="font-bold font-serif text-xl">{f.q}</h3>
									<span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45">
										<Plus className="size-3.5" />
									</span>
								</summary>
								<p className="px-5 pb-5 text-foreground/75 leading-relaxed">
									{f.a}
								</p>
							</details>
						))}
					</div>
				</div>
			</section>

			{/* ── Discord ──────────────────────────────────────────── */}
			<section>
				<div className="mx-auto max-w-4xl px-8 py-24 text-center">
					<h2 className="font-bold font-serif text-5xl leading-tight tracking-tight md:text-6xl">
						Prisijunk prie WAL GO
						<br />
						<em className="text-rust italic">bendruomenės.</em>
					</h2>
					<p className="mx-auto mt-5 max-w-2xl text-base text-foreground/75 leading-relaxed md:text-lg">
						Aptark taisykles, susirask aktyvius korespondentus, pranešk apie
						išvykas į WAL kvadratus ir sek naujienas.
					</p>
					<div className="mt-8 flex items-center justify-center">
						<a
							className={cn(buttonVariants({ size: "lg" }), "px-6")}
							href={DISCORD_INVITE_URL}
							rel="noopener noreferrer"
							target="_blank"
						>
							<DiscordIcon className="size-4" />
							Prisijungti prie Discord
						</a>
					</div>
				</div>
			</section>

			{/* ── Footer ───────────────────────────────────────────── */}
			<footer className="border-border border-t bg-card/40">
				<div className="mx-auto grid max-w-6xl gap-8 px-8 py-10 text-sm md:grid-cols-4">
					<div className="space-y-3">
						<p className="font-bold font-serif text-xl">WAL GO</p>
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
