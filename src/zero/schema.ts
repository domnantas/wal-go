import {
	ANYONE_CAN,
	boolean,
	createSchema,
	definePermissions,
	type ExpressionBuilder,
	type InsertValue,
	number,
	type PermissionsConfig,
	type Row,
	string,
	table,
} from "@rocicorp/zero";
import type { AuthData } from "~/auth/authData";

export const user = table("user")
	.columns({
		id: string(),
		name: string(),
		email: string(),
		email_verified: boolean(),
		image: string(),
		updated_at: number(),
		created_at: number(),
	})
	.primaryKey("id");

export const qso = table("qso")
	.columns({
		id: string(),
		activator_callsign: string(),
		hunter_callsign: string(),
		activator_square: string(),
		hunter_square: string().optional(),
		band: string(),
		mode: string(),
		rst_sent: string().optional(),
		rst_received: string().optional(),
		qso_at: number().optional(),
		updated_at: number().optional(),
		created_at: number().optional(),
	})
	.primaryKey("id");

export const schema = createSchema({
	tables: [user, qso],
});

export type Schema = typeof schema;
export type User = Row<typeof schema.tables.user>;
export type Qso = Row<typeof schema.tables.qso>;
export type InsertQso = InsertValue<typeof schema.tables.qso>;

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
	const allowIfLoggedIn = (
		authData: AuthData,
		{ cmpLit }: ExpressionBuilder<Schema, keyof Schema["tables"]>,
	) => {
		return cmpLit(authData.sub, "IS NOT", null);
	};

	return {
		user: { row: { select: [allowIfLoggedIn] } },
		qso: {
			row: {
				select: ANYONE_CAN,
			},
		},
	} satisfies PermissionsConfig<AuthData, Schema>;
});
