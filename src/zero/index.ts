import { Zero } from "@rocicorp/zero";
import { createEmitter } from "@vxrn/emitter";
import { createUseZero } from "@rocicorp/zero/react";
import { type Schema, schema } from "./schema";
import { createMutators, type Mutators } from "./mutators";
import { decodeAuthData } from "~/auth/authData";

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
		mutators: createMutators(decodeAuthData(auth)),
		kvStore: "mem",
	});
}

export function setZeroAuth({
	jwtToken,
	userID,
}: { jwtToken: string; userID: string }) {
	zero.close();
	zero = createZero({
		auth: jwtToken,
		userID,
	});
	zeroEmitter.emit(zero);
}

export const useZero = createUseZero<Schema, Mutators>();
