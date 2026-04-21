import { AuthProvider } from "@WAL-GO/ui/components/auth/auth-provider";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTheme } from "tanstack-theme-kit";

import { authClient } from "@/lib/auth-client";

export function Providers({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();

	return (
		<AuthProvider
			appearance={{ setTheme, theme }}
			authClient={authClient}
			Link={Link}
			navigate={navigate}
			redirectTo="/dashboard"
		>
			{children}
		</AuthProvider>
	);
}
