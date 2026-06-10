import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	getUserSubscription,
	setUserSubscription,
} from "../notifications/subscriptions";

const subscription = protectedProcedure.handler(({ context }) =>
	getUserSubscription(context.db, context.session.user.id)
);

const setSubscription = protectedProcedure
	.input(z.object({ subscribed: z.boolean() }))
	.handler(async ({ context, input }) => {
		await setUserSubscription(
			context.db,
			context.session.user.id,
			input.subscribed
		);
		return { subscribed: input.subscribed };
	});

export const newsletterRouter = {
	subscription,
	setSubscription,
};
