import {
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
		image: string(),
		updatedAt: number(),
		createdAt: number(),
	})
	.primaryKey("id");

export const schema = createSchema(1, {
	tables: [user],
});

export type Schema = typeof schema;
export type User = Row<typeof schema.tables.user>;

export const permissions = definePermissions<unknown, Schema>(schema, () => {
	return {};
});
