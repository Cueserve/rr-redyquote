"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Boxes, FileText, Package, SlidersHorizontal } from "lucide-react";

import { RoleProvider } from "@/components/prototype/role-context";
import { RoleToggle } from "@/components/prototype/role-toggle";
import { Sidebar, type SidebarNavItem } from "@/components/layout/sidebar";
import { Topbar, type Crumb } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getComponent, getProduct, getQuote } from "@/lib/mock";

// The chrome from DESIGN-SYSTEM.md §9: a fixed 220px dark rail, a persistent
// breadcrumb top bar, and an independently-scrolling content area. Client-side
// because the rail needs the current pathname to mark the active item and the
// prototype role switch is client state; the pages it wraps stay Server
// Components.

const NAV: SidebarNavItem[] = [
  { label: "Quotes", href: "/quotes", icon: <FileText className="size-4" /> },
  {
    label: "Products",
    href: "/products",
    icon: <Package className="size-4" />,
  },
  {
    label: "Component Library",
    href: "/library",
    icon: <Boxes className="size-4" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <SlidersHorizontal className="size-4" />,
  },
];

// Settings appears for reps as well as admins on purpose. ARCHITECTURE.md §7
// classifies settings as readable by any signed-in user and admin-only to edit,
// so the honest design shows a rep the rates their quotes are priced against
// and withholds the controls — not the page.

const SECTION_LABEL: Record<string, string> = {
  quotes: "Quotes",
  products: "Products",
  library: "Component Library",
  settings: "Settings",
};

/** Resolves the trailing crumb for a detail route: an id in the URL should read
 *  as the thing it identifies, not as a uuid. Prototype-only lookup; the real
 *  version reads the record the page already fetched. */
function leafLabel(section: string, id: string) {
  if (id === "new") {
    return (
      {
        quotes: "New Quote",
        products: "New Product",
        library: "New Component",
      }[section] ?? "New"
    );
  }
  if (section === "quotes") return getQuote(id)?.quote_number ?? "Quote";
  if (section === "products") return getProduct(id)?.name ?? "Product";
  if (section === "library") return getComponent(id)?.name ?? "Component";
  return id;
}

function crumbsFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Home" }];

  const [section, id] = segments;
  // "Home" points at `/`, which today only redirects to `/quotes` — see the
  // comment in `app/page.tsx`. Deliberately not hardcoded to `/quotes`: that
  // route becomes a real session router once auth lands, and a crumb wired
  // straight past it would keep sending an admin to the rep landing page.
  //
  // Topbar drops the `href` on whichever crumb ends up last, so the section
  // crumb is a link on `/quotes/<id>` and plain text on `/quotes` with no
  // branching here.
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: SECTION_LABEL[section] ?? section, href: `/${section}` },
  ];
  if (id) crumbs.push({ label: leafLabel(section, id) });
  return crumbs;
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeHref = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;

  return (
    <RoleProvider initialRole="rep">
      <TooltipProvider delayDuration={200}>
        <div className="relative flex h-dvh overflow-hidden">
          {/* A plain fragment link, deliberately not `next/link`: it moves
              focus within the page, it does not navigate. Five stops of rail
              precede the content on every route (WCAG 2.4.1). */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:outline-none focus:ring-3 focus:ring-ring"
          >
            Skip to content
          </a>
          <Sidebar
            className="shrink-0"
            items={NAV}
            activeHref={activeHref}
            logo={
              // Use the current committed brand logo file. `priority` because
              // the rail is above the fold on every route -- lazy-loading it
              // just buys a first-paint flash.
              //
              // `sizes` is not optional here. width/height are the file's
              // intrinsic dimensions, and without `sizes` Next emits a
              // density-descriptor srcset off the *viewport* -- w=1920 at 1x,
              // w=3840 at 2x -- for a slot that renders at 160px. That is
              // 17.9 KB where 3.9 KB does the job, preloaded on every route.
              // Declaring the real slot width makes Next emit width
              // descriptors and the browser pick w=256.
              <Image
                src="/redyref-logo.png"
                alt="REDYREF"
                width={1442}
                height={817}
                sizes="160px"
                priority
                className="h-auto w-40"
              />
            }
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar crumbs={crumbsFor(pathname)} right={<RoleToggle />} />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 overflow-y-auto outline-none"
            >
              {/* Keyed on pathname so the fade replays on every navigation —
                  DESIGN-SYSTEM.md §Motion: 150ms ease-out, opacity only. */}
              <div key={pathname} className="animate-in fade-in-0 duration-150">
                {children}
              </div>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </RoleProvider>
  );
}
