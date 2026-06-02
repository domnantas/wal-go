import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/test")({
	component: TestComponent,
});

// Standalone experiment page. No shared components — everything inline so it is
// trivial to delete. Renders above the global header via a high z-index.
function TestComponent() {
	const paragraphs = Array.from({ length: 40 }, (_, index) => index);

	return (
		<div>
			<header className="sticky top-0 z-60 border-black/10 border-b bg-[rgba(120,80,40,0.4)] pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
				<div className="flex h-14 items-center pl-4 font-bold">TEST HEADER</div>
			</header>

			<main className="p-4">
				{paragraphs.map((index) => (
					<p className="mb-6 text-lg" key={index}>
						{index} — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
						Vivamus luctus urna sed urna ultricies ac tempor dui sagittis. In
						condimentum facilisis porta. Sed nec diam eu diam mattis viverra.
					</p>
				))}
			</main>
		</div>
	);
}
