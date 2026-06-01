import { Button } from "@WAL-GO/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@WAL-GO/ui/components/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import { getEmptyQsoForm, QsoForm, type QsoFormPayload } from "./qso-form";

export function AddQsoDialog({ disabled = false }: { disabled?: boolean }) {
	const queryClient = useQueryClient();
	const posthog = usePostHog();
	const [open, setOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const createQso = useMutation(
		orpc.qsos.create.mutationOptions({
			onSuccess: (_, variables) => {
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.list.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.stats.queryOptions().queryKey,
				});
				posthog.capture("qso_created", {
					band: variables.band,
					mode: variables.mode,
					has_contact_square: variables.contactSquare !== null,
				});
				setFormError(null);
				setOpen(false);
				toast.success("QSO išsaugotas");
			},
			onError: (error) => {
				setFormError(error.message);
			},
		})
	);

	function handleSubmit(payload: QsoFormPayload) {
		createQso.mutate(payload);
	}

	return (
		<Dialog
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) {
					setFormError(null);
				}
			}}
			open={open}
		>
			<DialogTrigger render={<Button disabled={disabled} />}>
				<Plus />
				Pridėti QSO
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Pridėti QSO</DialogTitle>
					<DialogDescription>
						Įveskite ryšį aktyviam sezonui. Korespondento kvadratas
						neprivalomas.
					</DialogDescription>
				</DialogHeader>
				<QsoForm
					defaultValues={getEmptyQsoForm()}
					formError={formError}
					geolocation
					isPending={createQso.isPending}
					onClearError={() => setFormError(null)}
					onSubmit={handleSubmit}
					submitLabel="Išsaugoti QSO"
				/>
			</DialogContent>
		</Dialog>
	);
}
