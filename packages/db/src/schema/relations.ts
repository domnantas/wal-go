import { defineRelations } from "drizzle-orm";
import { account, session, user } from "./auth.ts";
import { qso } from "./qsos.ts";
import { squareScore, userSeasonScore } from "./scoring.ts";
import { season, seasonMembership } from "./seasons.ts";

export const relations = defineRelations(
	{
		user,
		session,
		account,
		qso,
		squareScore,
		userSeasonScore,
		season,
		seasonMembership,
	},
	(r) => ({
		user: {
			qsos: r.many.qso({ from: r.user.id, to: r.qso.userId }),
			sessions: r.many.session({ from: r.user.id, to: r.session.userId }),
			accounts: r.many.account({ from: r.user.id, to: r.account.userId }),
			seasonMemberships: r.many.seasonMembership({
				from: r.user.id,
				to: r.seasonMembership.userId,
			}),
		},
		session: {
			user: r.one.user({ from: r.session.userId, to: r.user.id }),
		},
		account: {
			user: r.one.user({ from: r.account.userId, to: r.user.id }),
		},
		qso: {
			user: r.one.user({ from: r.qso.userId, to: r.user.id }),
			season: r.one.season({ from: r.qso.seasonId, to: r.season.id }),
		},
		season: {
			qsos: r.many.qso({ from: r.season.id, to: r.qso.seasonId }),
			memberships: r.many.seasonMembership({
				from: r.season.id,
				to: r.seasonMembership.seasonId,
			}),
		},
		seasonMembership: {
			season: r.one.season({
				from: r.seasonMembership.seasonId,
				to: r.season.id,
			}),
			user: r.one.user({ from: r.seasonMembership.userId, to: r.user.id }),
		},
		squareScore: {
			season: r.one.season({
				from: r.squareScore.seasonId,
				to: r.season.id,
			}),
		},
		userSeasonScore: {
			season: r.one.season({
				from: r.userSeasonScore.seasonId,
				to: r.season.id,
			}),
			user: r.one.user({ from: r.userSeasonScore.userId, to: r.user.id }),
		},
	})
);
