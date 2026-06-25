"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@WAL-GO/ui/components/avatar";
import { Skeleton } from "@WAL-GO/ui/components/skeleton";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useSession } from "@better-auth-ui/react";
import type { User } from "better-auth";
import { User2 } from "lucide-react";
import type { ReactNode } from "react";

export interface UserAvatarProps {
	className?: string;
	fallback?: ReactNode;
	isPending?: boolean;
	user?: User & { username?: string | null; displayUsername?: string | null };
}

export function UserAvatar({
	className,
	user,
	isPending,
	fallback,
}: UserAvatarProps) {
	const { authClient } = useAuth();
	const { data: session, isPending: sessionPending } = useSession(authClient);

	if ((isPending || sessionPending) && !user) {
		return <Skeleton className={cn("size-8 rounded-full", className)} />;
	}

	const resolvedUser = user ?? session?.user;

	const resolvedUserExt = resolvedUser as
		| (typeof resolvedUser & {
				username?: string | null;
				displayUsername?: string | null;
		  })
		| undefined;
	const initials = (
		resolvedUserExt?.username ||
		resolvedUser?.name ||
		resolvedUser?.email
	)
		?.slice(0, 2)
		.toUpperCase();

	return (
		<Avatar
			className={cn(
				"size-8 rounded-full bg-muted text-foreground text-sm",
				className
			)}
		>
			<AvatarImage
				alt={
					resolvedUserExt?.displayUsername ||
					resolvedUser?.name ||
					resolvedUser?.email
				}
				src={resolvedUser?.image ?? undefined}
			/>

			<AvatarFallback delay={resolvedUser?.image ? 600 : undefined}>
				{fallback || initials || <User2 className="size-4" />}
			</AvatarFallback>
		</Avatar>
	);
}
