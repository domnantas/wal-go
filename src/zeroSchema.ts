import {
	boolean,
	createSchema,
	definePermissions,
	number,
	type Row,
	string,
	table,
} from "@rocicorp/zero";

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

export const schema = createSchema(1, {
	tables: [user, qso],
});

export type Schema = typeof schema;
export type User = Row<typeof schema.tables.user>;

export const permissions = definePermissions<unknown, Schema>(schema, () => {
	return {};
});
