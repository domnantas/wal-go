import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth";

export function Providers({ children }: { children: ReactNode }) {
	const navigate = useNavigate();

	return (
		<AuthProvider
			authClient={authClient}
			navigate={navigate}
			Link={Link}
			redirectTo="/"
			emailAndPassword={{ requireEmailVerification: true }}
		>
			{children}
			<Toaster />
		</AuthProvider>
	);
}
