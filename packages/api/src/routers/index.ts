import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { discordRouter } from "./discord";
import { newsletterRouter } from "./newsletter";
import { qsosRouter } from "./qsos";
import { scoringRouter } from "./scoring";
import { seasonsRouter } from "./seasons";
import { settingsRouter } from "./settings";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	privateData: protectedProcedure.handler(({ context }) => ({
		message: "This is private",
		user: context.session?.user,
	})),
	admin: adminRouter,
	discord: discordRouter,
	newsletter: newsletterRouter,
	qsos: qsosRouter,
	scoring: scoringRouter,
	seasons: seasonsRouter,
	settings: settingsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
