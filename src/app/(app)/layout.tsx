import { AppChrome } from "./_components/AppChrome";

/**
 * The authenticated shell. Every route under `(app)` assumes a session.
 *
 * NOT YET HERE, and deliberately so — this is the design pass, with no auth or
 * data wiring (see `src/lib/mock/`). When it lands, the server-side session
 * check belongs in this file:
 *
 *     const supabase = await createClient();
 *     const { data: { user } } = await supabase.auth.getUser();
 *     if (!user) redirect("/login");
 *
 * `src/proxy.ts` refreshes the session cookie but deliberately does not gate
 * routes — its own comment explains why: a middleware redirect is a UX
 * convenience, never the security boundary. The boundary is Postgres RLS.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppChrome>{children}</AppChrome>;
}
