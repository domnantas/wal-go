import { LogFeed } from "@/lib/jazz/schema";
import { co } from "jazz-tools";
import { startWorker } from "jazz-tools/worker";

const { shutdownWorker } = await startWorker({
  accountID: process.env.JAZZ_ADMIN_ACCOUNT,
  accountSecret: process.env.JAZZ_ADMIN_SECRET,
});

const admin = await co.account().load(process.env.JAZZ_ADMIN_ACCOUNT!);
if (!admin) {
  throw new Error("No admin account found. Did you run `pnpm admin:init`?");
}

const globalLogFeed = (() => {
  const owner = co.group().create();
  // cofeeds are append-only so `writer` allows us to read/write but doesn't allow
  // users to overwrite data from others
  owner.addMember("everyone", "writer");
  const feed = LogFeed.create([], owner);
  return feed;
})();

await shutdownWorker();

console.log(`
EXPO_PUBLIC_GLOBAL_LOG_FEED=${globalLogFeed.$jazz.id}
`);
