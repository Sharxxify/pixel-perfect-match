import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/aqua/AppShell";
import { SectionCard } from "@/components/aqua/quality";
import { chartTooltipStyle } from "@/lib/chart-style";
import { mockHistory } from "@/lib/mock-data";

export const Route = createFileRoute("/historical")({
  head: () => ({
    meta: [
      { title: "Historical Data — AquaSense" },
      {
        name: "description",
        content:
          "Ten months of trends for pH, dissolved oxygen, BOD, conductivity, nitrate and coliform counts across the monitoring network.",
      },
      { property: "og:title", content: "Historical Data — AquaSense" },
      {
        property: "og:description",
        content: "Seasonal water quality trends captured by the AquaSense IoT sensor network.",
      },
    ],
  }),
  component: HistoricalPage,
});

const axis = { stroke: "var(--muted-foreground)", fontSize: 12 } as const;

function HistoricalPage() {
  return (
    <>
      <PageHeader
        title="Historical Data"
        description="Monthly aggregates from the sensor network, useful for spotting monsoon-driven contamination cycles."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="pH trend" description="Ideal band 6.5 – 8.5">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockHistory} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" {...axis} />
                <YAxis domain={[6, 9]} {...axis} />
                <Tooltip {...chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="ph"
                  name="pH"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Dissolved oxygen" description="mg/L — higher is better">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHistory} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="histDo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--good)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--good)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="dissolvedOxygen"
                  name="DO (mg/L)"
                  stroke="var(--good)"
                  fill="url(#histDo)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="BOD load" description="mg/L — organic pollution indicator">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockHistory} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...chartTooltipStyle} />
                <Bar
                  dataKey="bod"
                  name="BOD (mg/L)"
                  fill="var(--moderate)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Conductivity" description="µS/cm — dissolved salts">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockHistory} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="conductivity"
                  name="Conductivity"
                  stroke="var(--chart-5)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Nitrate + nitrite" description="mg/L — runoff marker">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockHistory} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="histNitrate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--moderate)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--moderate)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="nitrate"
                  name="Nitrate (mg/L)"
                  stroke="var(--moderate)"
                  fill="url(#histNitrate)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Coliform counts" description="MPN/100mL — microbial load">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockHistory} margin={{ left: -4, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" {...axis} />
                <YAxis {...axis} />
                <Tooltip {...chartTooltipStyle} />
                <Legend iconType="plainline" />
                <Line
                  type="monotone"
                  dataKey="fecalColiform"
                  name="Fecal coliform"
                  stroke="var(--poor)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalColiform"
                  name="Total coliform"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
