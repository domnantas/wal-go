import { AuthProvider } from "@WAL-GO/ui/components/auth/auth-provider";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

export function Providers({ children }: { children: ReactNode }) {
	const navigate = useNavigate();

	return (
		<AuthProvider
			authClient={authClient}
			Link={Link}
			navigate={navigate}
			redirectTo="/dashboard"
		>
			{children}
		</AuthProvider>
	);
}
