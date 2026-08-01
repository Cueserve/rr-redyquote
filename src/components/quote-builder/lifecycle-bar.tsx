"use client";

import * as React from "react";
import { Check, Send, TriangleAlert } from "lucide-react";

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
import type { Quote, QuoteStatus, Settings } from "@/lib/mock";
import { formatPercent } from "@/lib/utils";

/**
 * The lifecycle actions from PRD-010 / ARCHITECTURE.md §3:
 *
 *     Draft → Pending approval → Approved → Sent
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
    // The one gated transition. Admin only, and enforced by RLS.
    canApprove: isAdmin && status === "pending_approval",
    canMarkSent: (isOwner || isAdmin) && status === "approved",
  };
}

export function LifecycleBar({
  quote,
  settings,
  isOwner,
  isAdmin,
  isDirty,
}: {
  quote: Quote | null;
  settings: Settings;
  isOwner: boolean;
  isAdmin: boolean;
  isDirty: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
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
        <Button disabled={!actions.canEdit && quote !== null}>
          {quote ? "Save quote" : "Save draft"}
        </Button>

        {actions.canSubmit ? (
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Submit for approval
          </Button>
        ) : null}

        {actions.canApprove ? (
          <Button variant="secondary">
            <Check />
            Approve
          </Button>
        ) : null}

        {actions.canMarkSent ? (
          <Button variant="secondary">
            <Send />
            Mark as sent
          </Button>
        ) : null}
      </div>

      {status === "pending_approval" && !isAdmin ? (
        <p className="text-xs text-muted-foreground">
          Waiting on an admin. Only an admin can approve, and that rule is
          enforced by the database — not by this screen.
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
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit for approval</DialogTitle>
            <DialogDescription>
              This moves the quote to Pending approval. An admin has to approve
              it before it can be marked sent.
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
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button>Submit for approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
