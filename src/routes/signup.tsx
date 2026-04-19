import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="flex justify-center">
        <SignUp
          routing="hash"
          signInUrl="/login"
          fallbackRedirectUrl="/"
        />
      </section>
    </main>
  );
}
