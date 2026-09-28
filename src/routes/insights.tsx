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

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/aqua/AppShell";
import { SectionCard } from "@/components/aqua/quality";
import { chartTooltipStyle } from "@/lib/chart-style";
import { mockFeatureImportance } from "@/lib/mock-data";
import { getFeatureImportance } from "@/services/api";

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
    body: "In Poor-labelled samples, Fecal Coliform (>100 MPN/100mL) accounts for 31.9% of model importance. Disinfection capacity is the highest-leverage intervention.",
  },
  {
    icon: TrendingUp,
    tone: "moderate" as const,
    title: "Organic pollution (BOD) drives moderate shifts",
    body: "BOD and Dissolved Oxygen represent ~28% combined feature importance in classifying degraded stations. Biological aeration directly reverses this degradation.",
  },
  {
    icon: Lightbulb,
    tone: "good" as const,
    title: "Reservoirs and upland rivers stay cleanest",
    body: "Upland monitoring locations maintain DO > 7 mg/L and BOD < 2 mg/L, achieving over 97% confidence in Good water quality status.",
  },
  {
    icon: BrainCircuit,
    tone: "primary" as const,
    title: "Ensemble feature consensus",
    body: "Both XGBoost and Random Forest agree on the top 4 predictive drivers: Fecal Coliform, Total Coliform, BOD, and Dissolved Oxygen.",
  },
];

const toneClass = {
  poor: "border-poor/40 bg-poor/10 text-poor",
  moderate: "border-moderate/40 bg-moderate/10 text-moderate",
  good: "border-good/40 bg-good/10 text-good",
  primary: "border-primary/40 bg-primary/10 text-primary",
};

function InsightsPage() {
  const { data: fiRes } = useQuery({
    queryKey: ["feature-importance"],
    queryFn: getFeatureImportance,
    staleTime: 60_000,
  });

  const featureImportanceData = fiRes?.data ?? mockFeatureImportance;

  return (
    <>
      <PageHeader
        title="AI Insights"
        description="Aggregated explanations from XGBoost and Random Forest trained on CPCB India water quality data."
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
        description="Trained feature weights from water_dataX.csv across XGBoost and Random Forest"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={featureImportanceData}
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
