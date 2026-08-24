"use client";

import * as React from "react";
import { Check, Send, TriangleAlert, Undo2 } from "lucide-react";

import { QuoteStatusBadge } from "@/components/quote-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type QuoteStatus } from "@/lib/types/quote";
import type { DbQuote, DbSettings } from "./quote-builder";
import { formatPercent } from "@/lib/utils";

/**
 * The lifecycle actions from PRD-010 / ARCHITECTURE.md §3:
 *
 *     Draft → Review → Approved → Sent
 *              ↑           ↓
 *              └─── Draft ──┘  (request changes)
 *
 * FOUR transitions, not three. The backward one — Review → Draft —
 * is as much a part of the state machine as the other three: it is in PRD-010,
 * in `validate_quote_status_transition` (supabase/migrations/0007_quotes.sql,
 * which clears
 * `submitted_at` on the way), and in the lifecycle invariant CLAUDE.md lists as
 * non-negotiable. It is the one an implementation keeps dropping, because
 * "approve" reads like the only thing an approver does. Without it a quote that
 * needs a correction has nowhere to go and the reviewer's only exit is to
 * approve something they disagree with.
 *
 * WHAT THIS COMPONENT IS: the set of transitions a user is *offered*.
 * WHAT IT IS NOT: the set of transitions a user is *permitted*.
 *
 * That distinction is the whole reason PRODUCT.md §6 names "enforce access
 * control in the UI only" as an anti-pattern. Hiding the Approve button from a
 * rep is a courtesy; the enforcement is a Postgres RLS policy that rejects the
 * write even from a scripted or tampered client (NFR-002). Every button below
 * will call a Server Action that the database is free to refuse — and the UI
 * has to handle that refusal, not assume it cannot happen.
 *
 * No handlers are wired: mutations are Server Actions (ARCHITECTURE.md §5) and
 * none exist yet.
 */

/** Who may be *offered* each transition, per the authorization matrix
 *  (PRD-019, docs/superpowers/specs/2026-07-23-authorization-matrix-design.md). */
function offeredActions({
  status,
  isOwner,
  isAdmin,
}: {
  status: QuoteStatus;
  isOwner: boolean;
  isAdmin: boolean;
}) {
  return {
    // Quote content edits: owner or admin.
    canEdit: (isOwner || isAdmin) && status === "draft",
    canSubmit: (isOwner || isAdmin) && status === "draft",
    // The two gated transitions. BOTH exits from Review are
    // admin-only, and both are enforced by the same `BEFORE UPDATE` trigger --
    // not by RLS, which cannot see the old row and so cannot express a
    // transition at all (supabase/migrations/0007_quotes.sql; the trap that
    // makes adding one costly is docs/DATABASE.md §6.2).
    //
    // `canRequestChanges` deliberately does NOT include `isOwner`. The obvious
    // reading -- "a rep can always pull their own quote back out of review" --
    // is the wrong one under PRD-010, and the trigger raises on it.
    canApprove: isAdmin && status === "pending_approval",
    canRequestChanges: isAdmin && status === "pending_approval",
    canMarkSent: (isOwner || isAdmin) && status === "approved",
  };
}

export function LifecycleBar({
  quote,
  settings,
  isOwner,
  isAdmin,
  isDirty,
  isLoading,
  onSave,
  onSubmit,
  onApprove,
  onRequestChanges,
  onMarkSent,
}: {
  quote: DbQuote | null;
  settings: DbSettings;
  isOwner: boolean;
  isAdmin: boolean;
  isDirty: boolean;
  isLoading?: boolean;
  onSave?: () => void;
  onSubmit?: () => void;
  onApprove?: () => void;
  onRequestChanges?: () => void;
  onMarkSent?: () => void;
}) {
  // One slot, not one boolean per dialog: the two confirmations are mutually
  // exclusive by definition and a pair of booleans can represent a state that
  // cannot happen.
  const [dialog, setDialog] = React.useState<
    "submit" | "request-changes" | null
  >(null);
  const status: QuoteStatus = quote?.status ?? "draft";
  const actions = offeredActions({ status, isOwner, isAdmin });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-md font-semibold tracking-tight">Status</h2>
        <QuoteStatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-2">
        {/* One filled-primary action per screen (DESIGN-SYSTEM.md §6): on the
            builder it is Save, which is the action a rep takes most. */}
        <Button
          disabled={(!actions.canEdit && quote !== null) || isLoading}
          onClick={onSave}
        >
          {quote ? "Save quote" : "Save draft"}
        </Button>

        {actions.canSubmit ? (
          <Button
            variant="secondary"
            onClick={() => setDialog("submit")}
            disabled={isLoading}
          >
            Submit for approval
          </Button>
        ) : null}

        {actions.canApprove ? (
          <Button variant="secondary" onClick={onApprove} disabled={isLoading}>
            <Check />
            Approve
          </Button>
        ) : null}

        {/* Outline, not secondary: the two review exits are offered together,
            and giving them the same weight makes the reviewer read both before
            either. Approve is the moss-filled one because it is the path most
            quotes take -- this is the correction, not the rejection. */}
        {actions.canRequestChanges ? (
          <Button
            variant="outline"
            onClick={() => setDialog("request-changes")}
            disabled={isLoading}
          >
            <Undo2 />
            Request changes
          </Button>
        ) : null}

        {actions.canMarkSent ? (
          <Button variant="secondary" onClick={onMarkSent} disabled={isLoading}>
            <Send />
            Mark as sent
          </Button>
        ) : null}
      </div>

      {status === "pending_approval" && !isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Waiting on an admin. Only an admin can approve this quote or send it
          back for changes — you cannot pull it out of review yourself. Both
          rules are enforced by the database, not by this screen.
        </p>
      ) : null}

      {status === "sent" ? (
        <p className="text-xs text-muted-foreground">
          Sent is the final state. This quote is read-only.
        </p>
      ) : null}

      {status !== "draft" && status !== "sent" ? (
        <p className="text-xs text-muted-foreground">
          A quote is only editable while it is a draft.
        </p>
      ) : null}

      {/* PRD-016: the margin-floor flag must appear in the submit confirmation,
          not only on the page. */}
      <Dialog
        open={dialog === "submit"}
        onOpenChange={(open) => setDialog(open ? "submit" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for approval</DialogTitle>
            <DialogDescription>
              This moves the quote to Review. An admin has to approve it before
              it can be marked sent.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3">
            {quote?.below_margin_floor ? (
              <div className="flex items-start gap-2 rounded-sm border border-destructive-border bg-destructive-muted p-3 text-sm text-destructive">
                <TriangleAlert
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0"
                />
                <p>
                  Margin floor: {formatPercent(settings.margin_floor_percent)} —
                  this quote is below it at {formatPercent(quote.gp_percent)}.
                  Submitting is still allowed.
                </p>
              </div>
            ) : null}

            {isDirty ? (
              <p className="text-sm text-muted-foreground">
                Unsaved line-item changes will be saved as part of submitting.
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                onSubmit?.();
                setDialog(null);
              }}
              disabled={isLoading}
            >
              Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmed rather than fired on click, because it is the only backward
          step in the lifecycle and it is visible to someone else: the owner's
          quote leaves review and lands back in their queue. */}
      <Dialog
        open={dialog === "request-changes"}
        onOpenChange={(open) => setDialog(open ? "request-changes" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>
              This sends the quote back to Draft so{" "}
              {quote?.owner_name ?? "its owner"} can edit it. They can resubmit
              it for approval when it is ready.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              The quote stops counting as submitted — its submission timestamp
              is cleared, so a later resubmission is dated from that second
              submission rather than this one. The change is recorded in the
              quote&rsquo;s history either way.
            </p>
            {/* No reason field, and that is a schema fact rather than a design
                preference: `quote_status_history` records from_status,
                to_status, actor and changed_at, and has no note column
                (docs/DATABASE.md §4.13). A box here would collect a
                reviewer's reasoning and then drop it. Adding the column is a
                DATABASE.md decision, not something to fake in the UI. */}
            <p className="text-sm text-muted-foreground">
              Tell them what to change outside the app — there is nowhere to
              record a reason on the quote yet.
            </p>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                onRequestChanges?.();
                setDialog(null);
              }}
              disabled={isLoading}
            >
              Send back to Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
