import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth } from "@better-auth-ui/react";
import { DeleteUser } from "./delete-user";

export interface DangerZoneProps {
	className?: string;
}

export function DangerZone({ className }: DangerZoneProps) {
	const { localization } = useAuth();

	return (
		<div className={cn(className)}>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.dangerZone}
			</h2>

			<DeleteUser />
		</div>
	);
}
