import Image from "next/image";

import { ReadOnlyNotice } from "@/components/prototype/admin-only";
import { Card } from "@/components/ui/card";

// Neither preview carries `priority`. Radix does not mount an inactive
// TabsContent, so this subtree does not exist during the page load `priority`
// preloads against -- it bought nothing and read as though it did. Lazy (the
// next/image default) is correct here: by the time the tab is selected both
// images are in the viewport and load immediately anyway.
export function SettingsBrandingTab({ readOnly }: { readOnly: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {readOnly ? <ReadOnlyNotice what="Branding" /> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">Logo</h2>
          </div>

          <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-muted p-4">
            <Image
              src="/redyref-logo.png"
              alt="Organisation logo preview"
              width={220}
              height={125}
              className="h-auto max-h-28 w-auto max-w-full object-contain"
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-semibold tracking-tight">Favicon</h2>
          </div>

          <div className="flex min-h-40 items-center justify-center rounded-md border border-border bg-muted p-4">
            <Image
              src="/favicon.ico"
              alt="Favicon preview"
              width={64}
              height={64}
              className="size-16 rounded-sm border border-border"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
