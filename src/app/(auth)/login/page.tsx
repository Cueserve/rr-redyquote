import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * PRD-001 — email/password via Supabase Auth. The only pre-session route.
 *
 * No submit handler: authentication is a Server Action away, and this pass is
 * design only. When it lands, this form gets `action={signIn}` pointing at
 * `src/server/actions/`, plus `useActionState` for the error string — the
 * markup below is already shaped for it (a named form, real `name` attributes,
 * a live region reserved for the error).
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

      <Card className="w-full max-w-96">
        <form className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@redyref.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Reserved for the Server Action's error string. */}
          <p aria-live="polite" className="sr-only" />

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground">
        Accounts are provisioned by an administrator. Contact your admin if you
        cannot sign in.
      </p>

      {/* Prototype-only shortcut past a form that cannot authenticate yet. */}
      <Link href="/quotes" className="text-xs">
        Continue to the prototype
      </Link>
    </div>
  );
}
