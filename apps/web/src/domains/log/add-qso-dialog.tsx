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
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import {
	BAND_OPTIONS,
	DATE_TIME_INPUT_FORMAT,
	MODE_OPTIONS,
	QsoForm,
	type QsoFormPayload,
} from "./qso-form";

const LAST_BAND_KEY = "qso-last-band";
const LAST_MODE_KEY = "qso-last-mode";

function getDefaultValues() {
	const lastBand = localStorage.getItem(LAST_BAND_KEY);
	const lastMode = localStorage.getItem(LAST_MODE_KEY);
	return {
		contactCallsign: "",
		band: (BAND_OPTIONS.includes(lastBand as (typeof BAND_OPTIONS)[number])
			? lastBand
			: "20m") as (typeof BAND_OPTIONS)[number],
		mode: (MODE_OPTIONS.includes(lastMode as (typeof MODE_OPTIONS)[number])
			? lastMode
			: "SSB") as (typeof MODE_OPTIONS)[number],
		qsoAt: format(new Date(), DATE_TIME_INPUT_FORMAT),
		operatorSquare: "",
		contactSquare: "",
	};
}

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
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Pridėti QSO</DialogTitle>
					<DialogDescription>Įveskite ryšį aktyviame sezone</DialogDescription>
				</DialogHeader>
				<QsoForm
					defaultValues={getDefaultValues()}
					enableCallsignSpaceNavigation
					formError={formError}
					geolocation
					isPending={createQso.isPending}
					onBandChange={(band) => localStorage.setItem(LAST_BAND_KEY, band)}
					onClearError={() => setFormError(null)}
					onModeChange={(mode) => localStorage.setItem(LAST_MODE_KEY, mode)}
					onSubmit={handleSubmit}
					submitLabel="Išsaugoti QSO"
				/>
			</DialogContent>
		</Dialog>
	);
}
