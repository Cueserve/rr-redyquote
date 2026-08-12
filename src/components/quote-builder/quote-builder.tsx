"use client";

import * as React from "react";

import { useRole } from "@/components/prototype/role-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FreshnessBadge } from "@/components/freshness-badge";
import type {
  Category,
  FabTier,
  LibraryComponent,
  Product,
  ProductDefault,
  Quote,
  QuoteEnvironment,
  QuoteLine,
  QuoteStatusHistoryRow,
  Settings,
} from "@/lib/mock";
import { formatDate, formatMoney } from "@/lib/utils";

import { LifecycleBar } from "./lifecycle-bar";
import { LineItems } from "./line-items";
import { StatusHistory } from "./status-history";
import { SummaryPanel } from "./summary-panel";

/**
 * The one rich client component in the app (ARCHITECTURE.md §1,
 * PROJECT-STRUCTURE.md §3). Shared by `/quotes/new` and `/quotes/[id]` — which
 * is exactly why it lives in `src/components/` rather than either route's
 * `_components/`.
 *
 * In the finished app this is where live recalculation happens on every
 * keystroke, using the same `src/lib/pricing/` module the Server Action calls,
 * so the preview and the persisted value agree. Neither the module nor the
 * action exists yet (PRD §7A), so this pass builds the structure that will hold
 * them: the state shape, the editable-vs-calculated split, the fixed-category
 * layout, and the lifecycle affordances.
 *
 * Data arrives as props rather than being imported. That keeps the swap from
 * fixtures to session-bound Server Component reads a change in the two route
 * files, not in here.
 */

export interface QuoteBuilderProps {
  /** null for a new quote. */
  quote: Quote | null;
  lines: QuoteLine[];
  history: QuoteStatusHistoryRow[];
  products: Product[];
  fabTiers: FabTier[];
  categories: Category[];
  components: LibraryComponent[];
  productDefaults: Record<string, ProductDefault[]>;
  settings: Settings;
  currentUserId: string;
}

const ENVIRONMENTS: { value: QuoteEnvironment; label: string }[] = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
];

export function QuoteBuilder({
  quote,
  lines: initialLines,
  history,
  products,
  fabTiers,
  categories,
  components,
  productDefaults,
  settings,
  currentUserId,
}: QuoteBuilderProps) {
  const { role } = useRole();
  const isAdmin = role === "admin";
  // A new quote belongs to whoever is creating it, so "owner" is true by
  // definition until it is saved.
  const isOwner = quote === null || quote.owner_id === currentUserId;

  const [customerName, setCustomerName] = React.useState(
    quote?.customer_name ?? "",
  );
  const [productId, setProductId] = React.useState(quote?.product_id ?? "");
  const [fabTierId, setFabTierId] = React.useState(quote?.fab_tier_id ?? "");
  const [environment, setEnvironment] = React.useState<QuoteEnvironment>(
    quote?.environment ?? "indoor",
  );
  const [lines, setLines] = React.useState<QuoteLine[]>(initialLines);
  const [editedLineIds, setEditedLineIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  // Counter rather than a random id: a stable sequence keeps server and client
  // markup identical and makes the state legible while debugging.
  const nextLineId = React.useRef(0);
  const makeLineId = () => `new-${(nextLineId.current += 1)}`;

  // Only a draft is editable (PRD-010). Sent is terminal; Review and
  // Approved are locked while they wait on someone.
  const readOnly = quote !== null && quote.status !== "draft";

  const isDirty =
    editedLineIds.size > 0 ||
    (quote !== null &&
      (customerName !== quote.customer_name ||
        productId !== quote.product_id ||
        fabTierId !== quote.fab_tier_id ||
        environment !== quote.environment));

  const tiersForProduct = fabTiers
    .filter((tier) => tier.product_id === productId)
    .sort((a, b) => a.qty_tier - b.qty_tier);
  const selectedTier = tiersForProduct.find((tier) => tier.id === fabTierId);

  const markEdited = (lineId: string) =>
    setEditedLineIds((previous) => new Set(previous).add(lineId));

  /**
   * PRD-005 — picking a product pre-fills the default component for each
   * category. This copies catalog values onto the new lines; it does not price
   * them. `labor_cost` stays 0 and the row renders as edited, so its calculated
   * cell shows an em dash rather than a number this component invented.
   */
  function handleProductChange(nextProductId: string) {
    setProductId(nextProductId);

    const tiers = fabTiers
      .filter((tier) => tier.product_id === nextProductId)
      .sort((a, b) => a.qty_tier - b.qty_tier);
    setFabTierId(tiers[0]?.id ?? "");

    const defaults = productDefaults[nextProductId] ?? [];
    const prefilled: QuoteLine[] = [];
    const edited = new Set<string>();

    for (const category of categories) {
      const componentId =
        defaults.find((entry) => entry.category_id === category.id)
          ?.component_id ?? null;
      if (!componentId) continue;

      const component = components.find((item) => item.id === componentId);
      if (!component) continue;

      const id = makeLineId();
      edited.add(id);
      prefilled.push({
        id,
        quote_id: quote?.id ?? "new",
        category_id: category.id,
        component_id: component.id,
        description: component.name,
        is_misc: false,
        hard_cost: component.cost,
        labor_hours: component.default_labor_hours,
        labor_cost: 0,
        markup_percent: settings.component_markup_percent,
        environment_mismatch:
          component.environment !== "any" &&
          component.environment !== environment,
        sort_order: category.sort_order,
        freshness: component.freshness,
        component_deactivated: !component.active,
      });
    }

    // Misc lines survive a product change — they are not tied to the catalog.
    setLines((previous) => [
      ...prefilled,
      ...previous.filter((l) => l.is_misc),
    ]);
    setEditedLineIds(edited);
  }

  function handleSelectComponent(
    categoryId: string,
    componentId: string | null,
  ) {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;

    setLines((previous) => {
      const others = previous.filter(
        (line) => line.is_misc || line.category_id !== categoryId,
      );
      if (!componentId) return others;

      const component = components.find((item) => item.id === componentId);
      if (!component) return others;

      const existing = previous.find(
        (line) => !line.is_misc && line.category_id === categoryId,
      );
      const id = existing?.id ?? makeLineId();
      markEdited(id);

      return [
        ...others,
        {
          id,
          quote_id: quote?.id ?? "new",
          category_id: categoryId,
          component_id: component.id,
          description: component.name,
          is_misc: false,
          hard_cost: component.cost,
          labor_hours: component.default_labor_hours,
          labor_cost: 0,
          markup_percent: settings.component_markup_percent,
          // PRD-008 — a component rated for one environment on a quote for the
          // other. A comparison against the two stored values, not a rule.
          environment_mismatch:
            component.environment !== "any" &&
            component.environment !== environment,
          sort_order: category.sort_order,
          freshness: component.freshness,
          component_deactivated: !component.active,
        },
      ];
    });
  }

  function handleChangeLine(
    lineId: string,
    field: "description" | "hard_cost" | "labor_hours" | "markup_percent",
    value: string,
  ) {
    markEdited(lineId);
    setLines((previous) =>
      previous.map((line) =>
        line.id === lineId
          ? {
              ...line,
              [field]:
                field === "description" ? value : (Number(value) as number),
            }
          : line,
      ),
    );
  }

  function handleAddMisc() {
    const id = makeLineId();
    markEdited(id);
    setLines((previous) => [
      ...previous,
      {
        id,
        quote_id: quote?.id ?? "new",
        category_id: null,
        component_id: null,
        description: "",
        is_misc: true,
        hard_cost: 0,
        labor_hours: 0,
        labor_cost: 0,
        markup_percent: 0,
        environment_mismatch: false,
        sort_order: 100 + previous.filter((line) => line.is_misc).length,
        freshness: "current",
        component_deactivated: false,
      },
    ]);
  }

  function handleRemoveMisc(lineId: string) {
    markEdited(lineId);
    setLines((previous) => previous.filter((line) => line.id !== lineId));
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:flex xl:items-start">
      <div className="flex min-w-0 flex-col gap-6 xl:flex-1">
        <Card className="flex flex-col gap-5">
          <h2 className="text-md font-semibold tracking-tight">
            Quote Details
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="customer" className="text-sm font-semibold">
                Customer
              </label>
              <Input
                id="customer"
                value={customerName}
                disabled={readOnly}
                placeholder="Customer name"
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Product</span>
              <Select
                value={productId}
                disabled={readOnly}
                onValueChange={handleProductChange}
              >
                <SelectTrigger className="w-full" aria-label="Product">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    // PRD-018 — a deactivated product stays on the quote that
                    // already references it, but is not offered for new ones.
                    .filter(
                      (product) =>
                        product.active || product.id === quote?.product_id,
                    )
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                        {!product.active ? " · deactivated" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Quantity tier</span>
              <Select
                value={fabTierId}
                disabled={readOnly || tiersForProduct.length === 0}
                onValueChange={setFabTierId}
              >
                <SelectTrigger className="w-full" aria-label="Quantity tier">
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {tiersForProduct.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.qty_tier}+ units · {formatMoney(tier.cost)} fab
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* The quoted date is visible here, unlike the tables, because
                  this is the one place a freshness badge has no dated column
                  beside it — and "Aging" is not actionable without knowing
                  aging since when. It used to hide inside the badge's `title`,
                  which only a mouse could reach. */}
              {selectedTier ? (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  Fab cost{" "}
                  <span className="font-mono tabular-nums">
                    {formatMoney(selectedTier.cost)}
                  </span>
                  · quoted {formatDate(selectedTier.quoted_date)}
                  <FreshnessBadge freshness={selectedTier.freshness} />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Pick a product to see its quantity tiers.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold">Environment</span>
              <RadioGroup
                value={environment}
                disabled={readOnly}
                onValueChange={(value) =>
                  setEnvironment(value as QuoteEnvironment)
                }
                className="flex items-center gap-4 py-2.5"
              >
                {ENVIRONMENTS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`env-${option.value}`}
                    />
                    <label
                      htmlFor={`env-${option.value}`}
                      className="text-sm select-none"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </RadioGroup>
              <span className="text-xs text-muted-foreground">
                Components rated for the other environment are flagged, not
                blocked.
              </span>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-4" padding="compact">
          <div className="flex flex-col gap-1 px-3 pt-2">
            <h2 className="text-md font-semibold tracking-tight">Line Items</h2>
            {/* 70ch, matching PageHeader's page-level description. Uncapped
                this ran 660px = 118 characters per line at 1440, well past the
                65-75ch measure. A Card constrains a section's width on some
                screens and not others, so the cap has to be on the prose. */}
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              One line per category, plus any misc lines this job needs. Amber
              fields are typed; plain figures are computed on save.
            </p>
          </div>
          <LineItems
            categories={categories}
            components={components}
            lines={lines}
            environment={environment}
            editedLineIds={editedLineIds}
            readOnly={readOnly}
            onSelectComponent={handleSelectComponent}
            onChangeLine={handleChangeLine}
            onAddMisc={handleAddMisc}
            onRemoveMisc={handleRemoveMisc}
          />
        </Card>
      </div>

      <div className="flex flex-col gap-6 xl:w-88 xl:shrink-0 xl:sticky xl:top-0 xl:self-start">
        <SummaryPanel quote={quote} settings={settings} isDirty={isDirty} />
        <LifecycleBar
          quote={quote}
          settings={settings}
          isOwner={isOwner}
          isAdmin={isAdmin}
          isDirty={isDirty}
        />
        <StatusHistory rows={history} />
      </div>
    </div>
  );
}
