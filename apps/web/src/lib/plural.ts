type LithuanianPluralForms = {
	one: string;
	few: string;
	many: string;
};

export function pluralizeLt(
	count: number,
	{ one, few, many }: LithuanianPluralForms
): string {
	const mod100 = count % 100;
	const mod10 = count % 10;
	if (mod10 === 0 || (mod100 >= 11 && mod100 <= 19)) {
		return many;
	}
	if (mod10 === 1) {
		return one;
	}
	return few;
}
