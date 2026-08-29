"use client";

import { Button, buttonVariants } from "@WAL-GO/ui/components/button";
import { Card, CardContent } from "@WAL-GO/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@WAL-GO/ui/components/dropdown-menu";
import { Spinner } from "@WAL-GO/ui/components/spinner";
import { UserAvatar } from "@WAL-GO/ui/components/user/user-avatar";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useSession, useUpdateUser } from "@better-auth-ui/react";
import { Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

export interface ChangeAvatarProps {
	className?: string;
}

const UPLOAD_ERROR =
	"Nepavyko pakeisti profilio nuotraukos. Bandykite dar kartą.";
const DELETE_ERROR = "Nepavyko ištrinti profilio nuotraukos failo.";

export function ChangeAvatar({ className }: ChangeAvatarProps) {
	const { authClient, avatar, localization } = useAuth();
	const { data: session } = useSession(authClient);

	const { mutateAsync: updateUser, isPending: updatePending } =
		useUpdateUser(authClient);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const isPending = updatePending || isUploading || isDeleting;

	const showError = (error: unknown, fallback: string) => {
		toast.error(error instanceof Error ? error.message : fallback);
	};

	async function deleteStoredAvatar(url: string): Promise<void> {
		if (!avatar.delete) {
			toast.error(DELETE_ERROR);
			return;
		}

		try {
			await avatar.delete(url);
		} catch (error) {
			showError(error, DELETE_ERROR);
		}
	}

	async function uploadSelectedAvatar(file: File): Promise<string | undefined> {
		try {
			const resized =
				(await avatar.resize?.(file, avatar.size, avatar.extension)) ?? file;
			const image = await avatar.upload?.(resized);
			if (!image) {
				throw new Error(UPLOAD_ERROR);
			}
			return image;
		} catch (error) {
			showError(error, UPLOAD_ERROR);
			return;
		}
	}

	async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}

		e.target.value = "";
		setIsUploading(true);
		const currentImage = session?.user.image;
		const uploadedImage = await uploadSelectedAvatar(file);
		if (!uploadedImage) {
			setIsUploading(false);
			return;
		}

		try {
			await updateUser({ image: uploadedImage });
		} catch {
			await deleteStoredAvatar(uploadedImage);
			setIsUploading(false);
			return;
		}

		toast.success(localization.settings.avatarChangedSuccess);
		if (currentImage && currentImage !== uploadedImage) {
			await deleteStoredAvatar(currentImage);
		}
		setIsUploading(false);
	}

	async function handleDelete() {
		const currentImage = session?.user.image;
		setIsDeleting(true);

		try {
			await updateUser({ image: null });
		} catch {
			setIsDeleting(false);
			return;
		}

		toast.success(localization.settings.avatarDeletedSuccess);
		if (currentImage) {
			await deleteStoredAvatar(currentImage);
		}
		setIsDeleting(false);
	}

	if (!avatar.enabled) {
		return null;
	}

	return (
		<div>
			<h2 className="mb-3 font-semibold text-sm">
				{localization.settings.avatar}
			</h2>

			<Card className={cn(className)}>
				<CardContent className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
					<input
						accept="image/jpeg,image/png,image/webp"
						className="hidden"
						onChange={handleFileChange}
						ref={fileInputRef}
						type="file"
					/>

					<Button
						aria-busy={isPending}
						aria-label={localization.settings.uploadAvatar}
						className="relative h-auto w-auto self-center rounded-full p-0"
						disabled={!session || isPending}
						onClick={() => fileInputRef.current?.click()}
						title={localization.settings.uploadAvatar}
						type="button"
						variant="ghost"
					>
						<span aria-hidden="true">
							<UserAvatar
								className={cn("size-16", isPending && "opacity-50")}
							/>
						</span>
						{isPending && (
							<Spinner aria-hidden="true" className="absolute size-5" />
						)}
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger
							className={cn(
								buttonVariants({ variant: "secondary", size: "sm" }),
								"w-full sm:w-auto"
							)}
							disabled={!session || isPending}
						>
							{isPending && (
								<Spinner aria-hidden="true" data-icon="inline-start" />
							)}

							{localization.settings.changeAvatar}
						</DropdownMenuTrigger>

						<DropdownMenuContent className="min-w-fit">
							<DropdownMenuGroup>
								<DropdownMenuItem
									className="cursor-pointer"
									onClick={() => fileInputRef.current?.click()}
								>
									<Upload />

									{localization.settings.uploadAvatar}
								</DropdownMenuItem>

								<DropdownMenuItem
									className="cursor-pointer"
									disabled={!session?.user.image}
									onClick={handleDelete}
									variant="destructive"
								>
									<Trash2 />

									{localization.settings.deleteAvatar}
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardContent>
			</Card>
		</div>
	);
}
