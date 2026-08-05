import { PageBody } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

// DESIGN-SYSTEM.md §11: "Empty and loading states are plain. 'Loading…' — no
// illustration, no cute copy." No skeleton shimmer either — motion is limited
// to 120–160ms opacity fades on toasts, tooltips and dialogs (§9).
export default function LibraryLoading() {
  return (
    <PageBody>
      <EmptyState>
        <p>Loading…</p>
      </EmptyState>
    </PageBody>
  );
}
