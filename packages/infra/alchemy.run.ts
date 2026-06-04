import { RemovalPolicy, Secret, Stack, Stage, Variable } from "alchemy";
import {
	providers as cfProviders,
	Hyperdrive,
	state,
	Vite,
} from "alchemy/Cloudflare";
import { providers as drizzleProviders, Schema } from "alchemy/Drizzle";
import { Comment, providers as ghProviders } from "alchemy/GitHub";
import { interpolate } from "alchemy/Output";
import {
	PostgresBranch,
	PostgresDatabase,
	PostgresRole,
	providers as psProviders,
} from "alchemy/Planetscale";
import { Effect, Layer, Redacted } from "effect";

const prNumber = process.env.PULL_REQUEST
	? Number(process.env.PULL_REQUEST)
	: undefined;

export default Stack(
	"WAL-GO",
	{
		providers: Layer.mergeAll(
			cfProviders(),
			psProviders(),
			drizzleProviders(),
			// GitHub provider resolves credentials eagerly. Only load it when we
			// actually post a PR comment, so local runs and destroys need no token.
			...(prNumber === undefined ? [] : [ghProviders()])
		),
		state: state(),
	},
	Effect.gen(function* () {
		const stage = yield* Stage;
		const isProd = stage === "prod";

		const schema = yield* Schema("db-schema", {
			schema: "../../packages/db/src/schema/index.ts",
			out: "../../packages/db/migrations",
		});

		// The PlanetScale database is shared across all stages (same name). A
		// `destroy` on ANY stage — including a preview — would otherwise delete
		// the shared physical database and take prod data with it. `retain` makes
		// destroy drop it from state only; the database is never deleted by
		// automation. Remove it manually in the PlanetScale dashboard if needed.
		const db = yield* PostgresDatabase("db", {
			name: "wal-go",
			clusterSize: "PS_5",
			replicas: 0,
			arch: "arm",
			region: {
				slug: "eu-central",
			},
			migrationsDir: isProd ? schema.out : undefined,
		}).pipe(RemovalPolicy.retain());

		const branch = isProd
			? "main"
			: yield* PostgresBranch("db-branch", {
					database: db,
					parentBranch: "main",
					migrationsDir: schema.out,
				});

		const role = yield* PostgresRole("db-role", {
			database: db,
			branch,
			inheritedRoles: ["postgres"],
		});

		const hyperdrive = yield* Hyperdrive("hyperdrive", {
			origin: role.origin,
			originConnectionLimit: 15,
			dev: {
				scheme: "postgres",
				host: "localhost",
				port: 5432,
				database: "wal-go",
				user: "postgres",
				password: Redacted.make("postgres"),
			},
		});

		const web = yield* Vite("web", {
			rootDir: "../../apps/web",
			memo: {
				include: [
					"../../apps/web/src/**",
					"../../apps/web/public/**",
					"../../apps/web/index.html",
					"../../apps/web/vite.config.ts",
					"../../apps/web/tsconfig.json",
					"../../apps/web/package.json",
					"../../packages/*/src/**",
					"../../packages/*/package.json",
					// "../../pnpm-lock.yaml",
				],
			},
			domain: isProd ? ["walgo.lt", "www.walgo.lt"] : undefined,
			compatibility: {
				flags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
			},
			bindings: { HYPERDRIVE: hyperdrive },
			observability: {
				enabled: true,
				logs: {
					enabled: true,
					invocationLogs: true,
				},
				traces: {
					enabled: true,
				},
			},
			env: {
				CORS_ORIGIN: Variable("CORS_ORIGIN"),
				BETTER_AUTH_SECRET: Secret("BETTER_AUTH_SECRET"),
				BETTER_AUTH_URL: Variable("BETTER_AUTH_URL"),
				DATABASE_URL: role.connectionUrl,
				RESEND_API_KEY: Secret("RESEND_API_KEY"),
				// Optional: announcements are disabled when the secret is unset, so
				// only bind it when present (e.g. preview deploys may omit it).
				...(process.env.DISCORD_WEBHOOK_URL
					? { DISCORD_WEBHOOK_URL: Secret("DISCORD_WEBHOOK_URL") }
					: {}),
				VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: Variable(
					"VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"
				),
				VITE_PUBLIC_POSTHOG_HOST: Variable("VITE_PUBLIC_POSTHOG_HOST"),
			},
		});

		if (prNumber !== undefined) {
			yield* Comment("preview-url", {
				owner: "domnantas",
				repository: "wal-go",
				issueNumber: prNumber,
				body: interpolate`## Preview deployed\n\n**URL:** ${web.url}`,
			});
		}

		return { url: web.url };
	})
);
