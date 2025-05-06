import { Zero } from "@rocicorp/zero";
import { type Schema, schema } from "~/zeroSchema";
import { createEmitter } from "@vxrn/emitter";
import { createUseZero } from "@rocicorp/zero/react";

export let zero = createZero();

const zeroEmitter = createEmitter<typeof zero>();
export const useZeroEmit = zeroEmitter.use;

function createZero({
	auth,
	userID = "anon",
}: { auth?: string; userID?: string } = {}) {
	return new Zero({
		userID,
		auth,
		server: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
		schema,
		kvStore: "mem",
	});
}

export function setZeroAuth({
	jwtToken,
	userID,
}: { jwtToken: string; userID: string }) {
	zero = createZero({
		auth: jwtToken,
		userID,
	});
	zeroEmitter.emit(zero);
}

export const useZero = createUseZero<Schema>();
