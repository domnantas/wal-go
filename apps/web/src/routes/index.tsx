import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<h1 className="container mx-auto max-w-3xl px-4 py-2 font-bold text-9xl">
			WAL GO
		</h1>
	);
}
