import { Button } from "@WAL-GO/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import walGoLogo from "@/assets/wal-go-logo-transparent.png";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<main className="flex flex-col">
			<section className="container mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-16 text-center md:py-24">
				<img
					alt="WAL GO logotipas. Gandras, ąžuolo lapai, saulė aplink tekstą WAL GO"
					className="h-52 w-auto md:h-72"
					src={walGoLogo}
				/>

				<div className="flex max-w-2xl flex-col gap-4">
					<h1 className="font-bold font-serif text-4xl md:text-6xl">
						Atrask <span className="text-olive">Lietuvą</span> per{" "}
						<span className="text-rust">radijo bangas</span>
					</h1>
					<p className="text-lg text-muted-foreground md:text-xl">
						<b>WAL GO</b> yra žaidimas, kuriame <b>radijo mėgėjai</b> varžosi
						dėl teritorijos užmegzdami radijo ryšius visoje <b>Lietuvoje</b>.
					</p>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Button className="px-6" render={<Link to="/dashboard" />} size="lg">
						Pradėti
					</Button>
					<Button
						className="px-6"
						render={<Link to="/dashboard" />}
						size="lg"
						variant="outline"
					>
						Sužinoti daugiau
					</Button>
				</div>
			</section>
		</main>
	);
}
