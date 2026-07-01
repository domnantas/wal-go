import { Button } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { TEAM_DOT_CLASSES, TEAM_LABELS } from "@/domains/scoring/teams";
import { authClient } from "@/lib/auth-client";
import { DISCORD_INVITE_URL } from "@/lib/constants";
import { client, orpc } from "@/utils/orpc";

const LINK_CALLBACK_PATH = "/settings/account?discord=linked";

export function DiscordSettings() {
	const queryClient = useQueryClient();
	const statusKey = orpc.discord.status.queryOptions().queryKey;
	const { data: status, isPending } = useQuery(
		orpc.discord.status.queryOptions()
	);

	const resync = useMutation(
		orpc.discord.resync.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: statusKey });
				toast.success("Discord rolė atnaujinta");
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const unlink = useMutation({
		mutationFn: async () => {
			await client.discord.unlink();
			await authClient.unlinkAccount({ providerId: "discord" });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: statusKey });
			toast.success("Discord atsietas");
		},
		onError: (error: Error) => toast.error(error.message),
	});

	// After the OAuth redirect back from Discord, finish linking: join the guild
	// and assign the team role. Runs once, then strips the marker query param.
	const resyncMutate = resync.mutate;
	const hasHandledRedirect = useRef(false);
	useEffect(() => {
		if (hasHandledRedirect.current) {
			return;
		}
		const params = new URLSearchParams(window.location.search);
		if (params.get("discord") !== "linked") {
			return;
		}
		hasHandledRedirect.current = true;
		resyncMutate({});
		params.delete("discord");
		const query = params.toString();
		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${query ? `?${query}` : ""}`
		);
	}, [resyncMutate]);

	const handleLink = () => {
		authClient.linkSocial({
			provider: "discord",
			callbackURL: `${window.location.origin}${LINK_CALLBACK_PATH}`,
		});
	};

	const isBusy = resync.isPending || unlink.isPending;

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">Discord</h2>

			<Card>
				<CardContent className="flex flex-col gap-4">
					<p className="text-muted-foreground text-sm">
						Susiek Discord paskyrą, kad automatiškai gautum savo komandos rolę
						WAL GO serveryje.
					</p>

					{isPending && <Spinner className="size-4" />}
					{!isPending && status?.linked && (
						<LinkedState
							discordUsername={status.discordUsername}
							isBusy={isBusy}
							onResync={() => resync.mutate({})}
							onUnlink={() => unlink.mutate()}
							team={status.team}
						/>
					)}
					{!(isPending || status?.linked) && (
						<Button className="self-start" onClick={handleLink} type="button">
							Susieti Discord
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

interface LinkedStateProps {
	discordUsername: string | null;
	isBusy: boolean;
	onResync: () => void;
	onUnlink: () => void;
	team: "yellow" | "green" | "red" | null;
}

function LinkedState({
	discordUsername,
	team,
	isBusy,
	onResync,
	onUnlink,
}: LinkedStateProps) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<span className="font-medium">
					Susieta{discordUsername ? ` kaip @${discordUsername}` : ""}
				</span>
				{team ? (
					<span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5">
						<span className={`size-2 rounded-full ${TEAM_DOT_CLASSES[team]}`} />
						{TEAM_LABELS[team]}
					</span>
				) : (
					<span className="text-muted-foreground">
						Prisijunk prie sezono, kad gautum komandos rolę
					</span>
				)}
			</div>

			<p className="text-muted-foreground text-sm">
				Kad rolė atsirastų,{" "}
				<a
					className="underline"
					href={DISCORD_INVITE_URL}
					rel="noopener noreferrer"
					target="_blank"
				>
					prisijunk prie WAL GO serverio
				</a>{" "}
				ir jame atidaryk „Kanalai ir rolės" → „Susietos rolės", tada susiek WAL
				GO. Pakeitus komandą spausk „Atnaujinti".
			</p>

			<div className="flex gap-2">
				<Button
					disabled={isBusy}
					onClick={onResync}
					type="button"
					variant="outline"
				>
					Atnaujinti
				</Button>
				<Button
					disabled={isBusy}
					onClick={onUnlink}
					type="button"
					variant="ghost"
				>
					Atsieti
				</Button>
			</div>
		</div>
	);
}
