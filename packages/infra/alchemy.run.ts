import {
	AlchemyContext,
	RemovalPolicy,
	Secret,
	Stack,
	Stage,
	Variable,
} from "alchemy";
import {
	providers as cfProviders,
	Hyperdrive,
	R2Bucket,
	SendEmail,
	state,
	Vite,
} from "alchemy/Cloudflare";
import { providers as drizzleProviders, Schema } from "alchemy/Drizzle";
import { Comment, CommentProvider } from "alchemy/GitHub";
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
			// CommentProvider reads GITHUB_TOKEN lazily at reconcile/delete time,
			// not at layer init — so it's always safe to include. CI supplies the
			// token via env; local deploy/destroy without a token never fails at
			// build (the only GitHub resource used is the PR Comment below).
			CommentProvider()
		),
		state: state(),
	},
	Effect.gen(function* () {
		const stage = yield* Stage;
		const isProd = stage === "prod";
		const { dev: isDev } = yield* AlchemyContext;

		const databaseName = "wal-go";

		const role = yield* Effect.gen(function* () {
			if (isDev) {
				return {
					origin: {
						scheme: "postgres" as const,
						host: "localhost",
						port: 5432,
						database: "wal-go",
						user: "postgres",
						password: Redacted.make("postgres"),
					},
					connectionUrl: Redacted.make(
						"postgres://postgres:postgres@localhost:5432/wal-go"
					),
				};
			}

			const schema = yield* Schema("db-schema", {
				schema: "../../packages/db/src/schema/index.ts",
				out: "../../packages/db/migrations",
			});

			// The physical PlanetScale database (`wal-go`) is shared by every stage,
			// and PlanetScale databases carry no ownership tags — so Alchemy treats
			// the `db` resource as "owned" in EVERY stage. Without this guard a
			// `destroy` on any stage (including a preview PR) issues a PlanetScale
			// DELETE database and takes prod data with it (this happened once).
			// `retain` makes destroy drop the resource from state only; the database
			// is never deleted by automation. Delete it manually in the dashboard if
			// ever actually needed. The per-PR `db-branch` below keeps the default
			// `destroy` policy on purpose — only the shared database is protected.
			const db = yield* PostgresDatabase("db", {
				name: databaseName,
				clusterSize: "PS_5",
				replicas: 0,
				arch: "arm",
				region: {
					slug: "eu-central",
				},
				migrationsDir: isProd ? schema.out : undefined,
			}).pipe(RemovalPolicy.retain(true));

			const branch = isProd
				? "main"
				: yield* PostgresBranch("db-branch", {
						database: db,
						parentBranch: "main",
						migrationsDir: schema.out,
					});

			return yield* PostgresRole("db-role", {
				database: databaseName,
				branch,
				inheritedRoles: ["postgres"],
			});
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

		// `send_email` bindings aren't supported in `alchemy dev`'s local mode —
		// binding it would crash worker creation. `sendEmail()` already logs and
		// skips when the binding is absent, so just omit it in dev.
		const email = isDev
			? undefined
			: yield* SendEmail("EMAIL", {
					allowedSenderAddresses: ["noreply@walgo.lt", "admin@walgo.lt"],
				});

		// Public bucket for newsletter images. Served from a custom domain so the
		// URLs embedded in already-sent emails stay valid forever (recipients fetch
		// the image fresh on every open). Keys are immutable, so objects are never
		// overwritten or deleted. The public domain is attached in prod only;
		// preview deploys share the same bucket binding without a domain.
		const newsletterAssets = yield* R2Bucket("newsletter-assets", {
			name: "walgo-newsletter-assets",
			domains: isProd ? [{ name: "assets.walgo.lt", enabled: true }] : [],
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
					"../../pnpm-lock.yaml",
				],
			},
			domain: isProd ? ["walgo.lt", "www.walgo.lt"] : undefined,
			compatibility: {
				flags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
			},
			bindings: {
				HYPERDRIVE: hyperdrive,
				...(email ? { EMAIL: email } : {}),
				ASSETS_BUCKET: newsletterAssets,
			},
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
				...(isProd
					? {
							CORS_ORIGIN: Variable("CORS_ORIGIN"),
							BETTER_AUTH_URL: Variable("BETTER_AUTH_URL"),
						}
					: {}),
				BETTER_AUTH_SECRET: Secret("BETTER_AUTH_SECRET"),
				DATABASE_URL: role.connectionUrl,
				// Optional: announcements are disabled when the secret is unset, so
				// only bind it when present (e.g. preview deploys may omit it).
				...(process.env.DISCORD_WEBHOOK_URL
					? { DISCORD_WEBHOOK_URL: Secret("DISCORD_WEBHOOK_URL") }
					: {}),
				// Optional: PostHog is disabled client-side when the token is unset,
				// so only bind it when present (e.g. local dev may omit it).
				...(process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
					? {
							VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: Variable(
								"VITE_PUBLIC_POSTHOG_PROJECT_TOKEN"
							),
							VITE_PUBLIC_POSTHOG_HOST: Variable("VITE_PUBLIC_POSTHOG_HOST"),
						}
					: {}),
			},
		});

		if (prNumber !== undefined && process.env.CI) {
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
