import {
	NewsletterEmail,
	WALGO_NEWSLETTER_DEFAULTS,
	WALGO_NEWSLETTER_LOCALIZATION,
} from "@WAL-GO/email/newsletter-email";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@WAL-GO/ui/components/alert-dialog";
import { Button } from "@WAL-GO/ui/components/button";
import { Input } from "@WAL-GO/ui/components/input";
import { Label } from "@WAL-GO/ui/components/label";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { Textarea } from "@WAL-GO/ui/components/textarea";
import { render } from "@react-email/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { createElement, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

interface SectionDraft {
	body: string;
	imageUrl: string;
	linkLabel: string;
	title: string;
	url: string;
}

const emptySection = (): SectionDraft => ({
	title: "",
	body: "",
	url: "",
	linkLabel: "",
	imageUrl: "",
});

const trimmedOrUndefined = (value: string) => {
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
};

export function NewsletterTab() {
	const queryClient = useQueryClient();
	const audienceKey = orpc.admin.newsletter.audience.queryOptions().queryKey;
	const { data: audience, isPending: isAudiencePending } = useQuery(
		orpc.admin.newsletter.audience.queryOptions()
	);

	const syncContacts = useMutation(
		orpc.admin.newsletter.syncContacts.mutationOptions({
			onSuccess: ({ created }) => {
				queryClient.invalidateQueries({ queryKey: audienceKey });
				toast.success(
					created > 0
						? `Pridėta naujų kontaktų: ${created}`
						: "Visi naudotojai jau yra auditorijoje"
				);
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const [subject, setSubject] = useState("");
	const [label, setLabel] = useState("");
	const [heading, setHeading] = useState("");
	const [intro, setIntro] = useState("");
	const [sections, setSections] = useState<SectionDraft[]>([]);
	const [ctaLabel, setCtaLabel] = useState("");
	const [ctaUrl, setCtaUrl] = useState("");

	const send = useMutation(
		orpc.admin.newsletter.send.mutationOptions({
			onSuccess: () => {
				toast.success("Naujienlaiškis išsiųstas");
				setSubject("");
				setLabel("");
				setHeading("");
				setIntro("");
				setSections([]);
				setCtaLabel("");
				setCtaUrl("");
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const updateSection = (index: number, patch: Partial<SectionDraft>) => {
		setSections((prev) =>
			prev.map((section, i) =>
				i === index ? { ...section, ...patch } : section
			)
		);
	};

	const removeSection = (index: number) => {
		setSections((prev) => prev.filter((_, i) => i !== index));
	};

	// Lenient preview content: drop empty sections, fall back to a placeholder
	// heading and require the CTA label/URL together, so partial drafts render
	// while the admin is still typing.
	const previewContent = useMemo(() => {
		const ctaPair = ctaLabel.trim() && ctaUrl.trim();
		return {
			label: trimmedOrUndefined(label),
			heading: heading.trim() || "Antraštė",
			intro: trimmedOrUndefined(intro),
			sections: sections
				.filter((section) => section.title.trim() && section.body.trim())
				.map((section) => ({
					title: section.title.trim(),
					body: section.body.trim(),
					imageUrl: trimmedOrUndefined(section.imageUrl),
					url: trimmedOrUndefined(section.url),
					linkLabel: trimmedOrUndefined(section.linkLabel),
				})),
			ctaLabel: ctaPair ? ctaLabel.trim() : undefined,
			ctaUrl: ctaPair ? ctaUrl.trim() : undefined,
			preview: trimmedOrUndefined(intro),
		};
	}, [label, heading, intro, sections, ctaLabel, ctaUrl]);

	const debouncedContent = useDebounced(previewContent, 400);
	const [previewHtml, setPreviewHtml] = useState<string>();
	const [isPreviewPending, setIsPreviewPending] = useState(true);

	useEffect(() => {
		let active = true;
		setIsPreviewPending(true);
		render(
			createElement(NewsletterEmail, {
				...WALGO_NEWSLETTER_DEFAULTS,
				...debouncedContent,
				localization: WALGO_NEWSLETTER_LOCALIZATION,
			})
		)
			.then((html) => {
				if (active) {
					setPreviewHtml(html);
				}
			})
			.finally(() => {
				if (active) {
					setIsPreviewPending(false);
				}
			});
		return () => {
			active = false;
		};
	}, [debouncedContent]);

	const canSend =
		subject.trim() !== "" && heading.trim() !== "" && !send.isPending;

	const handleSend = () => {
		send.mutate({
			subject: subject.trim(),
			heading: heading.trim(),
			label: trimmedOrUndefined(label),
			intro: trimmedOrUndefined(intro),
			ctaLabel: trimmedOrUndefined(ctaLabel),
			ctaUrl: trimmedOrUndefined(ctaUrl),
			sections: sections
				.filter(
					(section) => section.title.trim() !== "" && section.body.trim() !== ""
				)
				.map((section) => ({
					title: section.title.trim(),
					body: section.body.trim(),
					url: trimmedOrUndefined(section.url),
					linkLabel: trimmedOrUndefined(section.linkLabel),
					imageUrl: trimmedOrUndefined(section.imageUrl),
				})),
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-4xl border border-border bg-card p-5">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="font-semibold text-lg">Prenumeratorių auditorija</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							Prenumeratą ir atsisakymą tvarko Resend. Sinchronizavimas prideda
							naudotojus, kurių dar nėra auditorijoje (atsisakiusiųjų neliečia).
						</p>
					</div>
					<Button
						disabled={syncContacts.isPending}
						onClick={() => syncContacts.mutate({})}
						size="sm"
						variant="outline"
					>
						{syncContacts.isPending ? (
							<Spinner />
						) : (
							<RefreshCw className="size-4" />
						)}
						Sinchronizuoti
					</Button>
				</div>

				<AudienceSummary audience={audience} isPending={isAudiencePending} />
			</section>

			<div className="flex flex-col gap-6">
				<section className="flex flex-col gap-4 rounded-4xl border border-border bg-card p-5">
					<h2 className="font-semibold text-lg">Naujas naujienlaiškis</h2>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field id="nl-subject" label="Tema (privaloma)">
							<Input
								id="nl-subject"
								onChange={(e) => setSubject(e.target.value)}
								placeholder="Naujienos iš eterio – WAL GO"
								value={subject}
							/>
						</Field>
						<Field id="nl-label" label="Etiketė virš antraštės">
							<Input
								id="nl-label"
								onChange={(e) => setLabel(e.target.value)}
								placeholder="2026 sezonas · Nr. 1"
								value={label}
							/>
						</Field>
					</div>

					<Field id="nl-heading" label="Antraštė (privaloma)">
						<Input
							id="nl-heading"
							onChange={(e) => setHeading(e.target.value)}
							placeholder="Naujienos iš eterio"
							value={heading}
						/>
					</Field>

					<Field id="nl-intro" label="Įžanga">
						<Textarea
							id="nl-intro"
							onChange={(e) => setIntro(e.target.value)}
							placeholder="Sveiki, radijo mėgėjai!…"
							rows={3}
							value={intro}
						/>
						<MarkdownHint />
					</Field>

					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="font-medium text-sm">Skiltys</span>
							<Button
								onClick={() => setSections((prev) => [...prev, emptySection()])}
								size="sm"
								type="button"
								variant="outline"
							>
								<Plus className="size-4" />
								Pridėti skiltį
							</Button>
						</div>

						{sections.map((section, index) => (
							<div
								className="flex flex-col gap-3 rounded-2xl border border-border border-dashed p-4"
								// biome-ignore lint/suspicious/noArrayIndexKey: drafts have no stable id
								key={index}
							>
								<div className="flex items-center justify-between gap-2">
									<span className="text-muted-foreground text-xs">
										Skiltis {index + 1}
									</span>
									<Button
										onClick={() => removeSection(index)}
										size="icon-sm"
										type="button"
										variant="ghost"
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
								<Input
									onChange={(e) =>
										updateSection(index, { title: e.target.value })
									}
									placeholder="Skilties antraštė"
									value={section.title}
								/>
								<Textarea
									onChange={(e) =>
										updateSection(index, { body: e.target.value })
									}
									placeholder="Skilties tekstas&#10;&#10;- punktas&#10;- punktas"
									rows={4}
									value={section.body}
								/>
								<MarkdownHint />
								<div className="grid gap-3 sm:grid-cols-2">
									<Input
										onChange={(e) =>
											updateSection(index, { imageUrl: e.target.value })
										}
										placeholder="Paveikslėlio URL (nebūtina)"
										value={section.imageUrl}
									/>
									<Input
										onChange={(e) =>
											updateSection(index, { url: e.target.value })
										}
										placeholder="Nuorodos URL (nebūtina)"
										value={section.url}
									/>
								</div>
								<Input
									onChange={(e) =>
										updateSection(index, { linkLabel: e.target.value })
									}
									placeholder="Nuorodos tekstas (nebūtina)"
									value={section.linkLabel}
								/>
							</div>
						))}
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<Field id="nl-cta-label" label="Mygtuko tekstas">
							<Input
								id="nl-cta-label"
								onChange={(e) => setCtaLabel(e.target.value)}
								placeholder="Registruoti ryšį"
								value={ctaLabel}
							/>
						</Field>
						<Field id="nl-cta-url" label="Mygtuko nuoroda">
							<Input
								id="nl-cta-url"
								onChange={(e) => setCtaUrl(e.target.value)}
								placeholder="https://walgo.lt"
								value={ctaUrl}
							/>
						</Field>
					</div>

					<div className="flex justify-end">
						<AlertDialog>
							<AlertDialogTrigger
								render={
									<Button disabled={!canSend}>
										{send.isPending ? <Spinner /> : <Send className="size-4" />}
										Siųsti naujienlaiškį
									</Button>
								}
							/>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Siųsti naujienlaiškį?</AlertDialogTitle>
									<AlertDialogDescription>
										{audience?.configured
											? `Laiškas bus išsiųstas ${audience.subscribed} prenumeratoriams. Šio veiksmo atšaukti negalima.`
											: "Auditorija nenustatyta — siuntimas nepavyks."}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Atšaukti</AlertDialogCancel>
									<AlertDialogAction onClick={handleSend}>
										Siųsti
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</section>

				<NewsletterPreview html={previewHtml} isPending={isPreviewPending} />
			</div>
		</div>
	);
}

function NewsletterPreview({
	html,
	isPending,
}: {
	html: string | undefined;
	isPending: boolean;
}) {
	return (
		<section className="flex flex-col gap-4 rounded-4xl border border-border bg-card p-5">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">Peržiūra</h2>
				{isPending && <Spinner className="size-4" />}
			</div>
			<div className="overflow-hidden rounded-2xl border border-border bg-white">
				{html ? (
					<iframe
						className="h-[720px] w-full"
						sandbox=""
						srcDoc={html}
						title="Naujienlaiškio peržiūra"
					/>
				) : (
					<div className="flex h-[720px] items-center justify-center">
						<Spinner className="size-6" />
					</div>
				)}
			</div>
		</section>
	);
}

function useDebounced<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timeout = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timeout);
	}, [value, delayMs]);

	return debounced;
}

interface AudienceData {
	configured: boolean;
	subscribed: number;
	total: number;
	unsubscribed: number;
}

function AudienceSummary({
	audience,
	isPending,
}: {
	audience: AudienceData | undefined;
	isPending: boolean;
}) {
	if (isPending) {
		return (
			<div className="flex justify-center py-4">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (!audience?.configured) {
		return (
			<p className="mt-4 rounded-2xl bg-muted/40 p-3 text-muted-foreground text-sm">
				Nenustatytas <code>RESEND_SEGMENT_ID</code>. Sukurkite segmentą Resend
				ir nustatykite kintamąjį, kad galėtumėte siųsti.
			</p>
		);
	}

	return (
		<dl className="mt-4 grid grid-cols-3 gap-3 text-center">
			<Stat label="Iš viso" value={audience.total} />
			<Stat label="Prenumeruoja" value={audience.subscribed} />
			<Stat label="Atsisakė" value={audience.unsubscribed} />
		</dl>
	);
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-2xl bg-muted/40 p-3">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="mt-1 font-semibold text-2xl tabular-nums">{value}</dd>
		</div>
	);
}

function MarkdownHint() {
	return (
		<p className="text-muted-foreground text-xs">
			Galima naudoti Markdown: **paryškinta**, sąrašai (- punktas), nuorodos
			[tekstas](https://…), nauja pastraipa — tuščia eilutė.
		</p>
	);
}

function Field({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={id}>{label}</Label>
			{children}
		</div>
	);
}
