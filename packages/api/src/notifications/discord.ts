import { env } from "@WAL-GO/env/server";

import type { OwnershipChange } from "../scoring/apply-deltas";
import { TEAM_DISPLAY } from "../scoring/control";

// Discord rejects a webhook message whose `content` exceeds 2000 characters,
// so a single transaction's changes are split across that many POSTs.
const DISCORD_CONTENT_LIMIT = 2000;

function formatChange(change: OwnershipChange): string {
	const after = change.after ? TEAM_DISPLAY[change.after] : null;
	const before = change.before ? TEAM_DISPLAY[change.before] : null;

	if (after && before) {
		return `${after.emoji} Kvadratą ${change.squareCode} perėmė komanda ${after.label} (buvo: ${before.emoji} ${before.label}).`;
	}
	if (after) {
		return `${after.emoji} Kvadratą ${change.squareCode} užėmė komanda ${after.label}!`;
	}
	// before is non-null here: a controlled square became uncontrolled (tie).
	return `⚪ Kvadratas ${change.squareCode} tapo nevaldomas (buvo: ${before?.emoji} ${before?.label}).`;
}

/** Packs lines into messages that each stay under the Discord content limit. */
function chunkLines(lines: string[]): string[] {
	const chunks: string[] = [];
	for (const line of lines) {
		const current = chunks.at(-1);
		if (
			current !== undefined &&
			current.length + 1 + line.length <= DISCORD_CONTENT_LIMIT
		) {
			chunks[chunks.length - 1] = `${current}\n${line}`;
		} else {
			chunks.push(line);
		}
	}
	return chunks;
}

async function postChunks(webhookUrl: string, lines: string[]): Promise<void> {
	for (const content of chunkLines(lines)) {
		await fetch(webhookUrl, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ content }),
		});
	}
}

/**
 * Schedules a background task without blocking the response. On Cloudflare
 * Workers `waitUntil` keeps the request alive until the task settles (a plain
 * un-awaited promise would be cancelled when the response is sent); outside
 * Workers the `cloudflare:workers` import fails and the promise just runs.
 */
async function scheduleBackground(task: Promise<void>): Promise<void> {
	try {
		const moduleName = "cloudflare:workers";
		/* @vite-ignore */
		const { waitUntil } = (await import(moduleName)) as {
			waitUntil: (promise: Promise<unknown>) => void;
		};
		waitUntil(task);
	} catch {
		await task;
	}
}

/**
 * Posts a Discord announcement for each square that changed controller. Runs
 * in the background and never throws: a missing webhook URL is a no-op and any
 * delivery failure is logged, so announcements can never affect the QSO flow.
 */
export function announceOwnershipChanges(changes: OwnershipChange[]): void {
	const webhookUrl = env.DISCORD_WEBHOOK_URL;
	if (!webhookUrl || changes.length === 0) {
		return;
	}

	const lines = changes.map(formatChange);
	const task = postChunks(webhookUrl, lines).catch((error) => {
		console.error("Failed to send Discord announcement", error);
	});
	scheduleBackground(task).catch(() => {
		// scheduleBackground swallows its own errors; this satisfies the
		// no-floating-promise rule without the `void` operator.
	});
}
