"use client";

import * as React from "react";

import { useIsAdmin } from "@/components/prototype/role-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/lib/supabase/types";
type Settings = Tables<"settings">;
import type { SettingsHistoryRow } from "./SettingsHistoryTab";
import {
  NUMERIC_SETTING_KEYS,
  validateSettingsDraft,
  type NumericSettingKey,
  type SettingsDraft,
  type SettingsFieldErrors,
} from "@/lib/validation/settings";
import { SettingsBrandingTab } from "./SettingsBrandingTab";
import { SettingsDefaultsTab, settingFieldId } from "./SettingsDefaultsTab";
import { SettingsHistoryTab } from "./SettingsHistoryTab";

/**
 * PRD-012 (estimating defaults), PRD-013 (branding), PRD-018A (audit).
 *
 * Every field here is an INPUT to the pricing formula, not an output of it — a
 * rate, a markup, a percentage, a threshold. That is why this screen can be
 * built in full while the quote builder's summary panel cannot: PRD §7A leaves
 * open how these combine, not what they are.
 *
 * The audit tab is a first-class tab rather than a buried link. `settings_history`
 * is written by a trigger in the same transaction as the change (PRD-018A), so
 * "who moved the margin floor, and when" is answerable — and a screen that can
 * answer it should.
 */

/** Indexing `settings` by these keys is what proves the key list still matches
 *  the row shape: rename a column and this stops compiling. */
function toSettingsDraft(settings: Settings): SettingsDraft {
  return Object.fromEntries(
    NUMERIC_SETTING_KEYS.map((key) => [key, String(settings[key])]),
  ) as SettingsDraft;
}

export function SettingsTabs({
  settings,
  history,
}: {
  settings: Settings;
  history: SettingsHistoryRow[];
}) {
  const isAdmin = useIsAdmin();
  const readOnly = !isAdmin;

  /**
   * The draft and its errors are owned here, ABOVE `Tabs`, because Radix
   * unmounts an inactive `TabsContent`. Held one level down in
   * SettingsDefaultsTab, uncontrolled inputs remounted from their props on
   * every tab change and silently threw the edit away: measured, a labor rate
   * typed as 999 read back as 50 after a round trip to the Branding tab, with
   * no warning and nothing to undo. Errors live here for the same reason —
   * a validation message that vanishes when you check the logo is no better.
   *
   * Seeded once on mount by design. `settings` is the saved row, so resyncing
   * the draft to it would overwrite whatever the admin is part-way through
   * typing — the two are meant to diverge until a save reconciles them.
   */
  const [draft, setDraft] = React.useState(() => toSettingsDraft(settings));
  const [errors, setErrors] = React.useState<SettingsFieldErrors>({});

  /**
   * Validate on submit, then on every keystroke after that. Validating before
   * the first submit scolds an admin for a field they have not finished typing
   * ("1" is not yet "12"); never re-validating leaves a message contradicting
   * what is on screen. The cross-field freshness rule makes the second failure
   * concrete: fixing "Aging after" has to clear the error sitting on the OTHER
   * field, which only a full re-check can do.
   */
  const [validateWhileTyping, setValidateWhileTyping] = React.useState(false);

  function handleFieldChange(key: NumericSettingKey, value: string) {
    // Computed outside the updater on purpose: the re-validation below is a
    // side effect, and a state updater must stay pure to survive StrictMode's
    // double invocation.
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (validateWhileTyping) {
      setErrors(validateSettingsDraft(next).errors);
    }
  }

  function handleSubmit() {
    setValidateWhileTyping(true);

    const result = validateSettingsDraft(draft);
    setErrors(result.errors);

    if (!result.ok) {
      // First invalid field in edit order, not in the order Zod happened to
      // report. `getElementById` rather than a ref map because the ids are
      // deterministic and already ours (settingFieldId), and eight refs
      // threaded through two field groups buys nothing.
      const firstInvalid = NUMERIC_SETTING_KEYS.find(
        (key) => result.errors[key],
      );
      if (firstInvalid) {
        document.getElementById(settingFieldId(firstInvalid))?.focus();
      }
      return;
    }

    // The Server Action goes here, and nothing stands in for it: PRD §7A is
    // unsigned and docs/DATABASE.md §6 blocks wiring the save RPC until it is.
    // `result.values` is the parsed row it will take. A fake success toast
    // would make an unwired screen read as a working one — the login form
    // reserves its error slot the same way rather than pretending.
  }

  return (
    <Tabs defaultValue="defaults" className="flex flex-col gap-6">
      <TabsList>
        <TabsTrigger value="defaults">Estimating Defaults</TabsTrigger>
        <TabsTrigger value="branding">Branding</TabsTrigger>
        <TabsTrigger value="history">Change History</TabsTrigger>
      </TabsList>

      <TabsContent value="defaults">
        <SettingsDefaultsTab
          draft={draft}
          errors={errors}
          readOnly={readOnly}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
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
