import { PageBody, PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";

import { SettingsTabs } from "./_components/SettingsTabs";

export default async function SettingsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const tab =
    typeof searchParams.tab === "string" ? searchParams.tab : "defaults";

  const supabase = await createClient();

  const [settingsRes, historyRes] = await Promise.all([
    supabase.from("settings").select("*").single(),
    supabase
      .from("settings_history")
      .select("*, profiles(full_name)")
      .order("changed_at", { ascending: false }),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (historyRes.error) throw historyRes.error;

  return (
    <PageBody>
      <PageHeader
        title="Settings"
        description="One global row of estimating defaults, plus org-wide branding. Every change is audited."
      />

      <SettingsTabs
        defaultTab={tab}
        settings={settingsRes.data}
        history={historyRes.data.map((row) => ({
          ...row,
          actor_name: row.profiles?.full_name ?? "Unknown",
        }))}
      />
    </PageBody>
  );
}
