import { customAlphabet } from "nanoid";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz";
const PUBLIC_ID_LENGTH = 12;

const nanoid = customAlphabet(ALPHABET, PUBLIC_ID_LENGTH);

export function generateNanoId(): string {
	return nanoid();
}
