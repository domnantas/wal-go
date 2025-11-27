import { isValidWAL } from "@/constants/wal";
import { z } from "zod";

export const VALID_MODES = ["SSB", "CW", "DIGI"] as const;

const callsignRegex = /^[A-Z0-9]{3,10}$/;
const rstRegex = /^[1-5][1-9][1-9]?$/;
const frequencyRegex = /^\d+(\.\d+)?$/;

const walSchema = z
  .string()
  .refine((val) => val === "" || isValidWAL(val), {
    message: "Neteisingas WAL formatas (pvz., A05)",
  });

export const qsoSchema = z.object({
  receivedCallsign: z
    .string()
    .min(1, "Šaukinys yra privalomas")
    .regex(callsignRegex, "Neteisingas šaukinio formatas"),
  receivedWAL: walSchema,
  sentWAL: walSchema,
  receivedRST: z
    .string()
    .min(1, "RST yra privalomas")
    .regex(rstRegex, "Neteisingas RST formatas (pvz., 59 arba 599)"),
  sentRST: z
    .string()
    .min(1, "RST yra privalomas")
    .regex(rstRegex, "Neteisingas RST formatas (pvz., 59 arba 599)"),
  frequency: z
    .string()
    .min(1, "Dažnis yra privalomas")
    .regex(frequencyRegex, "Neteisingas dažnio formatas"),
  mode: z.enum(VALID_MODES, { message: "Moduliacija turi būti SSB, CW arba DIGI" }),
});

export type QSOFormData = z.infer<typeof qsoSchema>;
