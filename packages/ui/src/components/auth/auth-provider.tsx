import {
	AuthProvider as AuthProviderPrimitive,
	type AuthProviderProps,
} from "@better-auth-ui/react";

import { ErrorToaster } from "./error-toaster";

export function AuthProvider({ children, ...config }: AuthProviderProps) {
	return (
		<AuthProviderPrimitive {...config}>
			{children}

			<ErrorToaster />
		</AuthProviderPrimitive>
	);
}
