import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Droplets, Gauge, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/aqua/AppShell";
import { QUALITY_STYLES, QualityBadge, SectionCard, StatCard } from "@/components/aqua/quality";
import {
  mockAlerts,
  mockHistory,
  mockMeasurements,
  mockWaterSources,
  qualityCounts,
} from "@/lib/mock-data";
import { chartTooltipStyle } from "@/lib/chart-style";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AquaSense — AI Water Quality Monitoring Dashboard" },
      {
        name: "description",
        content:
          "Live overview of 12 monitored water sources with AI quality classification, donut breakdown, recent measurements and critical alerts.",
      },
      { property: "og:title", content: "AquaSense — AI Water Quality Monitoring" },
      {
        property: "og:description",
        content:
          "Monitor dissolved oxygen, pH, BOD, nitrate and coliform levels with XGBoost and Random Forest classification.",
      },
    ],
  }),
  component: Dashboard,
});

const donut = [
  { name: "Good", value: qualityCounts.Good },
  { name: "Moderate", value: qualityCounts.Moderate },
  { name: "Poor", value: qualityCounts.Poor },
] as const;

function Dashboard() {
  const total = mockWaterSources.length;
  const critical = mockAlerts.filter((a) => a.severity === "Critical").length;

  return (
    <>
      <PageHeader
        title="Monitoring Dashboard"
        description="Real-time water quality classification across the sensor network, powered by an XGBoost + Random Forest ensemble."
        actions={
          <Link
            to="/analysis"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Droplets className="size-4" />
            Analyze a sample
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monitored sources"
          value={total}
          sub="Rivers, lakes, canals & borewells"
          icon={<Gauge className="size-5" />}
        />
        <StatCard
          label="Good quality"
          value={qualityCounts.Good}
          sub={`${Math.round((qualityCounts.Good / total) * 100)}% of network`}
          accent="Good"
          icon={<ShieldCheck className="size-5" />}
        />
        <StatCard
          label="Moderate quality"
          value={qualityCounts.Moderate}
          sub="Needs treatment review"
          accent="Moderate"
          icon={<TriangleAlert className="size-5" />}
        />
        <StatCard
          label="Poor quality"
          value={qualityCounts.Poor}
          sub={`${critical} critical alerts open`}
          accent="Poor"
          icon={<AlertTriangle className="size-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Overall water quality"
          description="Distribution of the latest AI classification per station"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut as unknown as { name: string; value: number }[]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {donut.map((d) => (
                    <Cell key={d.name} fill={QUALITY_STYLES[d.name].hex} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipStyle} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Network trend"
          description="Mean dissolved oxygen vs BOD across all stations"
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHistory} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="doFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bodFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--poor)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--poor)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip {...chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="dissolvedOxygen"
                  name="DO (mg/L)"
                  stroke="var(--primary)"
                  fill="url(#doFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="bod"
                  name="BOD (mg/L)"
                  stroke="var(--poor)"
                  fill="url(#bodFill)"
                  strokeWidth={2}
                />
                <Legend iconType="plainline" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Recent measurements"
          description="Latest classified samples from the field sondes"
          className="lg:col-span-2"
        >
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-2 pb-3 font-medium">Source</th>
                  <th className="px-2 pb-3 font-medium">Time</th>
                  <th className="px-2 pb-3 font-medium">pH</th>
                  <th className="px-2 pb-3 font-medium">DO</th>
                  <th className="px-2 pb-3 font-medium">BOD</th>
                  <th className="px-2 pb-3 font-medium">Quality</th>
                  <th className="px-2 pb-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {mockMeasurements.map((m) => (
                  <tr key={m.id} className="border-t border-border/70">
                    <td className="px-2 py-3">
                      <p className="font-medium">{m.source}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{m.id}</p>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{m.timestamp}</td>
                    <td className="px-2 py-3 font-mono">{m.ph.toFixed(1)}</td>
                    <td className="px-2 py-3 font-mono">{m.dissolvedOxygen.toFixed(1)}</td>
                    <td className="px-2 py-3 font-mono">{m.bod.toFixed(1)}</td>
                    <td className="px-2 py-3">
                      <QualityBadge quality={m.quality} />
                    </td>
                    <td className="px-2 py-3 font-mono text-muted-foreground">
                      {(m.confidence * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent alerts"
          description="Threshold breaches flagged by the monitor"
          actions={
            <Link to="/alerts" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          }
        >
          <ul className="space-y-3">
            {mockAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="rounded-lg border border-border/70 bg-surface/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      a.severity === "Critical"
                        ? "text-xs font-bold text-poor"
                        : a.severity === "Warning"
                          ? "text-xs font-bold text-moderate"
                          : "text-xs font-bold text-primary"
                    }
                  >
                    {a.severity}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{a.time}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{a.source}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.message}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
