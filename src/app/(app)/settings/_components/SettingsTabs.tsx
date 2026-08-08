"use client";

import { useIsAdmin } from "@/components/prototype/role-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Settings, SettingsHistoryRow } from "@/lib/mock";
import { SettingsBrandingTab } from "./SettingsBrandingTab";
import { SettingsDefaultsTab } from "./SettingsDefaultsTab";
import { SettingsHistoryTab } from "./SettingsHistoryTab";

/**
 * PRD-012 (estimating defaults), PRD-013 (branding), PRD-018A (audit).
 *
 * Every field here is an INPUT to the pricing formula, not an output of it — a
 * rate, a markup, a percentage, a threshold. That is why this screen can be
 * built in full while the quote builder's summary panel cannot: PRD §2A leaves
 * open how these combine, not what they are.
 *
 * The audit tab is a first-class tab rather than a buried link. `settings_history`
 * is written by a trigger in the same transaction as the change (PRD-018A), so
 * "who moved the margin floor, and when" is answerable — and a screen that can
 * answer it should.
 */

export function SettingsTabs({
  settings,
  history,
}: {
  settings: Settings;
  history: SettingsHistoryRow[];
}) {
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  return (
    <Tabs defaultValue="defaults" className="flex flex-col gap-6">
      <TabsList>
        <TabsTrigger value="defaults">Estimating Defaults</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="history">Change History</TabsTrigger>
      </TabsList>

      <TabsContent value="defaults">
        <SettingsDefaultsTab
          settings={settings}
          readOnly={readOnly}
          isAdmin={isAdmin}
        />
      </TabsContent>

      <TabsContent value="branding">
        <SettingsBrandingTab readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="history">
        <SettingsHistoryTab history={history} />
      </TabsContent>
    </Tabs>
  );
}
