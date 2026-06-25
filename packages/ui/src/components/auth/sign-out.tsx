"use client";

import { Spinner } from "@WAL-GO/ui/components/spinner";
import { cn } from "@WAL-GO/ui/lib/utils";
import { useAuth, useSignOut } from "@better-auth-ui/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export interface SignOutProps {
	className?: string;
}

export function SignOut({ className }: SignOutProps) {
	const { authClient, basePaths, navigate, viewPaths } = useAuth();

	const { mutate: signOut } = useSignOut(authClient, {
		onError: (error) => {
			toast.error(error.error?.message || error.message);

			navigate({
				to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
				replace: true,
			});
		},
		onSuccess: () =>
			navigate({
				to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
				replace: true,
			}),
	});

	const hasSignedOut = useRef(false);

	useEffect(() => {
		if (hasSignedOut.current) {
			return;
		}
		hasSignedOut.current = true;

		signOut();
	}, [signOut]);

	return <Spinner className={cn("mx-auto my-auto", className)} />;
}
