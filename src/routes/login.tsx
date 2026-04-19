import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="flex justify-center">
        <SignIn
          routing="hash"
          signUpUrl="/signup"
          fallbackRedirectUrl="/"
        />
      </section>
    </main>
  );
}
