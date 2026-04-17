import { VALID_WAL_SQUARES } from "./valid-wal-squares";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WAL_ORIGIN_LAT_DEG = 56 + 30 / 60;
const WAL_ORIGIN_LON_DEG = 20 + 50 / 60;
const WAL_STEP_DEG = 10 / 60;

export type WalBounds = {
  north: number;
  south: number;
  west: number;
  east: number;
};

export function calculateWalCode(lat: number, lon: number): string | null {
  const letterIdx = Math.floor(-(lat - WAL_ORIGIN_LAT_DEG) / WAL_STEP_DEG);
  const number = Math.floor((lon - WAL_ORIGIN_LON_DEG) / WAL_STEP_DEG);

  if (letterIdx < 0 || letterIdx >= LETTERS.length) return null;
  if (number < 0 || number > 99) return null;

  const code = `${LETTERS[letterIdx]}${number.toString().padStart(2, "0")}`;
  return VALID_WAL_SQUARES.has(code) ? code : null;
}

export function walBounds(code: string): WalBounds | null {
  if (!VALID_WAL_SQUARES.has(code)) return null;
  const letterIdx = LETTERS.indexOf(code[0]);
  const number = Number.parseInt(code.slice(1), 10);
  if (letterIdx < 0 || Number.isNaN(number)) return null;

  const north = WAL_ORIGIN_LAT_DEG - letterIdx * WAL_STEP_DEG;
  const south = north - WAL_STEP_DEG;
  const west = WAL_ORIGIN_LON_DEG + number * WAL_STEP_DEG;
  const east = west + WAL_STEP_DEG;

  return { north, south, west, east };
}

export function maidenheadToLatLon(
  locator: string,
): { lat: number; lon: number } | null {
  const raw = locator.trim();
  if (raw.length < 4 || raw.length % 2 !== 0) return null;

  const fieldLon = raw.charCodeAt(0) - "A".charCodeAt(0);
  const fieldLat = raw.charCodeAt(1) - "A".charCodeAt(0);
  if (fieldLon < 0 || fieldLon > 17 || fieldLat < 0 || fieldLat > 17)
    return null;

  const sqLon = Number.parseInt(raw[2], 10);
  const sqLat = Number.parseInt(raw[3], 10);
  if (Number.isNaN(sqLon) || Number.isNaN(sqLat)) return null;

  let lon = -180 + fieldLon * 20 + sqLon * 2;
  let lat = -90 + fieldLat * 10 + sqLat * 1;
  let lonStep = 2;
  let latStep = 1;

  if (raw.length >= 6) {
    const subLon = raw.toLowerCase().charCodeAt(4) - "a".charCodeAt(0);
    const subLat = raw.toLowerCase().charCodeAt(5) - "a".charCodeAt(0);
    if (subLon < 0 || subLon > 23 || subLat < 0 || subLat > 23) return null;
    lon += subLon * (5 / 60);
    lat += subLat * (2.5 / 60);
    lonStep = 5 / 60;
    latStep = 2.5 / 60;
  }

  if (raw.length >= 8) {
    const extLon = Number.parseInt(raw[6], 10);
    const extLat = Number.parseInt(raw[7], 10);
    if (Number.isNaN(extLon) || Number.isNaN(extLat)) return null;
    lon += extLon * (30 / 3600);
    lat += extLat * (15 / 3600);
    lonStep = 30 / 3600;
    latStep = 15 / 3600;
  }

  return { lon: lon + lonStep / 2, lat: lat + latStep / 2 };
}

export function walFromMaidenhead(locator: string): string | null {
  const coords = maidenheadToLatLon(locator);
  if (!coords) return null;
  return calculateWalCode(coords.lat, coords.lon);
}

export function normalizeWalCode(input: string): string | null {
  const cleaned = input.trim().toUpperCase();
  return VALID_WAL_SQUARES.has(cleaned) ? cleaned : null;
}
