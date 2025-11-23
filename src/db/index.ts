import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const client = postgres(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "", {
  prepare: false,
});
export const db = drizzle(client);
