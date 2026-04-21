import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth";

export const Route = createFileRoute("/verify-email")({
	component: VerifyEmailPage,
});

function VerifyEmailPage() {
	const navigate = useNavigate();
	const { data, isPending } = authClient.useSession();
	const [otp, setOtp] = useState("");
	const [loading, setLoading] = useState(false);
	const [resending, setResending] = useState(false);

	const email = data?.user?.email;

	if (isPending) return null;

	if (!data?.session) {
		navigate({
			to: "/auth/$pathname",
			params: { pathname: "sign-in" },
		});
		return null;
	}

	if (data.user.emailVerified) {
		navigate({ to: "/" });
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (otp.length !== 6 || !email) return;

		setLoading(true);
		try {
			const result = await (authClient as any).emailOtp.verifyEmail({
				email,
				otp,
			});
			if (result.error) {
				toast.error(result.error.message ?? "Neteisingas kodas");
				setOtp("");
			} else {
				toast.success("El. paštas patvirtintas!");
				navigate({ to: "/" });
			}
		} catch {
			toast.error("Patvirtinimas nepavyko");
			setOtp("");
		} finally {
			setLoading(false);
		}
	}

	async function handleResend() {
		if (!email || resending) return;
		setResending(true);
		try {
			await (authClient as any).emailOtp.sendVerificationOtp({ email });
			toast.success("Kodas išsiųstas iš naujo");
		} catch {
			toast.error("Nepavyko išsiųsti kodo");
		} finally {
			setResending(false);
		}
	}

	return (
		<div className="flex flex-1 items-center justify-center bg-cream2 p-6">
			<div className="w-full max-w-[420px] bg-white rounded-[20px] border border-border shadow-heavy p-10 text-center">
				<div className="text-5xl mb-4">📧</div>
				<h1 className="font-serif text-2xl font-bold text-brown mb-2">
					Patvirtinkite el. paštą
				</h1>
				<p className="text-sm text-brown3 mb-8">
					Įveskite 6 skaitmenų kodą, išsiųstą adresu{" "}
					<span className="font-semibold text-brown">{email}</span>
				</p>

				<form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
					<InputOTP
						maxLength={6}
						value={otp}
						onChange={setOtp}
					>
						<InputOTPGroup>
							<InputOTPSlot index={0} />
							<InputOTPSlot index={1} />
							<InputOTPSlot index={2} />
							<InputOTPSlot index={3} />
							<InputOTPSlot index={4} />
							<InputOTPSlot index={5} />
						</InputOTPGroup>
					</InputOTP>

					<button
						type="submit"
						disabled={loading || otp.length !== 6}
						className="w-full py-3 bg-brown text-white rounded-lg font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-none"
					>
						{loading ? "Tikrinama..." : "Patvirtinti"}
					</button>
				</form>

				<p className="text-sm text-brown3 mt-6">
					Negavote kodo?{" "}
					<button
						type="button"
						onClick={handleResend}
						disabled={resending}
						className="text-ring font-medium hover:underline cursor-pointer bg-transparent border-none p-0 text-sm disabled:opacity-50"
					>
						{resending ? "Siunčiama..." : "Siųsti iš naujo"}
					</button>
				</p>
			</div>
		</div>
	);
}
