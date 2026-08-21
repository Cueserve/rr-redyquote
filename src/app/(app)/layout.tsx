import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppChrome } from "./_components/AppChrome";

/**
 * The authenticated shell. Every route under `(app)` assumes a session.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const name = (profile?.full_name?.trim() || user.email) ?? "Unknown User";

  const roleLabel =
    profile?.role === "admin" ? "Administrator" : "Sales Representative";

  return (
    <AppChrome name={name} roleLabel={roleLabel}>
      {children}
    </AppChrome>
  );
}
