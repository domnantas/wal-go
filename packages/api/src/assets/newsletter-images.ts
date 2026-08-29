// Stores newsletter images in the public R2 bucket (`ASSETS_BUCKET`, see infra
// alchemy.run.ts) and returns the public URL embedded in the email. Recipients
// fetch the image fresh on every open, so objects use immutable keys and are
// never overwritten or deleted — a sent newsletter must keep working forever.

import { ORPCError } from "@orpc/server";

import { getAssetsBucket, PUBLIC_ASSETS_BASE_URL } from "./bucket";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"image/gif": "gif",
};

export async function uploadNewsletterImage(file: File): Promise<string> {
	const extension = EXTENSION_BY_TYPE[file.type];
	if (!extension) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Netinkamas paveikslėlio formatas (PNG, JPG, WEBP arba GIF)",
		});
	}
	if (file.size > MAX_IMAGE_BYTES) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Paveikslėlis per didelis (daugiausia 5 MB)",
		});
	}

	const bucket = await getAssetsBucket();
	if (!bucket) {
		throw new ORPCError("SERVICE_UNAVAILABLE", {
			message: "Paveikslėlių saugykla nepasiekiama",
		});
	}

	const key = `newsletter/${crypto.randomUUID()}.${extension}`;
	await bucket.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	return `${PUBLIC_ASSETS_BASE_URL}/${key}`;
}
