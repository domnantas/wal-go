import type { CustomMutatorDefs } from "@rocicorp/zero";
import type { InsertQso, schema } from "./schema";
import type { AuthData } from "~/auth/authData";

function mustBeLoggedIn(authData?: AuthData): asserts authData is AuthData {
	if (!authData) {
		throw new Error("Must be logged in");
	}
}

export function createMutators(authData?: AuthData) {
	return {
		qso: {
			insert: async (tx, qso: InsertQso) => {
				mustBeLoggedIn(authData);

				await tx.mutate.qso.insert(qso);
			},
		},
	} as const satisfies CustomMutatorDefs<typeof schema>;
}

export type Mutators = ReturnType<typeof createMutators>;
