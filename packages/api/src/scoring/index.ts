import { alphaRuleSet } from "./alpha";
import type { ScoringRuleSet } from "./types";

export function getScoringRuleSet(_seasonId: number): ScoringRuleSet {
	return alphaRuleSet;
}
