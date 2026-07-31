import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// TEMPORARY -- design-token reference surface, replacing the create-next-app
// boilerplate that was here. It exists so the token layer in globals.css can be
// eyeballed in both light and dark before real routes are built on top of it.
// Delete this along with public/*.svg when the first real route lands
// (docs/TODO.md §C.1).

const SURFACES = [
  ["background — page canvas (stone-50)", "bg-background"],
  ["card / popover — panels (white)", "bg-card"],
  ["muted / secondary / accent (stone-100)", "bg-muted"],
  ["border — decorative rules", "bg-border"],
  ["input — control boundaries", "bg-input"],
  ["editable — the typable-cell tint", "bg-editable"],
] as const;

const SERIES = [
  ["chart-1", "clay"],
  ["chart-2", "violet"],
  ["chart-3", "ochre"],
  ["chart-4", "blue"],
  ["chart-5", "moss"],
] as const;

const RADII = [
  ["sm 6px", "rounded-sm"],
  ["md 10px", "rounded-md"],
  ["lg 16px", "rounded-lg"],
  ["xl 22px", "rounded-xl"],
  ["pill", "rounded-full"],
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">
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
        <h1 className="text-2xl">RedyQuote</h1>
        <p className="text-sm text-muted-foreground">
          Design token reference — Clay / Stone / Moss, Archivo and IBM Plex
          Mono. Internal estimating tool, deliberately not the REDYREF marketing
          brand.
        </p>
      </header>

      <Section title="Status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" dot>
            Draft
          </Badge>
          <Badge variant="warning" dot>
            Pending approval
          </Badge>
          <Badge variant="success" dot>
            Approved
          </Badge>
          <Badge variant="info" dot>
            Sent
          </Badge>
          <Badge variant="destructive" dot>
            Stale
          </Badge>
          <Badge dot>Brand</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Actions">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Save quote</Button>
          <Button variant="secondary">Submit for approval</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete line</Button>
          <Button variant="link">Link</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          One clay action per screen; moss carries secondary actions.
          Destructive is a tint, not a solid fill — a solid danger red sits only
          ΔE 5.3 from the clay fill and the two would read as the same button.
        </p>
      </Section>

      <Section title="Editable vs calculated">
        <div className="flex flex-wrap items-end gap-6 rounded-lg border border-border bg-card p-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Component cost</span>
            <input
              readOnly
              defaultValue="1204.50"
              className="w-40 rounded-sm border border-editable-border bg-editable px-3 py-2.5 font-mono text-base tabular-nums focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            />
            <span className="text-xs text-muted-foreground">
              Tinted and bordered — you can type here.
            </span>
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Extended cost</span>
            <p className="w-40 px-3 py-2.5 font-mono text-base tabular-nums">
              12,045.00
            </p>
            <span className="text-xs text-muted-foreground">
              No tint, no border — the system computes it.
            </span>
          </div>
        </div>
      </Section>

      <Section title="Surfaces">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SURFACES.map(([label, cls]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-md border border-border ${cls}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius ladder (never 0px)">
        <div className="flex flex-wrap gap-3">
          {RADII.map(([label, cls]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className={`size-16 bg-muted ${cls}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Chart series (fixed order, never cycled)">
        <div className="flex gap-2">
          {SERIES.map(([name, hue], i) => (
            <div key={name} className="flex flex-1 flex-col gap-1.5">
              <div
                className="h-12 rounded-md"
                style={{ backgroundColor: `var(--chart-${i + 1})` }}
              />
              <span className="text-xs text-muted-foreground">
                {name} · {hue}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-3xl leading-tight font-semibold tabular-nums">
            42.8%
          </p>
          <p className="text-base">
            Archivo at 15px is the UI default — one grotesk for headings and
            body, separated by weight and tracking rather than by face.
          </p>
          <p className="font-mono text-sm tabular-nums">
            $12,480.00 · $1,204.50 · $98,001.75
          </p>
          <p className="text-sm text-muted-foreground italic">
            Italic Archivo is reserved for rare brand-voice moments, never body
            copy.
          </p>
        </div>
      </Section>
    </main>
  );
}
