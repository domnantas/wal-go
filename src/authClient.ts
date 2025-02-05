import { createBetterAuthClient } from "@vxrn/better-auth";

export const {
	setAuthClientToken,
	clearAuthClientToken,
	useAuth,
	refreshAuth,
	authState,
	authClient,
} = createBetterAuthClient({ baseURL: "http://localhost:8081" });
