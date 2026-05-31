import { isValidWalSquare, normalizeWalSquare } from "@WAL-GO/grid";
import { Button } from "@WAL-GO/ui/components/button";
import { Calendar } from "@WAL-GO/ui/components/calendar";
import { DialogFooter } from "@WAL-GO/ui/components/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@WAL-GO/ui/components/field";
import { Input } from "@WAL-GO/ui/components/input";
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
import { handleFieldChange } from "@WAL-GO/ui/lib/form";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import { format, getHours, getMinutes, isValid, parse, set } from "date-fns";
import { lt } from "date-fns/locale";
import { CalendarIcon, Save } from "lucide-react";
import { z } from "zod";

const BAND_OPTIONS = [
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

const MODE_OPTIONS = ["CW", "SSB", "FM", "DIGI"] as const;
const DATE_TIME_INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";
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

export const EMPTY_QSO_FORM: QsoFormState = {
	contactCallsign: "",
	band: "20m",
	mode: "SSB",
	qsoAt: "",
	operatorSquare: "",
	contactSquare: "",
};

const requiredText = (message: string) => z.string().trim().min(1, message);

const dateTimeSchema = requiredText("Įveskite QSO datą ir laiką").refine(
	(value) => toIsoDateTime(value) !== null,
	"Įveskite teisingą QSO datą ir laiką"
);

const requiredWalSchema = requiredText("Įveskite WAL kvadratą").refine(
	(value) => isValidWalSquare(value),
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

const qsoFormSchema = z.object({
	contactCallsign: requiredText("Įveskite šaukinį"),
	band: z.enum(BAND_OPTIONS),
	mode: z.enum(MODE_OPTIONS),
	qsoAt: dateTimeSchema,
	operatorSquare: requiredWalSchema,
	contactSquare: optionalWalSchema,
});

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
	formError,
	isPending,
	onClearError,
	onSubmit,
	submitLabel,
}: {
	defaultValues: QsoFormState;
	formError: null | string;
	isPending: boolean;
	onClearError: () => void;
	onSubmit: (payload: QsoFormPayload) => void;
	submitLabel: string;
}) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: qsoFormSchema,
		},
		onSubmit: ({ value }) => {
			const qsoAt = toIsoDateTime(value.qsoAt);
			if (!qsoAt) {
				return;
			}
			onSubmit({
				contactCallsign: value.contactCallsign,
				band: value.band,
				mode: value.mode,
				qsoAt,
				operatorSquare: normalizeWalSquare(value.operatorSquare),
				contactSquare:
					value.contactSquare && value.contactSquare.toUpperCase() !== "DX"
						? normalizeWalSquare(value.contactSquare)
						: null,
			});
		},
	});

	return (
		<form
			className="flex flex-col gap-5"
			onSubmit={(event) => {
				event.preventDefault();
				onClearError();
				form.handleSubmit();
			}}
		>
			<FieldGroup className="grid gap-4 md:grid-cols-3">
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
									onBlur={field.handleBlur}
									onChange={(event) => {
										onClearError();
										handleFieldChange(field, event.target.value.toUpperCase());
									}}
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
							<Field className="md:col-span-2" data-invalid={isInvalid}>
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
										disabled={isPending}
										name="qsoAtTime"
										onBlur={field.handleBlur}
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
								<FieldLabel htmlFor="operatorSquare">Mano kvadratas</FieldLabel>
								<Input
									aria-invalid={isInvalid}
									autoCapitalize="characters"
									disabled={isPending}
									id="operatorSquare"
									maxLength={3}
									name="operatorSquare"
									onBlur={field.handleBlur}
									onChange={(event) => {
										onClearError();
										handleFieldChange(field, event.target.value.toUpperCase());
									}}
									placeholder="A05"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
				<form.Field
					name="contactSquare"
					validators={{ onBlur: qsoFormSchema.shape.contactSquare }}
				>
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldContent>
									<FieldLabel htmlFor="contactSquare">
										Korespondento kvadratas
									</FieldLabel>
									<FieldDescription>Neprivaloma</FieldDescription>
								</FieldContent>
								<Input
									aria-invalid={isInvalid}
									autoCapitalize="characters"
									disabled={isPending}
									id="contactSquare"
									maxLength={3}
									name="contactSquare"
									onBlur={field.handleBlur}
									onChange={(event) => {
										onClearError();
										handleFieldChange(field, event.target.value.toUpperCase());
									}}
									placeholder="B12"
									value={field.state.value}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>
			</FieldGroup>
			{formError ? <FieldError>{formError}</FieldError> : null}
			<DialogFooter>
				<Button disabled={isPending} type="submit">
					{isPending ? <Spinner /> : <Save />}
					{submitLabel}
				</Button>
			</DialogFooter>
		</form>
	);
}
