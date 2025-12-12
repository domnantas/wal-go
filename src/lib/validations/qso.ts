import { isValidWAL } from "@/constants/wal";
import { z } from "zod";

export const VALID_MODES = ["SSB", "CW", "DIGI"];

const callsignRegex = /^[A-Z0-9]{3,10}$/;
const rstRegex = /^[1-5][1-9][1-9]?$/;
const frequencyRegex = /^\d+([.,]\d+)?$/;
const WALRegex = /^[A-Z][0-9]{2}$/;
const WAL_FORMAT_ERROR = "Neteisingas WAL formatas (pvz., A05)";
const WAL_NONEXISTENT_ERROR = "Neegzistuojantis WAL kvadratas";

const walSchema = z
  .string()
  .regex(WALRegex, WAL_FORMAT_ERROR)
  .refine((val) => isValidWAL(val), {
    error: WAL_NONEXISTENT_ERROR,
  });

const optionalWalSchema = z
  .string()
  .refine((val) => val === "" || WALRegex.test(val), {
    error: WAL_FORMAT_ERROR,
  })
  .refine((val) => val === "" || isValidWAL(val), {
    error: WAL_NONEXISTENT_ERROR,
  });

export const qsoSchema = z.object({
  receivedCallsign: z
    .string()
    .min(1, "Šaukinys yra privalomas")
    .regex(callsignRegex, "Neteisingas šaukinio formatas"),
  receivedWAL: optionalWalSchema,
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
    .regex(frequencyRegex, "Neteisingas dažnio formatas")
    .transform((val) => val.replace(/,/g, ".")),
  mode: z.enum(VALID_MODES, {
    error: "Moduliacija turi būti SSB, CW arba DIGI",
  }),
});

export type QSOFormData = z.infer<typeof qsoSchema>;
