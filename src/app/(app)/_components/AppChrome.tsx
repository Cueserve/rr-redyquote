"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Boxes, FileText, Package, SlidersHorizontal } from "lucide-react";

import { RoleProvider } from "@/components/prototype/role-context";
import { RoleToggle } from "@/components/prototype/role-toggle";
import { Sidebar, type SidebarNavItem } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
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

function crumbsFor(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return ["Home"];

  const [section, id] = segments;
  const crumbs = ["Home", SECTION_LABEL[section] ?? section];
  if (id) crumbs.push(leafLabel(section, id));
  return crumbs;
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeHref = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;

  return (
    <RoleProvider initialRole="rep">
      <TooltipProvider delayDuration={200}>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar
            className="shrink-0"
            items={NAV}
            activeHref={activeHref}
            logo={
              // Use the current committed brand logo file. `priority` because
              // the rail is above the fold on every route -- lazy-loading it
              // just buys a first-paint flash.
              <Image
                src="/redyref-logo.png"
                alt="REDYREF"
                width={1442}
                height={817}
                priority
                className="h-auto w-40"
              />
            }
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar crumbs={crumbsFor(pathname)} right={<RoleToggle />} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </TooltipProvider>
    </RoleProvider>
  );
}
