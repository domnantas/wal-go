import { APP_CONFIG_ID, appConfig } from "@WAL-GO/db/schema/app-config";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, publicProcedure } from "../index";

const getMaintenance = publicProcedure.handler(async ({ context }) => {
	const rows = await context.db
		.select({ maintenanceMode: appConfig.maintenanceMode })
		.from(appConfig)
		.where(eq(appConfig.id, APP_CONFIG_ID))
		.limit(1);
	return { maintenanceMode: rows[0]?.maintenanceMode ?? false };
});

const setMaintenance = adminProcedure
	.input(z.object({ maintenanceMode: z.boolean() }))
	.handler(async ({ context, input }) => {
		await context.db
			.insert(appConfig)
			.values({ id: APP_CONFIG_ID, maintenanceMode: input.maintenanceMode })
			.onConflictDoUpdate({
				target: appConfig.id,
				set: { maintenanceMode: input.maintenanceMode },
			});
		return { maintenanceMode: input.maintenanceMode };
	});

export const settingsRouter = {
	maintenance: getMaintenance,
	setMaintenance,
};
