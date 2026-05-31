import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/rules")({
	component: RulesComponent,
});

interface RuleSectionProps {
	children: React.ReactNode;
	id: string;
	number: string;
	title: string;
}

function RuleSection({ id, number, title, children }: RuleSectionProps) {
	return (
		<section className="mb-12" id={id}>
			<div className="mb-4 flex items-baseline gap-3">
				<span className="font-mono text-muted-foreground text-sm">
					{number}
				</span>
				<h2 className="font-bold font-serif text-2xl">{title}</h2>
			</div>
			<div className="space-y-3 text-foreground/80 leading-relaxed">
				{children}
			</div>
		</section>
	);
}

function Rule({
	n,
	children,
}: {
	n: number | string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex gap-3">
			<span className="mt-0.5 shrink-0 font-mono text-muted-foreground/60 text-sm">
				{n}.
			</span>
			<p>{children}</p>
		</div>
	);
}

function Note({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-foreground/70 text-sm">
			{children}
		</div>
	);
}

function RulesComponent() {
	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<div className="mb-12">
				<p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
					WAL GO · Alpha 1 sezonas
				</p>
				<h1 className="mt-6 font-bold font-serif text-5xl leading-[1.02] tracking-tight md:text-6xl">
					Žaidimo <em className="text-olive italic">taisyklės</em>
				</h1>
			</div>

			<RuleSection
				id="bendrosios-nuostatos"
				number="1"
				title="Bendrosios nuostatos"
			>
				<Rule n="1.1">
					WAL GO yra komandinis žaidimas, skirtas licencijuotiems Lietuvos ir
					užsienio radijo mėgėjams. Žaidimo tikslas — sudaryti kuo daugiau
					radijo ryšių (QSO) iš skirtingų Lietuvos vietovių ir savo komandai
					užvaldyti kuo daugiau teritorijos.
				</Rule>
			</RuleSection>

			<RuleSection id="dalyviai" number="2" title="Dalyviai">
				<Rule n="2.1">
					Žaisti gali kiekvienas, turintis galiojantį radijo mėgėjo šaukinį.
					Norėdamas dalyvauti, žaidėjas privalo sukurti paskyrą ir nurodyti savo
					šaukinį.
				</Rule>
				<Rule n="2.2">
					Kiekvienam žaidėjui leidžiama turėti tik vieną paskyrą. Kelių paskyrų
					kūrimas siekiant manipuliuoti rezultatais draudžiamas ir gali baigtis
					paskyros panaikinimu.
				</Rule>
				<Rule n="2.3">
					Administratoriai turi teisę tikrinti registruotus QSO ir įtarus
					sukčiavimą — pavyzdžiui, išgalvotus ar suklastotus ryšius, kelių
					paskyrų naudojimą ar kitokį nesąžiningą taisyklių nesilaikymą —
					neįskaityti atitinkamų QSO, laikinai apriboti arba visam laikui
					panaikinti žaidėjo paskyrą.
				</Rule>
			</RuleSection>

			<RuleSection id="sezonas" number="3" title="Sezonas">
				<Rule n="3.1">
					Sezonas — tai apibrėžtas laikotarpis, per kurį vyksta žaidimas.
					Kiekvienas sezonas turi pradžios ir pabaigos datą.
				</Rule>
				<Rule n="3.2">
					Vienu metu gali būti aktyvus tik vienas sezonas. QSO gali būti
					registruojami tik aktyvaus sezono metu.
				</Rule>
				<Rule n="3.3">
					Alpha ir Beta sezonų trukmė gali skirtis nuo vėlesnių sezonų.
				</Rule>
				<Note>
					Alpha ir Beta sezonų metu taisyklės gali būti tikslinamos. Apie
					reikšmingus pakeitimus žaidėjai bus informuojami.
				</Note>
			</RuleSection>

			<RuleSection id="komandos" number="4" title="Komandos">
				<Rule n="4.1">
					Kiekviename sezone dalyvauja trys komandos:{" "}
					<strong>geltona, žalia ir raudona</strong>.
				</Rule>
				<Rule n="4.2">
					Žaidėjas aktyvaus sezono metu gali prisijungti prie komandos. Komanda
					priskiriama atsitiktiniu būdu. Paskirtos komandos sezono metu keisti
					negalima.
				</Rule>
				<Rule n="4.3">
					Žaidėjas skirtinguose sezonuose gali būti priskirtas skirtingoms
					komandomis.
				</Rule>
			</RuleSection>

			<RuleSection id="wal-kvadratai" number="5" title="WAL kvadratai">
				<Rule n="5.1">
					WAL (Worked All Lithuania) — tai sistema, pagal kurią visa Lietuva
					suskirstyta į <strong>394 kvadratus</strong>. Kiekvienas kvadratas yra
					10′ × 10′ platumos / ilgumos dydžio langelis ir turi unikalų kodą
					(pvz.,{" "}
					<code className="rounded bg-muted px-1 font-mono text-xs">A05</code>,{" "}
					<code className="rounded bg-muted px-1 font-mono text-xs">K12</code>).
				</Rule>
				<Rule n="5.2">
					WAL kvadratų sistema yra identiška tai, kurią naudoja WAL varžybos ir
					diplomų programa.
				</Rule>
			</RuleSection>

			<RuleSection id="qso-registravimas" number="6" title="QSO registravimas">
				<Rule n="6.1">
					QSO (radijo ryšys) registruojamas žaidimo žurnalo puslapyje.
					Kiekvienas įrašas privalo turėti šiuos laukus:
				</Rule>
				<div className="ml-7 overflow-x-auto rounded-2xl border border-border">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-border border-b bg-muted/40">
								<th className="px-4 py-2.5 text-left font-semibold">Laukas</th>
								<th className="px-4 py-2.5 text-left font-semibold">
									Privalomas
								</th>
								<th className="px-4 py-2.5 text-left font-semibold">Pastaba</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{[
								["Korespondento šaukinys", "Taip", "Pvz., LY5AT, OH3JR"],
								["Data ir laikas", "Taip", "Tikslus UTC laikas"],
								["Diapazonas", "Taip", "Pvz., 40m, 20m, 80m"],
								["Moduliacija", "Taip", "CW, SSB, FT8 ir kt."],
								[
									"Operatoriaus WAL kvadratas",
									"Taip",
									"Kuriame kvadrate yra stotis",
								],
								["Korespondento WAL kvadratas", "Ne", "Jei žinomas"],
							].map(([field, req, note]) => (
								<tr key={field}>
									<td className="px-4 py-2.5 font-medium">{field}</td>
									<td className="px-4 py-2.5 text-muted-foreground">{req}</td>
									<td className="px-4 py-2.5 text-muted-foreground text-xs">
										{note}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<Rule n="6.2">
					QSO įskaitomas tik tuo atveju, kai operatorius ryšio metu yra{" "}
					<strong>Lietuvos teritorijoje</strong>. Kai kurie WAL kvadratai
					driekiasi per valstybių sieną — tokių kvadratų ryšiai įskaitomi tik
					tada, kai stotis veikia Lietuvos pusėje.
				</Rule>
				<Note>
					Pavyzdys:{" "}
					<code className="rounded bg-muted px-1 font-mono text-xs">A05</code>{" "}
					kvadratas apima ir Lietuvos, ir Latvijos teritoriją. Jei stotis veikia
					Latvijos pusėje — QSO neįskaitomas. Jei Lietuvos pusėje — įskaitomas.
				</Note>
				<Rule n="6.3">
					Korespondento WAL kvadratas yra neprivalomas. Ryšiai su užsienio
					stotimis (DX) yra leidžiami — tokiu atveju korespondento kvadrato
					lauką palikite tuščią arba įveskite{" "}
					<code className="rounded bg-muted px-1 font-mono text-xs">DX</code>.
				</Rule>
				<Rule n="6.4">
					Registruoti ryšius galima tik aktyvaus sezono metu. Pasibaigus
					sezonui, QSO įrašyti nebegalima.
				</Rule>
			</RuleSection>

			<RuleSection id="taskų-sistema" number="7" title="Taškų sistema">
				<Rule n="7.1">
					Kiekvienas QSO suteikia <strong>1 tašką</strong> žaidėjo komandai
					operatoriaus WAL kvadrate.
				</Rule>
				<Note>
					Pavyzdys: LY1JA priklauso raudonai komandai ir kvadrate{" "}
					<strong>K12</strong>
					užmezga ryšį su OH3JR 20m diapazone FT8 moduliacija. Užregistravus šį
					QSO, raudonai komandai K12 kvadrate suteikiamas 1 taškas.
				</Note>
				<Rule n="7.2">
					Taškai kaupiami sezono laikotarpiu. Ištrynus QSO, atitinkami taškai
					atimami iš komandos rezultato.
				</Rule>
				<Rule n="7.3">
					Per vieną Lietuvos kalendorinę dieną (vidurnaktis pagal Vilniaus
					laiką, UTC+2/UTC+3) įskaitomas tik <strong>vienas QSO</strong> su tuo
					pačiu korespondentu, tame pačiame diapazone, toje pačioje
					moduliacijoje, tame pačiame operatoriaus kvadrate ir tame pačiame
					korespondento kvadrate.
				</Rule>
				<Rule n="7.4">
					Pakartotinas ryšys su tuo pačiu korespondentu{" "}
					<strong>yra leidžiamas</strong> tą pačią dieną, jeigu pasikeičia bent
					viena iš šių sąlygų:
				</Rule>
				<div className="ml-7 space-y-1.5">
					{[
						"operatorius persikelia į kitą WAL kvadratą",
						"korespondentas persikelia į kitą WAL kvadratą (jei nurodytas)",
						"pasikeičia diapazonas (pvz., iš 20m į 40m)",
						"pasikeičia moduliacija (pvz., iš FT8 į SSB)",
					].map((item) => (
						<div className="flex gap-2 text-foreground/75 text-sm" key={item}>
							<span className="mt-1 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
							<span>{item}</span>
						</div>
					))}
				</div>
				<Note>
					Pavyzdys: LY1JA kvadrate <strong>K12</strong> jau padarė FT8 20m ryšį
					su LY5AT. Tą pačią dieną: dar vienas FT8 20m ryšys su LY5AT iš K12 —{" "}
					<strong>neįskaičiuojamas</strong>. Tačiau ryšys su LY5AT per CW 20m
					arba FT8 40m — <strong>įskaičiuojamas</strong>. Ryšys su LY5AT FT8
					20m, jei LY1JA persikelia į <strong>K13</strong> —{" "}
					<strong>taip pat įskaičiuojamas</strong>.
				</Note>
			</RuleSection>

			<RuleSection
				id="teritorijos-kontrole"
				number="8"
				title="Teritorijos kontrolė"
			>
				<Rule n="8.1">
					Komanda <strong>valdo kvadratą</strong>, kai turi daugiau taškų jame
					nei kitos komanda. Jeigu dviejų lyderiaujančių komandų taškų skaičius
					yra vienodas, kvadratas yra <strong>neutralus</strong>.
				</Rule>
				<Note>
					Pavyzdys: kvadrate <strong>B07</strong> — geltona komanda turi 5
					taškus, žalia — 5 taškus, raudona — 2 taškus. Kvadratas{" "}
					<strong>neutralus</strong>. Jei geltona komanda prideda dar vieną QSO
					(6 taškai), kvadratas tampa <strong>geltonas</strong>.
				</Note>
			</RuleSection>

			<RuleSection id="sezonų-pabaiga" number="9" title="Sezono pabaiga">
				<Rule n="9.1">
					Sezonui pasibaigus, fiksuojamas galutinis kvadratų pasiskirstymas.
					Nugalėjusi komanda — ta, kuri kontroliuoja{" "}
					<strong>daugiausiai kvadratų</strong> sezono pabaigos momentu.
				</Rule>
				<Rule n="9.2">
					Jei dvi ar daugiau komandų kontroliuoja vienodą skaičių kvadratų,
					nugalėtojas nustatomas pagal <strong>bendrą taškų sumą</strong>.
				</Rule>
				<Rule n="9.3">
					Galutiniai rezultatai skelbiami žaidimo svetainėje ir yra pasiekiami
					po sezono pabaigos.
				</Rule>
				<Rule n="9.4">
					Kitas sezonas prasideda su nuliniais taškais — praeito sezono
					rezultatai neperkeliami.
				</Rule>
			</RuleSection>
		</main>
	);
}
