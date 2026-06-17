import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const INGEST_PREFIX = /^\/ingest/;

export default defineConfig(({ command, mode }) => {
	// Plain `vite dev` (pnpm dev:bare) runs the SSR handler in this Node process,
	// which doesn't read .env on its own. Alchemy normally supplies these as
	// Worker bindings; without it the server code (auth, db) sees empty
	// process.env and throws. Load every var from .env into process.env so local
	// dev works without alchemy.
	if (command === "serve") {
		Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
	}

	return {
		server: {
			port: 3001,
			proxy: {
				"/ingest/static": {
					target: "https://eu-assets.i.posthog.com",
					changeOrigin: true,
					rewrite: (path) => path.replace(INGEST_PREFIX, ""),
				},
				"/ingest/array": {
					target: "https://eu-assets.i.posthog.com",
					changeOrigin: true,
					rewrite: (path) => path.replace(INGEST_PREFIX, ""),
				},
				"/ingest": {
					target: "https://eu.i.posthog.com",
					changeOrigin: true,
					rewrite: (path) => path.replace(INGEST_PREFIX, ""),
				},
			},
		},
		resolve: {
			tsconfigPaths: true,
			dedupe: ["react", "react-dom"],
		},
		optimizeDeps: {
			exclude: ["cloudflare:workers"],
		},
		plugins: [tailwindcss(), tanstackStart(), viteReact()],
	};
});
