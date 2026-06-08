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

export function handleFieldBlur(
	field: Pick<AnyFieldApi, "handleBlur" | "state">
) {
	if (field.state.meta.isDirty) {
		field.handleBlur();
	}
}
