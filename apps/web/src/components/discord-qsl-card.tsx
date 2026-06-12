import type { CSSProperties } from "react";
import { DiscordIcon } from "@/components/discord-icon";
import { DISCORD_INVITE_URL } from "@/lib/constants";

/* QSL cards are physical paper — colors stay fixed across light/dark themes */
const QSL_VARS = {
	"--qsl-paper": "oklch(0.955 0.013 90)",
	"--qsl-paper-bright": "oklch(0.985 0.007 95)",
	"--qsl-ink": "oklch(0.31 0.045 50)",
	"--qsl-ink-soft": "oklch(0.47 0.035 55)",
	"--qsl-rust": "oklch(0.51 0.16 35)",
	"--qsl-olive": "oklch(0.41 0.09 145)",
} as CSSProperties;

const QSO_TABLE_HEADERS = ["Data", "UTC", "Dažnis", "Moda", "RST"] as const;
const QSO_TABLE_ROW = ["Šiandien", "24/7", "Discord", "CHAT", "599"] as const;

function PostmarkSvg() {
	return (
		<svg
			aria-hidden="true"
			className="absolute -bottom-7 -left-16 size-26 -rotate-12 text-(--qsl-ink)/50"
			viewBox="0 0 100 100"
		>
			<title>Pašto antspaudas</title>
			<circle
				cx="50"
				cy="50"
				fill="none"
				r="47"
				stroke="currentColor"
				strokeWidth="1.6"
			/>
			<circle
				cx="50"
				cy="50"
				fill="none"
				r="29"
				stroke="currentColor"
				strokeWidth="1.2"
			/>
			<defs>
				<path
					d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"
					id="qsl-postmark-arc"
				/>
			</defs>
			<text
				className="font-mono uppercase"
				fill="currentColor"
				fontSize="9"
				letterSpacing="2.4"
			>
				<textPath href="#qsl-postmark-arc">
					WAL GO · Lietuva · Eteris ·
				</textPath>
			</text>
			<text
				className="font-mono"
				fill="currentColor"
				fontSize="11"
				textAnchor="middle"
				x="50"
				y="54"
			>
				2026
			</text>
		</svg>
	);
}

function CancellationWavesSvg() {
	return (
		<svg
			aria-hidden="true"
			className="absolute top-7 -left-30 h-9 w-32 text-(--qsl-ink)/30 max-sm:hidden"
			viewBox="0 0 130 36"
		>
			{[4, 17, 30].map((y) => (
				<path
					d={`M0,${y} q16,-7 32,0 t32,0 t32,0 t34,0`}
					fill="none"
					key={y}
					stroke="currentColor"
					strokeWidth="1.6"
				/>
			))}
		</svg>
	);
}

export function DiscordQslCard() {
	return (
		<a
			className="group relative mx-auto mt-14 block max-w-2xl -rotate-1 transition-transform duration-300 ease-out hover:rotate-0 focus-visible:rotate-0"
			href={DISCORD_INVITE_URL}
			rel="noopener noreferrer"
			style={QSL_VARS}
			target="_blank"
		>
			{/* Airmail-style striped frame */}
			<div
				className="rounded-2xl p-[7px] shadow-[0_28px_56px_-24px_rgb(0_0_0/0.5)]"
				style={{
					background:
						"repeating-linear-gradient(45deg, var(--qsl-rust) 0 12px, var(--qsl-paper-bright) 12px 24px, var(--qsl-olive) 24px 36px, var(--qsl-paper-bright) 36px 48px)",
				}}
			>
				<div className="relative overflow-hidden rounded-[10px] bg-(--qsl-paper) px-5 py-6 text-left text-(--qsl-ink) sm:px-8 sm:py-7">
					{/* Callsign block + stamp & postmark */}
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<p className="font-mono text-(--qsl-ink-soft) text-[9px] uppercase tracking-[0.22em] sm:text-[10px]">
								QSL · Worked All Lithuania
							</p>
							<p className="mt-1 font-bold font-serif text-4xl tracking-tight sm:text-5xl">
								WAL GO
							</p>
							<p className="mt-1.5 font-mono text-(--qsl-ink-soft) text-[10px] sm:text-xs">
								walgo.lt · Lietuva · KO24
							</p>
						</div>
						<div className="relative shrink-0">
							<span className="qsl-perforation block rotate-2 bg-(--qsl-paper-bright) transition-transform duration-300 group-hover:rotate-0">
								<span className="flex size-16 flex-col items-center justify-center gap-1 bg-(--qsl-olive) sm:size-20">
									<DiscordIcon className="size-6 text-cream sm:size-8" />
									<span className="font-mono text-[8px] text-cream tracking-[0.18em]">
										73 LT
									</span>
								</span>
							</span>
							<PostmarkSvg />
							<CancellationWavesSvg />
						</div>
					</div>

					{/* To radio */}
					<div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<span className="font-mono text-(--qsl-ink-soft) text-[10px] uppercase tracking-[0.2em]">
							To radio
						</span>
						<span className="min-w-40 flex-1 border-(--qsl-ink)/35 border-b border-dashed pb-0.5 font-serif text-(--qsl-ink)/80 text-lg italic">
							Tavo šaukinys
						</span>
					</div>

					{/* QSO confirmation table */}
					<div className="mt-6 overflow-hidden rounded-lg border border-(--qsl-ink)/25">
						<div className="grid grid-cols-5 divide-x divide-(--qsl-ink)/20 bg-(--qsl-ink)/6 font-mono text-(--qsl-ink-soft) text-[9px] uppercase tracking-[0.14em] sm:text-[10px]">
							{QSO_TABLE_HEADERS.map((header) => (
								<span className="px-2 py-1.5 sm:px-3" key={header}>
									{header}
								</span>
							))}
						</div>
						<div className="grid grid-cols-5 divide-x divide-(--qsl-ink)/20 font-mono text-[11px] sm:text-sm">
							{QSO_TABLE_ROW.map((cell) => (
								<span className="px-2 py-2 sm:px-3" key={cell}>
									{cell}
								</span>
							))}
						</div>
					</div>

					{/* PSE/TNX + signoff + CTA */}
					<div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
						<div>
							<div className="flex gap-4 font-mono text-(--qsl-ink-soft) text-[10px] uppercase tracking-[0.16em]">
								<span className="inline-flex items-center gap-1.5">
									<span className="inline-flex size-3 items-center justify-center border border-(--qsl-ink)/45 text-[8px]">
										✕
									</span>
									Pse QSL
								</span>
								<span className="inline-flex items-center gap-1.5">
									<span className="size-3 border border-(--qsl-ink)/45" />
									Tnx QSL
								</span>
							</div>
							<p className="mt-3 font-serif text-(--qsl-ink)/85 text-xl italic">
								73! Lauksim eteryje.
							</p>
						</div>
						<span className="inline-flex items-center gap-2 rounded-full bg-(--qsl-ink) px-5 py-2.5 font-medium text-(--qsl-paper) text-sm transition-transform duration-300 group-hover:scale-105">
							<DiscordIcon className="size-4" />
							Prisijungti prie Discord
						</span>
					</div>
				</div>
			</div>
		</a>
	);
}
