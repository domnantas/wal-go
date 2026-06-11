import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { Switch } from "@WAL-GO/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export function SettingsTab() {
	const queryClient = useQueryClient();
	const { data: settings, isPending: isSettingsPending } = useQuery(
		orpc.settings.maintenance.queryOptions()
	);
	const { mutate: setMaintenance, isPending: isSetMaintenancePending } =
		useMutation(
			orpc.settings.setMaintenance.mutationOptions({
				onSuccess: ({ maintenanceMode }) => {
					queryClient.setQueryData(
						orpc.settings.maintenance.queryOptions().queryKey,
						{ maintenanceMode }
					);
					toast.success(
						maintenanceMode
							? "Techninės priežiūros režimas įjungtas"
							: "Techninės priežiūros režimas išjungtas"
					);
				},
				onError: (error) => toast.error(error.message),
			})
		);

	if (isSettingsPending) {
		return (
			<div className="flex justify-center py-10">
				<Spinner className="size-8" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-start justify-between gap-4 rounded-4xl border border-border bg-card p-5">
				<div className="flex flex-col gap-1">
					<Label className="font-semibold text-base" htmlFor="maintenance-mode">
						Techninės priežiūros režimas
					</Label>
					<p className="text-muted-foreground text-sm">
						Įjungus, visiems lankytojams (išskyrus administratorius) rodomas
						techninės priežiūros puslapis.
					</p>
				</div>
				<Switch
					checked={settings?.maintenanceMode ?? false}
					disabled={isSetMaintenancePending}
					id="maintenance-mode"
					onCheckedChange={(checked) =>
						setMaintenance({ maintenanceMode: checked })
					}
				/>
			</div>
		</div>
	);
}
