import { createEnv } from "@t3-oss/env-core";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {},
	// biome-ignore lint/suspicious/noExplicitAny: It's ok for env typing
	runtimeEnv: (import.meta as any).env,
	emptyStringAsUndefined: true,
});
