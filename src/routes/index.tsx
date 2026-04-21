import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: MapPage });

function MapPage() {
	return (
		<div className="flex h-full w-full overflow-hidden">
			<div className="flex-1 relative overflow-hidden bg-sea grid place-items-center text-brown3 text-sm">
				<div className="text-center">
					<div className="text-5xl mb-3">🗺️</div>
					<div className="font-serif text-lg font-bold mb-1.5 text-brown2">
						Lietuvos WAL žemėlapis
					</div>
					<div>MapLibre + WAL kvadratai</div>
				</div>
				<div className="absolute bottom-5 left-5 bg-white rounded-lg p-3 shadow-card border border-border text-xs">
					<h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-brown3 mb-2">
						Komandos
					</h4>
					<div className="flex items-center gap-[7px] mb-1 text-xs font-medium text-brown2">
						<div className="w-3.5 h-3.5 rounded-sm shrink-0 bg-yellow" />
						Geltona
					</div>
					<div className="flex items-center gap-[7px] mb-1 text-xs font-medium text-brown2">
						<div className="w-3.5 h-3.5 rounded-sm shrink-0 bg-green" />
						Žalia
					</div>
					<div className="flex items-center gap-[7px] mb-1 text-xs font-medium text-brown2">
						<div className="w-3.5 h-3.5 rounded-sm shrink-0 bg-red" />
						Raudona
					</div>
					<div className="flex items-center gap-[7px] text-xs font-medium text-brown2">
						<div className="w-3.5 h-3.5 rounded-sm shrink-0 bg-land" />
						Nė viena
					</div>
				</div>
			</div>
			<aside className="w-[300px] shrink-0 bg-white border-l border-border overflow-y-auto flex flex-col">
				<div className="px-[18px] pt-[18px] pb-3.5 border-b border-border">
					<h3 className="font-serif text-base font-bold mb-0.5">
						WAL kvadratas
					</h3>
					<p className="text-xs text-brown3">
						Pasirinkite kvadratą žemėlapyje
					</p>
				</div>
				<div className="mx-[18px] my-3.5 bg-cream2 rounded-lg p-3.5 border border-border">
					<div className="text-[13px] font-bold mb-1.5 text-brown">
						2025 sezonas
					</div>
					<div className="text-xs text-brown3 mb-2.5">
						2025-04-01 – 2025-08-31
					</div>
					<div className="h-1.5 bg-cream3 rounded-sm overflow-hidden mb-1.5">
						<div
							className="h-full bg-gradient-to-r from-yellow to-green rounded-sm"
							style={{ width: "40%" }}
						/>
					</div>
					<div className="text-[11px] text-brown3 text-right">
						40% praėjo
					</div>
				</div>
				<div className="px-[18px] py-8 text-center text-brown3 text-[13px] leading-relaxed">
					<div className="text-[32px] mb-2">📡</div>
					Pasirinkite WAL kvadratą, kad pamatytumėte taškus ir komandų
					pasiskirstymą
				</div>
			</aside>
		</div>
	);
}
