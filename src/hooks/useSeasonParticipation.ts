import { useActiveSeason } from "@/hooks/useActiveSeason";
import { useAuth } from "@/hooks/useAuth";
import { seasonParticipants } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { useQuery } from "@powersync/react-native";
import { and, eq } from "drizzle-orm";

export function useSeasonParticipation() {
  const { drizzle } = useSystem();
  const { userId } = useAuth();
  const { activeSeason, isLoading: isSeasonLoading } = useActiveSeason();

  const { data, isLoading: isParticipantsLoading } = useQuery(
    toCompilableQuery(
      drizzle.query.seasonParticipants.findFirst({
        where: and(
          eq(seasonParticipants.seasonId, activeSeason?.id ?? ""),
          eq(seasonParticipants.userId, userId ?? "")
        ),
      })
    )
  );

  const participation = data[0];

  return {
    userParticipatingInActiveSeason: !!participation,
    team: participation?.team,
    isLoading: isSeasonLoading || isParticipantsLoading,
  };
}
