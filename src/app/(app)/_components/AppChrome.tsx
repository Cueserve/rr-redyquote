"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Boxes, FileText, Package, SlidersHorizontal } from "lucide-react";

import { Sidebar, type SidebarNavItem } from "@/components/layout/sidebar";
import { Topbar, type Crumb } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/layout/user-menu";
import { signOut } from "@/server/actions/auth";
import { RoleProvider } from "@/components/layout/role-context";

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

const SECTION_LABEL: Record<string, string> = {
  quotes: "Quotes",
  products: "Products",
  library: "Component Library",
  settings: "Settings",
};

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
  if (section === "quotes") return "Quote Detail";
  if (section === "products") return "Product Detail";
  if (section === "library") return "Component Detail";
  return id;
}

function crumbsFor(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Home" }];

  const [section, id] = segments;
  const crumbs: Crumb[] = [
    { label: "Home", href: "/" },
    { label: SECTION_LABEL[section] ?? section, href: `/${section}` },
  ];
  if (id) crumbs.push({ label: leafLabel(section, id) });
  return crumbs;
}

export function AppChrome({
  children,
  name,
  roleLabel,
}: {
  children: React.ReactNode;
  name: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const activeHref = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;

  return (
    <RoleProvider role={roleLabel === "Administrator" ? "admin" : "rep"}>
      <TooltipProvider delayDuration={200}>
        <div className="relative flex h-dvh overflow-hidden">
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
            <Topbar
              crumbs={crumbsFor(pathname)}
              right={
                <UserMenu
                  name={name}
                  roleLabel={roleLabel}
                  onSignOut={() => signOut()}
                />
              }
            />
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 overflow-y-auto outline-none"
            >
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
