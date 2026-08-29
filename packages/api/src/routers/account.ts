import { z } from "zod";

import { deleteAvatar, uploadAvatar } from "../assets/avatars";
import { protectedProcedure } from "../index";
import { checkRateLimit } from "../rate-limit";

const AVATAR_UPLOADS_PER_HOUR = 10;

const uploadAvatarEndpoint = protectedProcedure
	.input(z.object({ image: z.instanceof(File) }))
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id;
		await checkRateLimit(
			context.db,
			`avatar:upload:${userId}`,
			AVATAR_UPLOADS_PER_HOUR,
			60 * 60
		);

		return uploadAvatar(userId, input.image);
	});

const deleteAvatarEndpoint = protectedProcedure
	.input(z.object({ url: z.url() }))
	.handler(async ({ context, input }) => {
		await deleteAvatar(context.session.user.id, input.url);
	});

export const accountRouter = {
	avatar: {
		upload: uploadAvatarEndpoint,
		delete: deleteAvatarEndpoint,
	},
};
