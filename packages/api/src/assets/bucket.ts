// Shared access to the public R2 bucket (`ASSETS_BUCKET`, see infra
// alchemy.run.ts). Objects are served from `assets.walgo.lt`, attached in prod
// only — preview/dev deploys write to the same bucket but the returned URLs
// resolve nowhere.

export const PUBLIC_ASSETS_BASE_URL = "https://assets.walgo.lt";

export interface AssetsBucket {
	delete(key: string): Promise<void>;
	put(
		key: string,
		value: ArrayBuffer,
		options?: {
			httpMetadata?: { cacheControl?: string; contentType?: string };
		}
	): Promise<unknown>;
}

// Resolve the binding the same way `@WAL-GO/db` resolves Hyperdrive: a lazy
// string-specifier import so bundlers outside the Worker runtime don't choke.
export async function getAssetsBucket(): Promise<AssetsBucket | undefined> {
	try {
		const mod = "cloudflare:workers";
		/* @vite-ignore */
		const { env } = (await import(mod)) as {
			env: { ASSETS_BUCKET?: AssetsBucket };
		};
		return env.ASSETS_BUCKET;
	} catch {
		return;
	}
}
