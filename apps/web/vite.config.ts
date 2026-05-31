import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const INGEST_PREFIX = /^\/ingest/;

export default defineConfig({
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
	},
	optimizeDeps: {
		exclude: ["cloudflare:workers"],
	},
	plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
