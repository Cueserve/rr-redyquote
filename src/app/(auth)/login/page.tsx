import { LoginForm } from "./_components/LoginForm";

/**
 * PRD-001 - email/password via Supabase Auth. The only pre-session route.
 *
 * There is no sign-up link and no password reset by design: accounts are
 * provisioned by an admin (PRD-001), so an unauthenticated visitor has nothing
 * to self-serve here.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12 bg-background">
      <div className="flex flex-col items-center w-full max-w-[380px]">
        <div className="w-full">
          <LoginForm />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Accounts are provisioned by an administrator.
          <br />
          Contact your admin if you cannot sign in.
        </p>
      </div>
    </div>
  );
}
