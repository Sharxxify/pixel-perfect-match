import { createFileRoute } from "@tanstack/react-router";
import { BrainCircuit, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/aqua/AppShell";
import { SectionCard } from "@/components/aqua/quality";
import { chartTooltipStyle } from "@/lib/chart-style";
import { mockFeatureImportance } from "@/lib/mock-data";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "AI Insights — AquaSense" },
      {
        name: "description",
        content:
          "Model-derived insights: dominant pollution drivers, global feature importance and seasonal risk narratives across the network.",
      },
      { property: "og:title", content: "AI Insights — AquaSense" },
      {
        property: "og:description",
        content: "What the ensemble learned about the drivers of poor water quality.",
      },
    ],
  }),
  component: InsightsPage,
});

const INSIGHTS = [
  {
    icon: TrendingDown,
    tone: "poor" as const,
    title: "Sewage inflow dominates poor classifications",
    body: "In 4 of 4 Poor-labelled stations, fecal coliform above 2,000 MPN/100mL contributed the largest negative SHAP value. Disinfection capacity is the highest-leverage intervention.",
  },
  {
    icon: TrendingUp,
    tone: "moderate" as const,
    title: "Monsoon months degrade every station",
    body: "June–July readings show DO dropping ~28% and BOD rising ~2.3x versus December. Pre-monsoon aeration upgrades would flatten this seasonal dip.",
  },
  {
    icon: Lightbulb,
    tone: "good" as const,
    title: "Reservoirs remain the safest supply",
    body: "Osman Sagar and Himayat Sagar hold ideal ranges on all eight parameters, with ensemble confidence above 96%. Prioritise them for drinking-water offtake.",
  },
  {
    icon: BrainCircuit,
    tone: "primary" as const,
    title: "Models disagree mostly at the Good/Moderate edge",
    body: "Random Forest leans Moderate when DO sits between 5 and 6 mg/L. Treat split verdicts in that band as Moderate until a manual lab test resolves them.",
  },
];

const toneClass = {
  poor: "border-poor/40 bg-poor/10 text-poor",
  moderate: "border-moderate/40 bg-moderate/10 text-moderate",
  good: "border-good/40 bg-good/10 text-good",
  primary: "border-primary/40 bg-primary/10 text-primary",
};

function InsightsPage() {
  return (
    <>
      <PageHeader
        title="AI Insights"
        description="Aggregated explanations from the ensemble across all stations and historical samples."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {INSIGHTS.map(({ icon: Icon, tone, title, body }) => (
          <div key={title} className="panel p-5">
            <div className="flex items-start gap-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg border ${toneClass[tone]}`}>
                <Icon className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <SectionCard
        title="Global feature importance"
        description="Averaged gain across the full training set for both models"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mockFeatureImportance}
              layout="vertical"
              margin={{ left: 40, right: 16, top: 8 }}
            >
              <CartesianGrid stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="feature"
                width={140}
                stroke="var(--muted-foreground)"
                fontSize={11}
              />
              <Tooltip {...chartTooltipStyle} />
              <Legend iconType="circle" />
              <Bar dataKey="xgboost" name="XGBoost" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={14} />
              <Bar
                dataKey="randomForest"
                name="Random Forest"
                fill="var(--chart-5)"
                radius={[0, 4, 4, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </>
  );
}
