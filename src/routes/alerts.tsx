import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Info } from "lucide-react";

import { PageHeader } from "@/components/aqua/AppShell";
import { SectionCard, StatCard } from "@/components/aqua/quality";
import { mockAlerts, type Alert } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — AquaSense" },
      {
        name: "description",
        content:
          "Critical and warning water quality alerts raised when dissolved oxygen, BOD, pH, nitrate or coliform thresholds are breached.",
      },
      { property: "og:title", content: "Alerts — AquaSense" },
      {
        property: "og:description",
        content: "Threshold breaches and sensor events across the AquaSense monitoring network.",
      },
    ],
  }),
  component: AlertsPage,
});

const SEVERITY = {
  Critical: { badge: "border-poor/40 bg-poor/10 text-poor", icon: AlertTriangle },
  Warning: { badge: "border-moderate/40 bg-moderate/10 text-moderate", icon: BellRing },
  Info: { badge: "border-primary/40 bg-primary/10 text-primary", icon: Info },
} as const;

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const count = (s: Alert["severity"]) => alerts.filter((a) => a.severity === s).length;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Automatic notifications whenever a station crosses a regulatory threshold."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Critical" value={count("Critical")} accent="Poor" sub="Immediate action" />
        <StatCard label="Warnings" value={count("Warning")} accent="Moderate" sub="Watch list" />
        <StatCard
          label="Acknowledged"
          value={alerts.filter((a) => a.acknowledged).length}
          accent="Good"
          sub="Handled by operators"
        />
      </div>

      <SectionCard title="Alert feed" description="Newest first, grouped by severity">
        <ul className="space-y-3">
          {alerts.map((a) => {
            const s = SEVERITY[a.severity];
            const Icon = s.icon;
            return (
              <li
                key={a.id}
                className={cn(
                  "flex flex-wrap items-start gap-3 rounded-xl border border-border/70 bg-surface/60 p-4",
                  a.acknowledged && "opacity-60",
                )}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", s.badge)}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-[200px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase", s.badge)}>
                      {a.severity}
                    </span>
                    <p className="text-sm font-semibold">{a.source}</p>
                    <span className="text-[11px] text-muted-foreground">· {a.parameter}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{a.message}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {a.id} · {a.time}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setAlerts((prev) =>
                      prev.map((x) => (x.id === a.id ? { ...x, acknowledged: !x.acknowledged } : x)),
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CheckCircle2 className="size-3.5" />
                  {a.acknowledged ? "Reopen" : "Acknowledge"}
                </button>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </>
  );
}
