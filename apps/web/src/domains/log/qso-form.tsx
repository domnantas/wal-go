import {
	BLOCKED_CALLSIGN_REGEX,
	isLithuanianCallsign,
	isValidCallsign,
	normalizeCallsign,
} from "@WAL-GO/callsign";
import { isValidWalSquare, normalizeWalSquare } from "@WAL-GO/grid";
import { Button } from "@WAL-GO/ui/components/button";
import { Calendar } from "@WAL-GO/ui/components/calendar";
import { DialogFooter } from "@WAL-GO/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
import { Label } from "@WAL-GO/ui/components/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@WAL-GO/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@WAL-GO/ui/components/select";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { Switch } from "@WAL-GO/ui/components/switch";
import { handleFieldBlur, handleFieldChange } from "@WAL-GO/ui/lib/form";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import { format, getHours, getMinutes, isValid, parse, set } from "date-fns";
import { lt } from "date-fns/locale";
import { CalendarIcon, Save } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";

import { GeolocationSquareButton } from "./geolocation-square-button";

export const BAND_OPTIONS = [
	"160m",
	"80m",
	"40m",
	"30m",
	"20m",
	"17m",
	"15m",
	"12m",
	"10m",
	"6m",
	"2m",
	"70cm",
] as const;

export const MODE_OPTIONS = ["CW", "SSB", "FM", "DIGI"] as const;
export const DATE_TIME_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";
const TIME_INPUT_FORMAT = "HH:mm";
const DATE_BUTTON_FORMAT = "PPP";

export interface EditableQso {
	band: string;
	contactCallsign: string;
	contactSquare: null | string;
	id: number;
	mode: string;
	operatorSquare: string;
	qsoAt: Date | string;
}

interface QsoFormState {
	band: (typeof BAND_OPTIONS)[number];
	contactCallsign: string;
	contactSquare: string;
	mode: (typeof MODE_OPTIONS)[number];
	operatorSquare: string;
	qsoAt: string;
}

export interface QsoFormPayload {
	band: (typeof BAND_OPTIONS)[number];
	contactCallsign: string;
	contactSquare: null | string;
	mode: (typeof MODE_OPTIONS)[number];
	operatorSquare: string;
	qsoAt: string;
}

const DX_NOT_ALLOWED_FOR_LY = "LY šaukiniui DX negalimas";

const requiredText = (message: string) => z.string().trim().min(1, message);

const dateTimeSchema = requiredText("Įveskite QSO datą ir laiką").refine(
	(value) => toIsoDateTime(value) !== null,
	"Įveskite teisingą QSO datą ir laiką"
);

const requiredWalSchema = requiredText("Įveskite WAL kvadratą").refine(
	(value) => isValidWalSquare(value),
	"Neteisingas WAL kvadratas"
);

const requiredWalOrDxSchema = requiredText(
	"Įveskite WAL kvadratą arba DX"
).refine(
	(value) => value.toUpperCase() === "DX" || isValidWalSquare(value),
	"Neteisingas WAL kvadratas"
);

const optionalWalSchema = z
	.string()
	.trim()
	.refine(
		(value) =>
			value === "" || value.toUpperCase() === "DX" || isValidWalSquare(value),
		"Neteisingas WAL kvadratas"
	);

function getQsoFormSchema(requiresContactSquare: boolean) {
	return z.object({
		contactCallsign: requiredText("Įveskite šaukinį")
			.refine((v) => isValidCallsign(v), "Neteisingas šaukinys")
			.refine(
				(v) => !BLOCKED_CALLSIGN_REGEX.test(normalizeCallsign(v)),
				"Rusijos ir Baltarusijos šaukiniai neleistini. Слава Україні! 🇺🇦"
			),
		band: z.enum(BAND_OPTIONS),
		mode: z.enum(MODE_OPTIONS),
		qsoAt: dateTimeSchema,
		operatorSquare: requiredWalSchema,
		contactSquare: requiresContactSquare
			? requiredWalOrDxSchema
			: optionalWalSchema,
	});
}

function getQsoSubmitSchema(requiresContactSquare: boolean) {
	return getQsoFormSchema(requiresContactSquare).superRefine((values, ctx) => {
		if (
			values.contactSquare.trim().toUpperCase() === "DX" &&
			isLithuanianCallsign(values.contactCallsign)
		) {
			ctx.addIssue({
				code: "custom",
				message: DX_NOT_ALLOWED_FOR_LY,
				path: ["contactSquare"],
			});
		}
	});
}

function toIsoDateTime(value: string) {
	const date = parse(value, DATE_TIME_INPUT_FORMAT, new Date());
	if (!isValid(date)) {
		return null;
	}
	return date.toISOString();
}

function getTimePart(value: string) {
	const date = parse(value, DATE_TIME_INPUT_FORMAT, new Date());
	if (!isValid(date)) {
		return "";
	}
	return format(date, TIME_INPUT_FORMAT);
}

function toCalendarDate(value: string) {
	const date = parse(value, DATE_TIME_INPUT_FORMAT, new Date());
	if (!isValid(date)) {
		return;
	}
	return date;
}

function toDateTimeValue(date: Date, time: string) {
	const parsedTime = parse(time, TIME_INPUT_FORMAT, new Date());
	const dateTime = isValid(parsedTime)
		? set(date, {
				hours: getHours(parsedTime),
				minutes: getMinutes(parsedTime),
				seconds: 0,
				milliseconds: 0,
			})
		: set(date, {
				hours: 0,
				minutes: 0,
				seconds: 0,
				milliseconds: 0,
			});

	return format(dateTime, DATE_TIME_INPUT_FORMAT);
}

function withTimePart(value: string, time: string) {
	const date = toCalendarDate(value);
	if (!date) {
		return value;
	}
	return toDateTimeValue(date, time);
}

function toFormDateTimeValue(value: Date | string) {
	return format(new Date(value), DATE_TIME_INPUT_FORMAT);
}

export function qsoToFormValues(qso: EditableQso): QsoFormState {
	return {
		band: qso.band as QsoFormState["band"],
		contactCallsign: qso.contactCallsign,
		contactSquare: qso.contactSquare ?? "",
		mode: qso.mode as QsoFormState["mode"],
		operatorSquare: qso.operatorSquare,
		qsoAt: toFormDateTimeValue(qso.qsoAt),
	};
}

export function QsoForm({
	defaultValues,
	enableCallsignSpaceNavigation = false,
	formError,
	geolocation = false,
	isPending,
	keepOpen,
	onBandChange,
	onClearError,
	onKeepOpenChange,
	onModeChange,
	onSubmit,
	requiresContactSquare = false,
	submitLabel,
}: {
	defaultValues: QsoFormState;
	enableCallsignSpaceNavigation?: boolean;
	formError: null | string;
	geolocation?: boolean;
	isPending: boolean;
	keepOpen?: boolean;
	onBandChange?: (band: string) => void;
	onClearError: () => void;
	onKeepOpenChange?: (keepOpen: boolean) => void;
	onModeChange?: (mode: string) => void;
	onSubmit: (payload: QsoFormPayload) => unknown;
	requiresContactSquare?: boolean;
	submitLabel: string;
}) {
	const qsoFormSchema = getQsoFormSchema(requiresContactSquare);
	const qsoSubmitSchema = getQsoSubmitSchema(requiresContactSquare);
	const contactCallsignRef = useRef<HTMLInputElement>(null);
	const operatorSquareRef = useRef<HTMLInputElement>(null);
	const contactSquareRef = useRef<HTMLInputElement>(null);
	const refocusAfterSubmitRef = useRef(false);

	useEffect(() => {
		if (!isPending && refocusAfterSubmitRef.current) {
			refocusAfterSubmitRef.current = false;
			contactCallsignRef.current?.focus();
		}
	}, [isPending]);
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: qsoSubmitSchema,
		},
		onSubmit: async ({ value }) => {
			const qsoAt = toIsoDateTime(value.qsoAt);
			if (!qsoAt) {
				return;
			}
			const result = await onSubmit({
				contactCallsign: value.contactCallsign,
				band: value.band,
				mode: value.mode,
				qsoAt,
				operatorSquare: normalizeWalSquare(value.operatorSquare),
				contactSquare: value.contactSquare
					? normalizeWalSquare(value.contactSquare)
					: null,
			});
			if (keepOpen && result !== false) {
				form.resetField("contactCallsign");
				form.resetField("contactSquare");
				refocusAfterSubmitRef.current = true;
			}
		},
	});

	const handleGeolocationSquare = useCallback(
		(wal: string) => {
			form.setFieldValue("operatorSquare", wal);
			onClearError();
		},
		[form, onClearError]
	);

	return (
		<form
			className="flex flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				onClearError();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-4 sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
					<form.Field
						name="contactCallsign"
						validators={{
							onBlur: qsoFormSchema.shape.contactCallsign,
						}}
					>
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor="contactCallsign">Šaukinys</FieldLabel>
									<Input
										aria-invalid={isInvalid}
										autoCapitalize="characters"
										disabled={isPending}
										id="contactCallsign"
										name="contactCallsign"
										onBlur={() => handleFieldBlur(field)}
										onChange={(event) => {
											onClearError();
											handleFieldChange(
												field,
												event.target.value.toUpperCase()
											);
										}}
										onKeyDown={(event) => {
											if (!enableCallsignSpaceNavigation || event.key !== " ") {
												return;
											}
											event.preventDefault();
											const squareInput = form
												.getFieldValue("operatorSquare")
												.trim()
												? contactSquareRef.current
												: operatorSquareRef.current;
											squareInput?.focus();
										}}
										ref={contactCallsignRef}
										value={field.state.value}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
					<form.Field
						name="qsoAt"
						validators={{ onBlur: qsoFormSchema.shape.qsoAt }}
					>
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							const selectedDate = toCalendarDate(field.state.value);
							const timeValue = getTimePart(field.state.value);
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor="qsoAt">Data ir laikas</FieldLabel>
									<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
										<Popover>
											<PopoverTrigger
												render={
													<button
														aria-invalid={isInvalid}
														className={cn(
															"inline-flex h-9 w-full min-w-0 items-center justify-start gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-left font-normal text-base outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
															!selectedDate && "text-muted-foreground"
														)}
														data-empty={!selectedDate}
														disabled={isPending}
														id="qsoAt"
														type="button"
													/>
												}
											>
												<CalendarIcon />
												<span className="min-w-0 truncate">
													{selectedDate
														? format(selectedDate, DATE_BUTTON_FORMAT, {
																locale: lt,
															})
														: "Pasirinkite datą"}
												</span>
											</PopoverTrigger>
											<PopoverContent className="w-auto p-0">
												<Calendar
													mode="single"
													onSelect={(date) => {
														if (!date) {
															return;
														}
														onClearError();
														handleFieldChange(
															field,
															toDateTimeValue(date, timeValue)
														);
													}}
													selected={selectedDate}
												/>
											</PopoverContent>
										</Popover>
										<Input
											aria-invalid={isInvalid}
											className="appearance-none"
											disabled={isPending}
											name="qsoAtTime"
											onBlur={() => handleFieldBlur(field)}
											onChange={(event) => {
												onClearError();
												handleFieldChange(
													field,
													withTimePart(field.state.value, event.target.value)
												);
											}}
											type="time"
											value={timeValue}
										/>
									</div>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</div>
				<form.Field name="band">
					{(field) => (
						<Field>
							<FieldLabel htmlFor="band">Diapazonas</FieldLabel>
							<Select
								disabled={isPending}
								id="band"
								name="band"
								onOpenChange={(isOpen) => {
									if (!isOpen) {
										field.handleBlur();
									}
								}}
								onValueChange={(value) => {
									onClearError();
									handleFieldChange(field, value as QsoFormState["band"]);
									onBandChange?.(value);
								}}
								value={field.state.value}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{BAND_OPTIONS.map((option) => (
											<SelectItem key={option} value={option}>
												{option}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>
				<form.Field name="mode">
					{(field) => (
						<Field>
							<FieldLabel htmlFor="mode">Moduliacija</FieldLabel>
							<Select
								disabled={isPending}
								id="mode"
								name="mode"
								onOpenChange={(isOpen) => {
									if (!isOpen) {
										field.handleBlur();
									}
								}}
								onValueChange={(value) => {
									onClearError();
									handleFieldChange(field, value as QsoFormState["mode"]);
									onModeChange?.(value);
								}}
								value={field.state.value}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{MODE_OPTIONS.map((option) => (
											<SelectItem key={option} value={option}>
												{option}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
					)}
				</form.Field>
				<form.Field
					name="operatorSquare"
					validators={{ onBlur: qsoFormSchema.shape.operatorSquare }}
				>
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<div className="flex items-center justify-between gap-2">
									<FieldLabel htmlFor="operatorSquare">
										Mano kvadratas
									</FieldLabel>
									{geolocation && (
										<GeolocationSquareButton
											className="-my-1.5"
											disabled={isPending}
											onSquare={handleGeolocationSquare}
										/>
									)}
								</div>
								<Input
									aria-invalid={isInvalid}
									autoCapitalize="characters"
									disabled={isPending}
									id="operatorSquare"
									maxLength={3}
									name="operatorSquare"
									onBlur={() => handleFieldBlur(field)}
									onChange={(event) => {
										onClearError();
										handleFieldChange(field, event.target.value.toUpperCase());
									}}
									placeholder="A05"
									ref={operatorSquareRef}
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field
					name="contactSquare"
					validators={{
						onBlur: ({ value, fieldApi }) => {
							const result = qsoFormSchema.shape.contactSquare.safeParse(value);
							if (!result.success) {
								return result.error.issues[0];
							}
							const callsign = fieldApi.form.getFieldValue("contactCallsign");
							if (
								value.trim().toUpperCase() === "DX" &&
								isLithuanianCallsign(callsign)
							) {
								return { message: DX_NOT_ALLOWED_FOR_LY };
							}
							return;
						},
					}}
				>
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<div className="flex items-center justify-between gap-2">
									<FieldLabel htmlFor="contactSquare">
										Korespondento kvadratas
									</FieldLabel>
									<FieldDescription>
										{requiresContactSquare ? "" : "Neprivaloma"}
									</FieldDescription>
								</div>
								<Input
									aria-invalid={isInvalid}
									autoCapitalize="characters"
									disabled={isPending}
									id="contactSquare"
									maxLength={3}
									name="contactSquare"
									onBlur={() => handleFieldBlur(field)}
									onChange={(event) => {
										onClearError();
										handleFieldChange(field, event.target.value.toUpperCase());
									}}
									placeholder="B12 / DX"
									ref={contactSquareRef}
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
			</FieldGroup>
			{formError ? <FieldError>{formError}</FieldError> : null}
			<DialogFooter
				className={onKeepOpenChange ? "sm:justify-between" : undefined}
			>
				{onKeepOpenChange ? (
					<Label
						className="order-last font-normal text-muted-foreground sm:order-first"
						htmlFor="keepOpen"
					>
						<Switch
							checked={keepOpen}
							disabled={isPending}
							id="keepOpen"
							onCheckedChange={onKeepOpenChange}
							size="sm"
						/>
						Neuždaryti lango
					</Label>
				) : null}
				<Button disabled={isPending} type="submit">
					{isPending ? <Spinner /> : <Save />}
					{submitLabel}
				</Button>
			</DialogFooter>
		</form>
	);
}
