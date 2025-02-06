import { Zero } from "@rocicorp/zero";
import { schema } from "~/zeroSchema";

const zero = new Zero({
	userID: "anon",
	// auth,
	server: import.meta.env.VITE_PUBLIC_ZERO_SERVER,
	schema,
	kvStore: "mem",
});
