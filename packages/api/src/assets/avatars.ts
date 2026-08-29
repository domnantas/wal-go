// Stores operator avatars in the public R2 bucket (`ASSETS_BUCKET`, see infra
// alchemy.run.ts). Unlike newsletter images, avatars are mutable: each upload
// writes a new key (so caches never serve a stale face) and the previous object
// is deleted once `user.image` no longer points at it.

import { ORPCError } from "@orpc/server";

import { getAssetsBucket, PUBLIC_ASSETS_BASE_URL } from "./bucket";

// The client resizes to 256px before upload; this guards direct API clients.
const MAX_AVATAR_BYTES = 512 * 1024;
const AVATAR_CACHE_CONTROL = "public, max-age=300";

const EXTENSION_BY_TYPE: Record<string, string> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
};

const avatarKeyPrefix = (userId: string) => `avatars/${userId}/`;

const hasBytes = (bytes: Uint8Array, signature: readonly number[]) =>
	signature.every((byte, index) => bytes[index] === byte);

export function hasValidAvatarSignature(
	contentType: string,
	bytes: Uint8Array
): boolean {
	switch (contentType) {
		case "image/png":
			return hasBytes(bytes, [137, 80, 78, 71, 13, 10, 26, 10]);
		case "image/jpeg":
			return hasBytes(bytes, [255, 216, 255]);
		case "image/webp":
			return (
				hasBytes(bytes, [82, 73, 70, 70]) &&
				hasBytes(bytes.subarray(8), [87, 69, 66, 80])
			);
		default:
			return false;
	}
}

export async function uploadAvatar(
	userId: string,
	file: File
): Promise<string> {
	const extension = EXTENSION_BY_TYPE[file.type];
	if (!extension) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Netinkamas paveikslėlio formatas (PNG, JPG arba WEBP)",
		});
	}
	if (file.size > MAX_AVATAR_BYTES) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Paveikslėlis per didelis (daugiausia 512 KiB)",
		});
	}

	const contents = await file.arrayBuffer();
	if (!hasValidAvatarSignature(file.type, new Uint8Array(contents))) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Failo turinys neatitinka paveikslėlio formato",
		});
	}

	const bucket = await getAssetsBucket();
	if (!bucket) {
		throw new ORPCError("SERVICE_UNAVAILABLE", {
			message: "Paveikslėlių saugykla nepasiekiama",
		});
	}

	const key = `${avatarKeyPrefix(userId)}${crypto.randomUUID()}.${extension}`;
	await bucket.put(key, contents, {
		httpMetadata: {
			cacheControl: AVATAR_CACHE_CONTROL,
			contentType: file.type,
		},
	});

	return `${PUBLIC_ASSETS_BASE_URL}/${key}`;
}

// Deletes only objects under the caller's own avatar prefix, so a forged URL
// cannot reach another operator's avatar or a newsletter image.
export async function deleteAvatar(userId: string, url: string): Promise<void> {
	const prefix = `${PUBLIC_ASSETS_BASE_URL}/${avatarKeyPrefix(userId)}`;
	if (!url.startsWith(prefix)) {
		return;
	}

	const bucket = await getAssetsBucket();
	if (!bucket) {
		throw new ORPCError("SERVICE_UNAVAILABLE", {
			message: "Paveikslėlių saugykla nepasiekiama",
		});
	}

	await bucket.delete(url.slice(`${PUBLIC_ASSETS_BASE_URL}/`.length));
}
