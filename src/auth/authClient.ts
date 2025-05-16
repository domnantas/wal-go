// import { createBetterAuthClient } from "@vxrn/better-auth";
// Temporary override for the loading fix
import { createBetterAuthClient } from "./betterAuth";

export const {
	setAuthClientToken,
	clearAuthClientToken,
	useAuth,
	refreshAuth,
	authState,
	authClient,
} = createBetterAuthClient({ baseURL: "http://localhost:8081" });
