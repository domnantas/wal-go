CREATE TYPE "scoring_rule_set" AS ENUM('alpha', 'beta');--> statement-breakpoint
ALTER TABLE "season" ADD COLUMN "scoring_rule_set" "scoring_rule_set" DEFAULT 'alpha'::"scoring_rule_set" NOT NULL;