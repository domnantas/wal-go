import { type FormatOptionsWithTZ, formatInTimeZone } from "date-fns-tz";

export const VILNIUS_TZ = "Europe/Vilnius";

export function formatInVilnius(
	date: Date | string | number,
	formatStr = "yyyy-MM-dd",
	options?: FormatOptionsWithTZ
): string {
	return formatInTimeZone(date, VILNIUS_TZ, formatStr, options);
}
