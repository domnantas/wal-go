import { Button } from "@WAL-GO/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@WAL-GO/ui/components/dialog";
import { usePostHog } from "@posthog/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";
import {
	type EditableQso,
	QsoForm,
	type QsoFormPayload,
	qsoToFormValues,
} from "./qso-form";

export function EditQsoDialog({
	disabled = false,
	qso,
	rejectsSameSquare = false,
	requiresContactSquare = false,
}: {
	disabled?: boolean;
	qso: EditableQso;
	rejectsSameSquare?: boolean;
	requiresContactSquare?: boolean;
}) {
	const queryClient = useQueryClient();
	const posthog = usePostHog();
	const [open, setOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const defaultValues = useMemo(() => qsoToFormValues(qso), [qso]);
	const updateQso = useMutation(
		orpc.qsos.update.mutationOptions({
			onSuccess: (_, variables) => {
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.list.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: orpc.qsos.stats.queryOptions().queryKey,
				});
				posthog.capture("qso_updated", {
					band: variables.band,
					mode: variables.mode,
					has_contact_square: variables.contactSquare !== null,
				});
				setFormError(null);
				setOpen(false);
				toast.success("QSO atnaujintas");
			},
			onError: (error) => {
				setFormError(error.message);
			},
		})
	);

	function handleSubmit(payload: QsoFormPayload) {
		updateQso.mutate({ ...payload, id: qso.id });
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
			<DialogTrigger
				render={
					<Button
						aria-label="Redaguoti QSO"
						disabled={disabled}
						size="icon-sm"
						variant="ghost"
					/>
				}
			>
				<Pencil />
			</DialogTrigger>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Redaguoti QSO</DialogTitle>
					<DialogDescription>Pakeiskite ryšio duomenis</DialogDescription>
				</DialogHeader>
				<QsoForm
					defaultValues={defaultValues}
					formError={formError}
					isPending={updateQso.isPending}
					onClearError={() => setFormError(null)}
					onSubmit={handleSubmit}
					rejectsSameSquare={rejectsSameSquare}
					requiresContactSquare={requiresContactSquare}
					submitLabel="Atnaujinti QSO"
				/>
			</DialogContent>
		</Dialog>
	);
}
