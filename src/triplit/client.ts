import { TriplitClient } from "@triplit/client";
import { schema } from "./schema";

export const triplit = new TriplitClient({
  schema,
});
