import { alphaRuleSet } from "./alpha";
import { betaRuleSet } from "./beta";
import type { ScoringRuleSet } from "./types";

export function getScoringRuleSet(
	scoringRuleSet: "alpha" | "beta"
): ScoringRuleSet {
	return scoringRuleSet === "beta" ? betaRuleSet : alphaRuleSet;
}
