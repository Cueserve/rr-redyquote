import { PageBody, PageHeader } from "@/components/layout/page-header";
import { SETTINGS, SETTINGS_HISTORY } from "@/lib/mock";

import { SettingsTabs } from "./_components/SettingsTabs";

/**
 * Estimating defaults, branding, and the audit trail (PRD-012, PRD-013,
 * PRD-018A).
 *
 * The page is shown to reps as well as admins on purpose. ARCHITECTURE.md §7
 * classifies settings as Internal — admin-only to edit, readable by any signed
 * in user — and a rep whose quote is being measured against a 20% margin floor
 * has a legitimate reason to see that number. So the design withholds the
 * controls, not the page.
 */
export default function SettingsPage() {
  return (
    <PageBody>
      <PageHeader
        title="Settings"
        description="One global row of estimating defaults, plus org-wide branding. Every change is audited."
      />

      <SettingsTabs settings={SETTINGS} history={SETTINGS_HISTORY} />
    </PageBody>
  );
}
