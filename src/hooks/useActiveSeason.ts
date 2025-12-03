import { SeasonRecord } from "@/lib/powersync/AppSchema";
import { useSystem } from "@/lib/powersync/system";
import { toCompilableQuery } from "@powersync/drizzle-driver";
import { useQuery } from "@powersync/react-native";
import { useMemo } from "react";

export function useActiveSeason() {
  const { drizzle } = useSystem();
  const { data, isLoading, error } = useQuery(
    toCompilableQuery(drizzle.query.seasons.findMany())
  );

  const activeSeason = useMemo(() => {
    if (!data || data.length === 0) return null;

    const now = new Date();
    return (
      data.find((season: SeasonRecord) => {
        const startsAt = new Date(season.startsAt);
        const endsAt = new Date(season.endsAt);
        return now >= startsAt && now <= endsAt;
      }) ?? null
    );
  }, [data]);

  return {
    activeSeason,
    isLoading,
    error,
  };
}
