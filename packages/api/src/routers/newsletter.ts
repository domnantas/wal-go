import { z } from "zod";

import { protectedProcedure } from "../index";
import {
	getUserSubscription,
	setUserSubscription,
} from "../notifications/contacts";

const subscription = protectedProcedure.handler(({ context }) =>
	getUserSubscription(context.session.user.email)
);

const setSubscription = protectedProcedure
	.input(z.object({ subscribed: z.boolean() }))
	.handler(async ({ context, input }) => {
		await setUserSubscription(
			{
				email: context.session.user.email,
				name: context.session.user.name,
			},
			input.subscribed
		);
		return { subscribed: input.subscribed };
	});

export const newsletterRouter = {
	subscription,
	setSubscription,
};
