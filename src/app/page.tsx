import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// TEMPORARY -- design-token reference surface, replacing the create-next-app
// boilerplate that was here. It exists so the token layer in globals.css can be
// eyeballed in both light and dark before real routes are built on top of it.
// Delete this along with public/*.svg when the first real route lands
// (docs/TODO.md §C.1).

const SURFACES = [
  ["background", "bg-background"],
  ["card", "bg-card"],
  ["muted / secondary / accent", "bg-muted"],
  ["border", "bg-border"],
  ["input", "bg-input"],
  ["input-editable", "bg-input-editable"],
] as const;

const SERIES = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">RedyQuote</h1>
        <p className="text-muted-foreground text-sm">
          Design token reference — brand red{" "}
          <span className="text-primary-text font-semibold">#ad0000</span>,
          Barlow / Barlow Condensed.
        </p>
      </header>

      <Section title="Status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" dot>
            Draft
          </Badge>
          <Badge variant="warning" dot>
            Pending Approval
          </Badge>
          <Badge variant="success" dot>
            Approved
          </Badge>
          <Badge variant="info" dot>
            Sent
          </Badge>
          <Badge variant="destructive" dot>
            Rejected
          </Badge>
          <Badge dot>Brand</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Actions">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Save Quote</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete Line</Button>
          <Button variant="link">Link</Button>
        </div>
        <p className="text-muted-foreground text-xs">
          The primary CTA is a solid brand-red fill; destructive is a tint, so
          the two never compete as the same signal.
        </p>
      </Section>

      <Section title="Surfaces">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SURFACES.map(([label, cls]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-lg border border-border ${cls}`} />
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Chart series (fixed order, never cycled)">
        <div className="flex gap-2">
          {SERIES.map((name, i) => (
            <div key={name} className="flex flex-1 flex-col gap-1.5">
              <div
                className="h-12 rounded-lg"
                style={{ backgroundColor: `var(--chart-${i + 1})` }}
              />
              <span className="text-muted-foreground text-xs">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-5xl leading-none font-bold tabular-nums">
            42.8%
          </p>
          <p className="text-sm">
            Barlow at 14px is the UI default — narrow enough that a quote table
            keeps its numeric columns without shrinking the type.
          </p>
          <p className="font-mono text-sm tabular-nums">
            $12,480.00 · $1,204.50 · $98,001.75
          </p>
        </div>
      </Section>
    </main>
  );
}
