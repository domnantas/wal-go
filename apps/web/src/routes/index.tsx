import { Button } from "@WAL-GO/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { MapView } from "@/domains/map/map-view";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TOTAL_SQUARES = 210;

const HOW_STEPS = [
	{
		n: 1,
		title: "Užsiregistruok ir gauk šaukinį",
		body: "Sukurk paskyrą su el. paštu, įvesk savo radijo mėgėjo šaukinį. Pradedantieji ir patyrę operatoriai – visi laukiami.",
	},
	{
		n: 2,
		title: "Sukit ratą, gaukit komandą",
		body: "Sezono pradžioje sukit virtualų ratą — serveris atsitiktinai paskirs vieną iš trijų komandų: geltoną, žalią arba raudoną.",
	},
	{
		n: 3,
		title: "Užmegzkit ryšius Lietuvoje",
		body: "Veskit QSO bet kur Lietuvoje. Kiekvienas ryšys uždirba taškus jūsų komandai tame WAL kvadrate, iš kurio dirbate.",
	},
	{
		n: 4,
		title: "Užvaldykit kvadratus",
		body: "Komanda valdo kvadratą, kai turi daugiausiai taškų. Sezono pabaigoje laimi daugiausiai kvadratų užvaldžiusi komanda.",
	},
] as const;

const FAQS = [
	{
		q: "Kas yra WAL kvadratas?",
		a: "WAL (Worked All Lithuania) — tai 10' × 10' platumos / ilgumos langelis, į kuriuos suskirstyta visa Lietuva. Iš viso ~210 kvadratų — kiekvienas turi savo kodą (pvz., A05, K12). Identiška sistema, kurią naudoja patys Lietuvos radijo mėgėjai.",
	},
	{
		q: "Ar man reikia savo radijo stoties?",
		a: "Taip — WAL GO yra žaidimas tikriems radijo mėgėjams. Bet jei dar tik svarstai pradėti — užsiregistruok, stebėk žemėlapį ir grįžk, kai turėsi šaukinį.",
	},
	{
		q: "Kaip įkelti QSO?",
		a: "Du būdai: rankiniu būdu per /log puslapį, arba įkeliant ADIF failą iš tavo dienoraščio (LogTW, N1MM, Log4OM ir t.t.). ADIF importas filtruoja tik Lietuvos ryšius.",
	},
	{
		q: "Ar tame pačiame kvadrate galiu skaičiuoti tą patį korespondentą kelis kartus?",
		a: "Per vieną dieną (Vilniaus laiku) skaičiuojamas tik vienas ryšys su tuo pačiu korespondentu tame pačiame diapazone, moduliacijoje ir kvadrate. Pakeitus diapazoną ar persikėlus į kitą kvadratą — galima vėl.",
	},
	{
		q: "Kas atsitinka pasibaigus sezonui?",
		a: "Sezono pabaigoje fiksuojamas galutinis žemėlapis ir paskelbiama nugalėtoja komanda. Kitas sezonas prasideda iš naujo — komandos paskirstomos atsitiktinai, kvadratai vėl neutralūs.",
	},
] as const;

const TEAM_CONFIG = {
	yellow: { label: "Geltona", dot: "bg-golden", bar: "bg-golden" },
	green: { label: "Žalia", dot: "bg-olive", bar: "bg-olive" },
	red: { label: "Raudona", dot: "bg-rust", bar: "bg-rust" },
} as const;

const LOG_DEMO_ROWS = [
	{ time: "14:32", call: "OH3JR", band: "20m", mode: "FT8", square: "K12" },
	{ time: "14:28", call: "SP9DLY", band: "20m", mode: "FT8", square: "K12" },
	{ time: "14:21", call: "DL2RND", band: "20m", mode: "FT8", square: "K12" },
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
	const { data: session } = authClient.useSession();
	const currentSeason = useQuery(orpc.seasons.current.queryOptions());
	const teamStandings = useQuery(
		orpc.scoring.teamStandings.queryOptions({ input: {} })
	);

	const season = currentSeason.data;
	const standings = teamStandings.data ?? [];

	return (
		<main>
			{/* ── Hero ─────────────────────────────────────────────── */}
			<section className="relative flex min-h-[85vh] items-center overflow-hidden">
				{/* Map background — non-interactive */}
				<div className="pointer-events-none absolute inset-0 flex [&_.maplibregl-ctrl-bottom-left]:hidden [&_.maplibregl-ctrl-bottom-right]:hidden [&_.maplibregl-ctrl-top-right]:hidden">
					<MapView
						onSquareSelect={(_code) => {
							/* background map — no selection */
						}}
						seasonId={null}
						selectedSquareCode={null}
					/>
				</div>

				{/* Gradient overlay for text legibility */}
				<div className="pointer-events-none absolute inset-0 bg-linear-to-b from-background/70 via-background/65 to-background" />

				{/* Content */}
				<div className="relative z-10 mx-auto w-full max-w-6xl px-8 py-24 text-center">
					{season && (
						<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 font-medium text-muted-foreground text-xs backdrop-blur-sm">
							<span className="size-1.5 animate-pulse rounded-full bg-olive" />
							Sezonas {season.name}
						</div>
					)}

					<h1
						className="font-bold font-serif leading-[1.02] tracking-tight"
						style={{ fontSize: "clamp(48px, 7vw, 96px)" }}
					>
						Atrask <span className="text-olive">Lietuvą</span>
						<br />
						per <span className="text-rust">radijo</span>{" "}
						<em
							className="text-golden italic"
							style={{
								textShadow: "1px 1px 0 oklch(0.45 0.08 55 / 0.4)",
							}}
						>
							bangas
						</em>
					</h1>

					<p className="mx-auto mt-8 max-w-2xl text-foreground text-lg leading-relaxed md:text-xl">
						<b>WAL GO</b> yra žaidimas, kuriame <b>radijo mėgėjai</b> varžosi
						dėl teritorijos užmegzdami radijo ryšius visoje <b>Lietuvoje</b>.
					</p>

					<div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
						{session ? (
							<Button className="px-6" render={<Link to="/map" />} size="lg">
								Žiūrėti žemėlapį
								<ArrowRight className="size-4" />
							</Button>
						) : (
							<Button
								className="px-6"
								render={<Link params={{ path: "sign-in" }} to="/auth/$path" />}
								size="lg"
							>
								Pradėti žaidimą
								<ArrowRight className="size-4" />
							</Button>
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

			{/* ── Team standings ───────────────────────────────────── */}
			{standings.length > 0 && (
				<section className="mx-auto max-w-6xl px-8 py-20">
					<div className="mb-8 flex flex-wrap items-end justify-between gap-8">
						<div>
							<SectionEyebrow>
								{season ? `Tiesiogiai · ${season.name}` : "Tiesiogiai"}
							</SectionEyebrow>
							<h2 className="mt-3 font-bold font-serif text-4xl leading-tight tracking-tight md:text-5xl">
								Kas valdo daugiausiai
								<br />
								<em className="text-olive italic">kvadratų</em> Lietuvoje?
							</h2>
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
									<div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
										<span>{s.points} taškai</span>
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
							Keturi žingsniai į <em className="text-rust italic">WAL-GO</em>
						</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{HOW_STEPS.map((s) => (
							<div
								className="rounded-4xl border border-border bg-card p-7"
								key={s.n}
							>
								<div className="mb-4 flex items-center gap-3">
									<span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-background text-lg leading-none">
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
							QSO į taškus.
							<br />
							<em className="text-olive italic">Automatiškai.</em>
						</h2>
						<p className="mt-5 text-base text-foreground/75 leading-relaxed">
							Įkelk ADIF iš savo dienoraščio — N1MM, Log4OM, LogTW, fldigi. Mes
							filtruosim Lietuvos ryšius, paskirstysim taškus į WAL kvadratus ir
							atnaujinsim žemėlapį per sekundes.
						</p>
						<div className="mt-6 flex flex-wrap gap-2">
							{[
								"N1MM",
								"Log4OM",
								"LogTW",
								"fldigi",
								"WSJT-X",
								"Ham Radio Deluxe",
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
								log_2026_04_18.adi
							</span>
							<span className="font-semibold text-olive text-xs">
								✓ Apdorota
							</span>
						</div>
						<div className="space-y-2.5">
							{LOG_DEMO_ROWS.map((r) => (
								<div
									className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 text-sm"
									key={r.call}
								>
									<span className="font-mono text-muted-foreground text-xs">
										{r.time}
									</span>
									<span className="font-mono font-semibold">{r.call}</span>
									<span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">
										{r.band}
									</span>
									<span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
										{r.mode}
									</span>
									<span className="rounded-full bg-rust/15 px-2 py-0.5 font-mono font-semibold text-[10px] text-rust">
										+1 {r.square}
									</span>
								</div>
							))}
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
							Dažni <em className="text-olive italic">klausimai</em>
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

			{/* ── CTA ──────────────────────────────────────────────── */}
			<section>
				<div className="mx-auto max-w-4xl px-8 py-24 text-center">
					<h2 className="font-bold font-serif text-5xl leading-tight tracking-tight md:text-6xl">
						Eteris
						<br />
						tavęs <em className="text-rust italic">laukia.</em>
					</h2>
					{season && (
						<p className="mx-auto mt-5 max-w-xl text-foreground/75 text-lg">
							Prisijunk prie {season.name} sezono. Sukimas trunka pusantros
							sekundės.
						</p>
					)}
					<div className="mt-8 flex items-center justify-center gap-3">
						{session ? (
							<Button render={<Link to="/join-season" />} size="lg">
								Prisijungti prie sezono
							</Button>
						) : (
							<Button
								render={<Link params={{ path: "sign-in" }} to="/auth/$path" />}
								size="lg"
							>
								Registruotis
							</Button>
						)}
						<Button render={<Link to="/map" />} size="lg" variant="ghost">
							Žiūrėti žemėlapį
						</Button>
					</div>
				</div>
			</section>

			{/* ── Footer ───────────────────────────────────────────── */}
			<footer className="border-border border-t bg-card/40">
				<div className="mx-auto grid max-w-6xl gap-8 px-8 py-10 text-sm md:grid-cols-4">
					<div className="space-y-3">
						<p className="font-bold font-serif text-xl">WAL GO</p>
						<p className="text-muted-foreground text-xs leading-relaxed">
							Komandinis radijo žaidimas Lietuvos eteriui. Alfa versija · 2026.
						</p>
					</div>
					<div>
						<p className="mb-3 font-bold text-xs uppercase tracking-wider">
							Žaidimas
						</p>
						<ul className="space-y-2 text-muted-foreground">
							<li>
								<Link className="hover:text-foreground" to="/map">
									Žemėlapis
								</Link>
							</li>
							<li>
								<button
									className="hover:text-foreground"
									onClick={() => scrollToSection("kaip-tai-veikia")}
									type="button"
								>
									Taisyklės
								</button>
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
						<span>© 2026 WAL GO. Mėgėjams iš mėgėjų.</span>
						<span className="font-mono">73 de LY</span>
					</div>
				</div>
			</footer>
		</main>
	);
}
