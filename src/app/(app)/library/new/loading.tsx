// Safe at the segment: `library/new/page.tsx` never calls `notFound()`, so no
// status code depends on this boundary staying out of the way.
export { RouteLoading as default } from "@/components/layout/route-loading";
