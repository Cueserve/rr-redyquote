# Graph Report - . (2026-08-09)

## Corpus Check

- 120 files · ~71,169 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 626 nodes · 1436 edges · 50 communities (23 shown, 27 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.83)
- Token cost: 488,950 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Shared UI Primitives & Formatters|Shared UI Primitives & Formatters]]
- [[_COMMUNITY_Mock Data Layer & Detail Pages|Mock Data Layer & Detail Pages]]
- [[_COMMUNITY_Core Product & Architecture Docs|Core Product & Architecture Docs]]
- [[_COMMUNITY_Settings Schema & Auth Migrations|Settings Schema & Auth Migrations]]
- [[_COMMUNITY_App Shell & List Page States|App Shell & List Page States]]
- [[_COMMUNITY_Database Entities & Pricing PRD|Database Entities & Pricing PRD]]
- [[_COMMUNITY_Nav Shell & Role Context|Nav Shell & Role Context]]
- [[_COMMUNITY_Repo Tooling Configs|Repo Tooling Configs]]
- [[_COMMUNITY_Quote Builder & Settings UI|Quote Builder & Settings UI]]
- [[_COMMUNITY_Dialog, Toast & Card Primitives|Dialog, Toast & Card Primitives]]
- [[_COMMUNITY_Supabase Client & Env Config|Supabase Client & Env Config]]
- [[_COMMUNITY_shadcn Config Schema|shadcn Config Schema]]
- [[_COMMUNITY_TypeScript & Vitest Config|TypeScript & Vitest Config]]
- [[_COMMUNITY_PRD Requirements & List Pages|PRD Requirements & List Pages]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_npm Scripts|npm Scripts]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Data Table Components & PRDs|Data Table Components & PRDs]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Husky Setup|Husky Setup]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Extensions Migration & Linked Project|Extensions Migration & Linked Project]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Husky Entry Script|Husky Entry Script]]
- [[_COMMUNITY_Settings Branding Tab|Settings Branding Tab]]
- [[_COMMUNITY_Dark Mode Token Derivation|Dark Mode Token Derivation]]
- [[_COMMUNITY_PRD-007|PRD-007]]
- [[_COMMUNITY_PRD-017|PRD-017]]
- [[_COMMUNITY_Environment Type Enum|Environment Type Enum]]
- [[_COMMUNITY_Quote Environment Enum|Quote Environment Enum]]
- [[_COMMUNITY_Quote Status Enum|Quote Status Enum]]
- [[_COMMUNITY_Next.js Config Module|Next.js Config Module]]
- [[_COMMUNITY_RedyRef Logo Asset|RedyRef Logo Asset]]
- [[_COMMUNITY_Proxy Config|Proxy Config]]
- [[_COMMUNITY_Dialog Trigger|Dialog Trigger]]
- [[_COMMUNITY_Select Group|Select Group]]
- [[_COMMUNITY_Toast Action|Toast Action]]
- [[_COMMUNITY_Toast Description|Toast Description]]
- [[_COMMUNITY_Toast Provider|Toast Provider]]
- [[_COMMUNITY_Toast Title|Toast Title]]
- [[_COMMUNITY_Toast Viewport|Toast Viewport]]
- [[_COMMUNITY_formatDate Helper|formatDate Helper]]
- [[_COMMUNITY_formatDateTime Helper|formatDateTime Helper]]
- [[_COMMUNITY_formatHours Helper|formatHours Helper]]
- [[_COMMUNITY_formatPercent Helper|formatPercent Helper]]

## God Nodes (most connected - your core abstractions)

1. `cn()` - 65 edges
2. `PageBody()` - 20 edges
3. `PageHeader()` - 18 edges
4. `Card()` - 18 edges
5. `Button()` - 17 edges
6. `QuoteBuilder()` - 16 edges
7. `compilerOptions` - 16 edges
8. `settings table` - 14 edges
9. `LineItems()` - 13 edges
10. `EmptyState()` - 13 edges

## Surprising Connections (you probably didn't know these)

- `FreshnessBadge()` --references--> `DESIGN-SYSTEM.md §7: Editable vs Calculated Convention` [EXTRACTED]
  src/components/freshness-badge.tsx → docs/DESIGN-SYSTEM.md
- `PageHeader()` --references--> `DESIGN-SYSTEM.md §9: Density Rule & Sidebar Collapse` [EXTRACTED]
  src/components/layout/page-header.tsx → docs/DESIGN-SYSTEM.md
- `LifecycleBar()` --references--> `DESIGN-SYSTEM.md §6: One Clay Action Per Screen` [EXTRACTED]
  src/components/quote-builder/lifecycle-bar.tsx → docs/DESIGN-SYSTEM.md
- `formatMoney` --semantically_similar_to--> `settings table` [INFERRED] [semantically similar]
  src/lib/utils.ts → supabase/migrations/0003_settings.sql
- `ComponentDetailPage()` --cites--> `NFR-005 Price History Append-Only` [EXTRACTED]
  src/app/(app)/library/[id]/page.tsx → docs/PRD.md

## Import Cycles

- None detected.

## Hyperedges (group relationships)

- **Migration Immutability Guard Flow (hook + settings + db:push)** — claude_settings_config, hooks_block_applied_migration_hook, package_json_module [EXTRACTED 1.00]
- **Husky Git Hook Dispatch Chain** — __h, __pre_commit, __commit_msg, __pre_push, package_json_module [EXTRACTED 1.00]
- **shadcn/Tailwind Semantic Token UI Pipeline** — components_shadcn_config, eslint_config_ui_boundary_rule, postcss_config_module, package_json_module [INFERRED 0.85]
- **Route error boundaries hide raw Postgres errors as Confidential pricing data (ARCHITECTURE.md §7)** — library_error_libraryerror, products_error_productserror, quotes_error_quoteserror, architecture_md [EXTRACTED 1.00]
- **List loading boundary rule: (list) route-group loading.tsx isolates the list segment's Suspense boundary** — list_loading_libraryloading, list_loading_productsloading, list_loading_quotesloading, project_structure_md [EXTRACTED 1.00]
- **Atomic multi-row save invariant: product+tiers+defaults and quote header+lines write in one Postgres transaction (PRD-015, ARCHITECTURE.md §3)** — _components_producteditor_producteditor, quote_builder_quote_builder_quotebuilder, prd_015, architecture_md [EXTRACTED 1.00]
- **Settings Screen Tab Composition** — settings_page_settingspage, _components_settingstabs_settingstabs, _components_settingsdefaultstab_settingsdefaultstab, _components_settingshistorytab_settingshistorytab [EXTRACTED 0.90]
- **Prototype-Only Client-Side Role Switch** — prototype_role_context_roleprovider, prototype_admin_only_adminonly, prototype_role_toggle_roletoggle [EXTRACTED 0.95]
- **Quote Builder Screen Composition** — quote_builder_quote_builder_quotebuilder, quote_builder_lifecycle_bar_lifecyclebar, quote_builder_line_items_lineitems, quote_builder_summary_panel_summarypanel, quote_builder_status_history_statushistory [INFERRED 0.85]
- **Tint/ink/border status-token triad shared across status-communicating primitives** — ui_badge_badgevariants, ui_toast_toastvariants, ui_kpi_stat_kpivaluevariants [INFERRED 0.85]
- **Mock data layer standing in for the future Supabase read path (types -> fixtures -> lookup helpers)** — mock_types_quote, mock_data_quotes, mock_index_getquote [EXTRACTED 1.00]
- **Shared 120-160ms fade in/out overlay motion across Toast, Dialog, and Tooltip** — ui_toast_toastvariants, ui_dialog_dialogcontentvariants, ui_tooltip_tooltipcontent [EXTRACTED 1.00]
- **settings percent-unit decision spanning migrations 0003-0004, types.ts, and validation/settings.ts** — migrations_0003_settings_table, migrations_0004_rename_markup_columns, migrations_0004_markup_conversion_update, supabase_types_settings_table, settings_numeric_setting_keys [INFERRED 0.85]
- **is_admin() SECURITY DEFINER helper used across profiles, settings, and settings_history RLS** — migrations_0002_is_admin_fn, migrations_0002_profiles_update_self_or_admin_policy, migrations_0003_settings_update_admin_policy, migrations_0005_settings_history_select_admin_policy, migrations_0002_enforce_profile_role_change_fn [EXTRACTED 1.00]
- **Request-time Supabase session refresh: proxy -> updateSession -> Database type, and server component client using the same type** — rr_redyquote_proxy, supabase_update_session_updatesession, supabase_types_database, supabase_server_createclient [EXTRACTED 1.00]
- **Approval gate enforced by trigger, not RLS** — docs_architecture_database_enforced_approval_gate, docs_database_sql_validate_quote_status_transition, docs_prd_prd010, docs_prd_nfr002 [EXTRACTED 1.00]
- **Atomic quote header+lines save via single RPC transaction** — docs_database_sql_fn_save_quote, docs_database_quotes, docs_database_quote_lines, docs_prd_prd014 [EXTRACTED 1.00]
- **Admin-owns-master-data authorization model across spec, PRD, and RLS** — specs_2026_07_23_authorization_matrix_design, docs_prd_prd019, docs_database_sql, specs_authz_admin_owns_master_data [EXTRACTED 1.00]

## Communities (50 total, 27 thin omitted)

### Community 0 - "Shared UI Primitives & Formatters"

Cohesion: 0.11
Nodes (44): ComponentEditor(), ENVIRONMENTS, ENVIRONMENT, DeactivatedBadge(), FRESHNESS, FreshnessBadge(), StatusFilter, PRD-009: Price Freshness Badge (+36 more)

### Community 1 - "Mock Data Layer & Detail Pages"

Cohesion: 0.09
Nodes (54): AppNotFound(), leafLabel(), QuoteStatusBadge(), STATUS_VARIANT, PRODUCT.md §1: Quote History Is Never a Guess, ComponentDetailPage(), ProductDetailPage(), QuoteDetailPage() (+46 more)

### Community 2 - "Core Product & Architecture Docs"

Cohesion: 0.07
Nodes (47): Building UI: four-step process (shape -> tokens -> shadcn -> audit), Use /db-migrate, never a bare db:push, /impeccable shape required first for UI-bearing work, Applied migrations are unwritable (PreToolUse hook), Project state snapshot (Built / Not built, dated 2026-08-08), Source-of-truth docs rule (read the relevant doc before proposing a change), DB Migrate Command, Doc Audit Command (+39 more)

### Community 3 - "Settings Schema & Auth Migrations"

Cohesion: 0.06
Nodes (51): SettingsBrandingTab(), NumericFieldSpec, SettingsDefaultsTab(), SettingsHistoryTab(), set_updated_at() trigger fn, user_role enum, enforce_profile_role_change() fn, handle_new_user() fn (+43 more)

### Community 4 - "App Shell & List Page States"

Cohesion: 0.10
Nodes (29): AppChrome, crumbsFor, leafLabel, ComponentTable(), ProductTable(), QuoteTable(), FRESHNESS_FIELDS, NumericField() (+21 more)

### Community 5 - "Database Entities & Pricing PRD"

Cohesion: 0.09
Nodes (32): Append, never overwrite (component cost history), Atomic multi-row save via Postgres RPC, categories table, components table, fab_tiers table, price_history table (polymorphic, append-only), product_defaults table, products table (+24 more)

### Community 6 - "Nav Shell & Role Context"

Cohesion: 0.09
Nodes (26): AppLayout(), AppChrome(), crumbsFor(), NAV, SECTION_LABEL, ProductEditor(), SettingsTabs(), ARCHITECTURE.md §5: Server Actions Boundary (+18 more)

### Community 7 - "Repo Tooling Configs"

Cohesion: 0.07
Nodes (28): applypatch-msg hook shim, commit-msg hook shim, h husky dispatcher script, post-applypatch hook shim, post-checkout hook shim, post-commit hook shim, post-merge hook shim, post-rewrite hook shim (+20 more)

### Community 8 - "Quote Builder & Settings UI"

Cohesion: 0.09
Nodes (28): NumericField, settingFieldId, SettingsDefaultsTab, SettingsHistoryTab, SettingsTabs, toSettingsDraft, Server-side pricing trust boundary, DATABASE.md §5: uq_quote_lines_one_per_fixed_category (+20 more)

### Community 9 - "Dialog, Toast & Card Primitives"

Cohesion: 0.13
Nodes (22): cn(), CardContent(), CardDescription(), CardFooter(), CardHeader(), CardTitle(), Checkbox(), Dialog (Radix Root) (+14 more)

### Community 10 - "Supabase Client & Env Config"

Cohesion: 0.12
Nodes (19): env (validated config export), envSchema, parsed, proxy() (Next middleware entry), config, proxy(), createClient(), createClient() (+11 more)

### Community 11 - "shadcn Config Schema"

Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 12 - "TypeScript & Vitest Config"

Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "PRD Requirements & List Pages"

Cohesion: 0.13
Nodes (17): ComponentEditor, Field, ProductEditor, LibraryPage(), ProductsPage(), NewComponentPage(), NewProductPage(), NewQuotePage() (+9 more)

### Community 14 - "Dev Dependencies"

Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-next, lint-staged, @playwright/test, prettier, shadcn, tailwindcss (+7 more)

### Community 15 - "Runtime Dependencies"

Cohesion: 0.15
Nodes (13): dependencies, class-variance-authority, clsx, lucide-react, next, radix-ui, react, react-dom (+5 more)

### Community 16 - "npm Scripts"

Cohesion: 0.17
Nodes (12): scripts, build, db:push, db:types, dev, format, format:check, lint (+4 more)

### Community 17 - "Package Metadata"

Cohesion: 0.22
Nodes (8): engines, node, lint-staged, *.{css,md,json}, *.{ts,tsx,mjs}, name, private, version

### Community 18 - "Data Table Components & PRDs"

Cohesion: 0.32
Nodes (8): ComponentTable, ProductTable, QuoteTable, NFR-008 Responsive Breakpoint Floor, PRD-008 Environment Mismatch Flag, PRD-016 Margin Floor Advisory, PRD-018 Product Deactivation Soft State, WCAG 2.2 4.1.3 Status Messages

### Community 19 - "Root Layout & Fonts"

Cohesion: 0.40
Nodes (3): archivo, metadata, plexMono

## Ambiguous Edges - Review These

- `AppNotFound()` → `ProductsError()` [AMBIGUOUS]
  src/app/(app)/not-found.tsx · relation: conceptually_related_to
- `tsconfig.json` → `vitest.config.ts` [AMBIGUOUS]
  tsconfig.json · relation: conceptually_related_to
- `cn (class merge helper)` → `SettingsDraft type` [AMBIGUOUS]
  src/lib/validation/settings.ts · relation: conceptually_related_to

## Knowledge Gaps

- **206 isolated node(s):** `match`, `husky.sh script`, `$schema`, `style`, `rsc` (+201 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AppNotFound()` and `ProductsError()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `tsconfig.json` and `vitest.config.ts`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `cn (class merge helper)` and `SettingsDraft type`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `LifecycleBar()` connect `Quote Builder & Settings UI` to `Dialog, Toast & Card Primitives`, `Core Product & Architecture Docs`, `Mock Data Layer & Detail Pages`, `Nav Shell & Role Context`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `PRD-010: Quote Lifecycle Transitions` connect `Core Product & Architecture Docs` to `Quote Builder & Settings UI`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `match`, `husky.sh script`, `$schema` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Shared UI Primitives & Formatters` be split into smaller, more focused modules?**
  _Cohesion score 0.11394230769230769 - nodes in this community are weakly interconnected._
