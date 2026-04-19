import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function getClerkUser(userId: string) {
  const clerk = clerkClient();
  return clerk.users.getUser(userId);
}

export const requireAuthFn = createServerFn().handler(async () => {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/login" });
  }
  const user = await getClerkUser(userId);
  if (!user.username) {
    throw redirect({ to: "/onboarding" });
  }
  return { userId, callsign: user.username };
});

export const requireOnboardingAuthFn = createServerFn().handler(async () => {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/login" });
  }
  return { userId };
});

export const requireAdminFn = createServerFn().handler(async () => {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/login" });
  }
  const user = await getClerkUser(userId);
  if (!user.username) {
    throw redirect({ to: "/onboarding" });
  }
  const isAdmin =
    (user.publicMetadata as { admin?: boolean } | undefined)?.admin === true;
  if (!isAdmin) {
    throw redirect({ to: "/" });
  }
  return { userId, callsign: user.username };
});

const callsignSchema = z
  .string()
  .min(3)
  .max(10)
  .regex(
    /^[A-Z0-9]+$/,
    "Callsign must be uppercase letters and digits only",
  );

export const setCallsignFn = createServerFn()
  .inputValidator(z.object({ callsign: z.string() }))
  .handler(async ({ data }) => {
    const { isAuthenticated, userId } = await auth();
    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/login" });
    }

    const parsed = callsignSchema.safeParse(data.callsign.trim().toUpperCase());
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0].message);
    }

    const clerk = clerkClient();
    await clerk.users.updateUser(userId, { username: parsed.data });

    return { callsign: parsed.data };
  });
