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
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="flex flex-col items-center gap-1.5">
        <h1 className="text-2xl">RedyQuote</h1>
        <p className="text-sm text-muted-foreground">
          Quoting and approval for REDYREF interactive kiosks.
        </p>
      </div>

      <LoginForm />

      <p className="text-xs text-muted-foreground">
        Accounts are provisioned by an administrator. Contact your admin if you
        cannot sign in.
      </p>
    </div>
  );
}
