import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { Switch } from "@WAL-GO/ui/components/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export function NewsletterSettings() {
	const queryClient = useQueryClient();
	const subscriptionKey = orpc.newsletter.subscription.queryOptions().queryKey;
	const { data: subscription, isPending } = useQuery(
		orpc.newsletter.subscription.queryOptions()
	);

	const setSubscription = useMutation(
		orpc.newsletter.setSubscription.mutationOptions({
			onSuccess: ({ subscribed }) => {
				queryClient.setQueryData(subscriptionKey, (old) =>
					old ? { ...old, subscribed } : old
				);
				toast.success(
					subscribed
						? "Užsiprenumeravote naujienlaiškį"
						: "Atsisakėte naujienlaiškio"
				);
			},
			onError: (error) => toast.error(error.message),
		})
	);

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">Naujienlaiškis</h2>

			<Card>
				<CardContent>
					<Label
						className="flex items-center justify-between gap-4 font-normal"
						htmlFor="newsletter-subscription"
					>
						<span className="flex flex-col gap-1">
							<span className="font-medium text-sm">Gauti naujienlaiškį</span>
							<span className="text-muted-foreground text-sm">
								Retkarčiais atsiųsime naujienas apie WAL GO. Atsisakyti galite
								bet kada.
							</span>
						</span>
						{isPending ? (
							<Spinner className="size-4" />
						) : (
							<Switch
								checked={subscription?.subscribed ?? false}
								disabled={setSubscription.isPending}
								id="newsletter-subscription"
								onCheckedChange={(checked) =>
									setSubscription.mutate({ subscribed: checked })
								}
							/>
						)}
					</Label>
				</CardContent>
			</Card>
		</div>
	);
}
