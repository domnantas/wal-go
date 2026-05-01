import type { AnyFieldApi } from "@tanstack/react-form";

export function handleFieldChange<TValue>(
	field: Pick<AnyFieldApi, "handleChange" | "setMeta">,
	value: TValue
) {
	field.handleChange(value);
	field.setMeta((prev) => ({
		...prev,
		errorMap: {},
		errorSourceMap: {},
	}));
}
