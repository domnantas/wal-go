import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { qsosRouter } from "./qsos";
import { scoringRouter } from "./scoring";
import { seasonsRouter } from "./seasons";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	privateData: protectedProcedure.handler(({ context }) => ({
		message: "This is private",
		user: context.session?.user,
	})),
	qsos: qsosRouter,
	scoring: scoringRouter,
	seasons: seasonsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
