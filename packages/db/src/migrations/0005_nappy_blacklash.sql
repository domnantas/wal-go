CREATE TYPE "public"."band" AS ENUM('160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '4m', '2m', '70cm', '24cm', '13cm', '9cm', '6cm', '3cm', '12mm', '6mm', '4mm', '2.5mm', '2mm', '1mm');--> statement-breakpoint
CREATE TYPE "public"."mode" AS ENUM('CW', 'SSB', 'FM', 'DIGI');--> statement-breakpoint
ALTER TABLE "qso" ALTER COLUMN "band" SET DATA TYPE "public"."band" USING "band"::"public"."band";--> statement-breakpoint
ALTER TABLE "qso" ALTER COLUMN "mode" SET DATA TYPE "public"."mode" USING "mode"::"public"."mode";