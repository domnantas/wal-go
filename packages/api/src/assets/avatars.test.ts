import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAssetsBucket } = vi.hoisted(() => ({
	getAssetsBucket: vi.fn(),
}));

vi.mock("./bucket", () => ({
	getAssetsBucket,
	PUBLIC_ASSETS_BASE_URL: "https://assets.walgo.lt",
}));

import { deleteAvatar, hasValidAvatarSignature, uploadAvatar } from "./avatars";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const AVATAR_URL_PATTERN =
	/^https:\/\/assets\.walgo\.lt\/avatars\/user-1\/.+\.png$/;
const AVATAR_KEY_PATTERN = /^avatars\/user-1\/.+\.png$/;

describe("avatar assets", () => {
	beforeEach(() => {
		getAssetsBucket.mockReset();
	});

	it("recognizes supported image signatures", () => {
		expect(hasValidAvatarSignature("image/png", PNG_SIGNATURE)).toBe(true);
		expect(
			hasValidAvatarSignature(
				"image/jpeg",
				new Uint8Array([255, 216, 255, 224])
			)
		).toBe(true);
		expect(
			hasValidAvatarSignature(
				"image/webp",
				new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])
			)
		).toBe(true);
	});

	it("rejects content that does not match its declared type", async () => {
		const file = new File(["not an image"], "avatar.png", {
			type: "image/png",
		});

		await expect(uploadAvatar("user-1", file)).rejects.toThrow(
			"Failo turinys neatitinka paveikslėlio formato"
		);
		expect(getAssetsBucket).not.toHaveBeenCalled();
	});

	it("rejects files larger than the post-resize limit", async () => {
		const oversizedImage = new Uint8Array(512 * 1024 + 1);
		oversizedImage.set(PNG_SIGNATURE);
		const file = new File([oversizedImage], "avatar.png", {
			type: "image/png",
		});

		await expect(uploadAvatar("user-1", file)).rejects.toThrow(
			"Paveikslėlis per didelis (daugiausia 512 KiB)"
		);
		expect(getAssetsBucket).not.toHaveBeenCalled();
	});

	it("stores a validated avatar with bounded caching", async () => {
		const put = vi.fn().mockResolvedValue(undefined);
		getAssetsBucket.mockResolvedValue({ delete: vi.fn(), put });
		const file = new File([PNG_SIGNATURE], "avatar.png", {
			type: "image/png",
		});

		const url = await uploadAvatar("user-1", file);

		expect(url).toMatch(AVATAR_URL_PATTERN);
		expect(put).toHaveBeenCalledWith(
			expect.stringMatching(AVATAR_KEY_PATTERN),
			expect.any(ArrayBuffer),
			{
				httpMetadata: {
					cacheControl: "public, max-age=300",
					contentType: "image/png",
				},
			}
		);
	});

	it("never deletes an object outside the user's prefix", async () => {
		await deleteAvatar(
			"user-1",
			"https://assets.walgo.lt/avatars/user-2/avatar.webp"
		);

		expect(getAssetsBucket).not.toHaveBeenCalled();
	});

	it("reports unavailable storage when deleting an owned avatar", async () => {
		getAssetsBucket.mockResolvedValue(undefined);

		await expect(
			deleteAvatar(
				"user-1",
				"https://assets.walgo.lt/avatars/user-1/avatar.webp"
			)
		).rejects.toThrow("Paveikslėlių saugykla nepasiekiama");
	});

	it("deletes an owned avatar key", async () => {
		const deleteObject = vi.fn().mockResolvedValue(undefined);
		getAssetsBucket.mockResolvedValue({ delete: deleteObject, put: vi.fn() });

		await deleteAvatar(
			"user-1",
			"https://assets.walgo.lt/avatars/user-1/avatar.webp"
		);

		expect(deleteObject).toHaveBeenCalledWith("avatars/user-1/avatar.webp");
	});
});
