import { Schema as S } from "@triplit/client";

export const schema = S.Collections({
  user: {
    schema: S.Schema({
      id: S.Id(),
      name: S.String(),
      email: S.String(),
      emailVerified: S.String(),
      updatedAt: S.Date({
        default: S.Default.now(),
      }),
      createdAt: S.Date({
        default: S.Default.now(),
      }),
    }),
  },
  qso: {
    schema: S.Schema({
      id: S.Id(),
      activatorCallsign: S.String(),
      hunterCallsign: S.String(),
      activatorSquare: S.String(),
      hunterSquare: S.Optional(S.String()),
    }),
  },
});
