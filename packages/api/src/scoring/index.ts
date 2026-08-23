import { alphaRuleSet } from "./alpha";
import { betaRuleSet } from "./beta";
import { season20262027RuleSet } from "./season-2026-2027";
import type { ScoringRuleSet } from "./types";

export const SCORING_RULE_SETS = ["alpha", "beta", "2026-2027"] as const;
export type ScoringRuleSetName = (typeof SCORING_RULE_SETS)[number];

export function getScoringRuleSet(
	scoringRuleSet: ScoringRuleSetName
): ScoringRuleSet {
	if (scoringRuleSet === "beta") {
		return betaRuleSet;
	}
	if (scoringRuleSet === "2026-2027") {
		return season20262027RuleSet;
	}
	return alphaRuleSet;
}
