import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cable, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { PageHeader } from "@/components/aqua/AppShell";
import { SectionCard } from "@/components/aqua/quality";
import { useBackendStatus } from "@/hooks/use-backend-status";
import { API_BASE_URL, checkHealth } from "@/services/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AquaSense" },
      {
        name: "description",
        content:
          "Configure the FastAPI backend endpoint, Demo Mode behaviour and alert thresholds for the AquaSense monitoring dashboard.",
      },
      { property: "og:title", content: "Settings — AquaSense" },
      {
        property: "og:description",
        content: "Backend connection, demo mode and threshold configuration for AquaSense.",
      },
    ],
  }),
  component: SettingsPage,
});

const ENDPOINTS = [
  { method: "GET", path: "/health", note: "Backend liveness probe (polled every 60 s)" },
  { method: "POST", path: "/predict", note: "Classify an eight-parameter sample" },
  { method: "GET", path: "/water-sources", note: "Station registry with latest readings" },
  { method: "GET", path: "/models", note: "Model registry and evaluation metrics" },
  { method: "POST", path: "/explain", note: "SHAP feature contributions for a sample" },
];

const THRESHOLDS = [
  { parameter: "Dissolved Oxygen", warn: "< 5 mg/L", critical: "< 3.5 mg/L" },
  { parameter: "pH", warn: "outside 6.5 – 8.5", critical: "outside 6 – 9" },
  { parameter: "BOD", warn: "> 3 mg/L", critical: "> 5 mg/L" },
  { parameter: "Nitrate + Nitrite", warn: "> 5 mg/L", critical: "> 10 mg/L" },
  { parameter: "Fecal Coliform", warn: "> 50 MPN/100mL", critical: "> 500 MPN/100mL" },
  { parameter: "Conductivity", warn: "> 800 µS/cm", critical: "> 1500 µS/cm" },
];

function SettingsPage() {
  const { online } = useBackendStatus();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const test = async () => {
    setTesting(true);
    setResult(await checkHealth());
    setTesting(false);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Backend wiring, demo behaviour and the thresholds that drive alerts."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Backend connection"
          description="Set VITE_API_BASE_URL to point the dashboard at your FastAPI service"
        >
          <div className="rounded-lg border border-border/70 bg-surface/60 p-4">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Base URL</p>
            <p className="mt-1 font-mono text-sm break-all">{API_BASE_URL}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  online
                    ? "border-good/40 bg-good/10 text-good"
                    : "border-moderate/40 bg-moderate/10 text-moderate",
                )}
              >
                {online ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                {online ? "Live backend" : "Demo Mode"}
              </span>
              <button
                onClick={test}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              >
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Cable className="size-3.5" />}
                Test connection
              </button>
              {result !== null && (
                <span className={cn("text-xs", result ? "text-good" : "text-poor")}>
                  {result ? "Reachable" : "Unreachable — staying in Demo Mode"}
                </span>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Demo Mode keeps every page usable with deterministic mock inference, so the dashboard
            never breaks when the backend is offline.
          </p>
        </SectionCard>

        <SectionCard title="Expected API contract" description="Routes the frontend is wired for">
          <ul className="space-y-2">
            {ENDPOINTS.map((e) => (
              <li
                key={e.path}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-surface/60 px-3 py-2.5"
              >
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold",
                    e.method === "GET" ? "bg-primary/15 text-primary" : "bg-chart-5/20 text-chart-5",
                  )}
                >
                  {e.method}
                </span>
                <span className="font-mono text-xs">{e.path}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{e.note}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Alert thresholds" description="Applied to every incoming measurement">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="pb-2 font-medium">Parameter</th>
                <th className="pb-2 font-medium">Warning</th>
                <th className="pb-2 font-medium">Critical</th>
              </tr>
            </thead>
            <tbody>
              {THRESHOLDS.map((t) => (
                <tr key={t.parameter} className="border-t border-border/70">
                  <td className="py-2.5 font-medium">{t.parameter}</td>
                  <td className="py-2.5 font-mono text-moderate">{t.warn}</td>
                  <td className="py-2.5 font-mono text-poor">{t.critical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
