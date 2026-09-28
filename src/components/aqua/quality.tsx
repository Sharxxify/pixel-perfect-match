import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { QualityClass } from "@/lib/mock-data";

export const QUALITY_STYLES: Record<QualityClass, { badge: string; text: string; dot: string; hex: string }> = {
  Good: {
    badge: "border-good/40 bg-good/12 text-good",
    text: "text-good",
    dot: "bg-good",
    hex: "var(--good)",
  },
  Moderate: {
    badge: "border-moderate/40 bg-moderate/12 text-moderate",
    text: "text-moderate",
    dot: "bg-moderate",
    hex: "var(--moderate)",
  },
  Poor: {
    badge: "border-poor/45 bg-poor/12 text-poor",
    text: "text-poor",
    dot: "bg-poor",
    hex: "var(--poor)",
  },
};

export function QualityBadge({ quality, className }: { quality: QualityClass; className?: string }) {
  const s = QUALITY_STYLES[quality];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        s.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {quality}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: QualityClass | "primary";
}) {
  const accentText =
    accent === "primary" || !accent ? "text-primary" : QUALITY_STYLES[accent].text;
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {icon && <span className={cn("shrink-0", accentText)}>{icon}</span>}
      </div>
      <p className={cn("mt-3 font-display text-3xl font-semibold", accentText)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
