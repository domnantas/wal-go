import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@WAL-GO/ui/components/chart";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { formatInVilnius } from "@/lib/date";
import { orpc } from "@/utils/orpc";
import { TEAMS } from "./team";

const chartConfig = {
	yellow: { label: "Geltona", color: "var(--brand-golden)" },
	green: { label: "Žalia", color: "var(--brand-olive)" },
	red: { label: "Raudona", color: "var(--brand-rust)" },
} satisfies ChartConfig;

interface ControlTimelineChartProps {
	seasonId: number | null;
}

export function ControlTimelineChart({ seasonId }: ControlTimelineChartProps) {
	const { data: timeline } = useQuery({
		...orpc.scoring.controlTimeline.queryOptions({
			input: { seasonId: seasonId ?? undefined },
		}),
		enabled: seasonId !== null,
	});

	const points = (timeline ?? []).map((point) => ({
		t: point.at.getTime(),
		yellow: point.yellow,
		green: point.green,
		red: point.red,
	}));

	if (points.length < 2) {
		return null;
	}

	return (
		<section>
			<h2 className="mb-3 font-bold font-serif text-xl">
				Kvadratų kontrolė laike
			</h2>
			<div className="rounded-4xl border border-border bg-card p-4">
				<ChartContainer className="h-72 w-full" config={chartConfig}>
					<LineChart data={points} margin={{ left: 4, right: 12, top: 8 }}>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="t"
							domain={["dataMin", "dataMax"]}
							scale="time"
							tickFormatter={(value: number) => formatInVilnius(value, "MM-dd")}
							tickLine={false}
							tickMargin={8}
							type="number"
						/>
						<YAxis
							allowDecimals={false}
							tickLine={false}
							tickMargin={8}
							width={28}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) =>
										formatInVilnius(
											payload?.[0]?.payload.t ?? 0,
											"yyyy-MM-dd HH:mm"
										)
									}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						{TEAMS.map((team) => (
							<Line
								dataKey={team}
								dot={false}
								key={team}
								stroke={`var(--color-${team})`}
								strokeWidth={2}
								type="stepAfter"
							/>
						))}
					</LineChart>
				</ChartContainer>
			</div>
		</section>
	);
}
