import { co, z } from "jazz-tools";

export const QSO = co.map({
  receivedCallsign: z.string(),
  receivedWAL: z.optional(z.string()),
  sentWAL: z.string(),
  receivedRST: z.string(),
  sentRST: z.string(),
  band: z.string(),
  mode: z.string(),
});
export type QSO = co.loaded<typeof QSO>;

export const PartialQSO = QSO.partial();

export type PartialQSO = co.loaded<typeof PartialQSO>;

// export const Log = co.list(QSO);
export const LogFeed = co.feed(QSO);

// export const WalGoAccountRoot = co.map({
//   log: co.list(QSO),
// });
// export type WalGoAccountRoot = co.loaded<typeof WalGoAccountRoot>;

// export const WalGoAccount = co
//   .account({
//     profile: co.profile(),
//     root: WalGoAccountRoot,
//   })
//   .withMigration((account) => {
//     if (!account.$jazz.has("root")) {
//       account.$jazz.set("root", {
//         log: [],
//       });
//     }
//   });
// export type WalGoAccount = co.loaded<typeof WalGoAccount>;
