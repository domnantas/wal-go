import { Button } from "@WAL-GO/ui/components/button";
import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";

export function CookieBanner() {
	const posthog = usePostHog();
	const [consentStatus, setConsentStatus] = useState<
		"granted" | "denied" | "pending" | null
	>(null);

	useEffect(() => {
		setConsentStatus(posthog.get_explicit_consent_status());
	}, [posthog]);

	console.log(consentStatus);

	if (consentStatus !== "pending") {
		return null;
	}

	const handleAccept = () => {
		posthog.opt_in_capturing();
		setConsentStatus("granted");
	};

	const handleDecline = () => {
		posthog.opt_out_capturing();
		setConsentStatus("denied");
	};

	return (
		<div className="fixed right-4 bottom-4 left-4 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-background p-4 shadow-lg sm:left-auto sm:w-full">
			<p className="mb-3 text-muted-foreground text-sm">
				Naudojame slapukus (angl. cookies), kad geriau suprastume kaip naudojate
				puslapį. <b>Nerenkame</b> duomenų rinkodarai, reklamai ir neparduodame
				jūsų duomenų nes mums rūpi jūsų privatumas 💛
			</p>
			<div className="flex justify-end gap-2">
				<Button onClick={handleDecline} size="sm" variant="outline">
					Atsisakyti
				</Button>
				<Button onClick={handleAccept} size="sm">
					Sutinku
				</Button>
			</div>
		</div>
	);
}
