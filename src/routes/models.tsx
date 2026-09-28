import { createFileRoute } from "@tanstack/react-router";
import {
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
import { mockModels, mockTrainingCurve, type ModelMetrics } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Model Performance — AquaSense" },
      {
        name: "description",
        content:
          "Accuracy, precision, recall and F1 for the XGBoost and Random Forest water quality classifiers, with per-class reports and confusion matrices.",
      },
      { property: "og:title", content: "Model Performance — AquaSense" },
      {
        property: "og:description",
        content: "Evaluation metrics for the AquaSense water quality classification ensemble.",
      },
    ],
  }),
  component: ModelsPage,
});

const CLASSES = ["Good", "Moderate", "Poor"] as const;

function ModelsPage() {
  return (
    <>
      <PageHeader
        title="Model Performance"
        description="Evaluation on a held-out 20% split of 18,420 labelled samples."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {mockModels.map((m) => (
          <ModelCard key={m.name} model={m} />
        ))}
      </div>

      <SectionCard
        title="Validation accuracy by boosting rounds / trees"
        description="XGBoost converges faster and holds a ~2.6 point lead"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockTrainingCurve} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="epoch" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis domain={[0.7, 1]} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip {...chartTooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Legend iconType="plainline" />
              <Line
                type="monotone"
                dataKey="xgboost"
                name="XGBoost"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="randomForest"
                name="Random Forest"
                stroke="var(--chart-5)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </>
  );
}

function ModelCard({ model }: { model: ModelMetrics }) {
  const metrics = [
    { label: "Accuracy", value: model.accuracy },
    { label: "Precision", value: model.precision },
    { label: "Recall", value: model.recall },
    { label: "F1 score", value: model.f1 },
  ];

  return (
    <SectionCard
      title={model.name}
      description={`${model.trainedOn} · ${model.latencyMs} ms inference`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-border/70 bg-surface/60 p-3">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{m.label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-primary">
              {(m.value * 100).toFixed(1)}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${m.value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th className="pb-2 font-medium">Class</th>
              <th className="pb-2 font-medium">Precision</th>
              <th className="pb-2 font-medium">Recall</th>
              <th className="pb-2 font-medium">F1</th>
              <th className="pb-2 font-medium">Support</th>
            </tr>
          </thead>
          <tbody>
            {model.classReport.map((r) => (
              <tr key={r.label} className="border-t border-border/70">
                <td className="py-2 font-medium">{r.label}</td>
                <td className="py-2 font-mono">{r.precision.toFixed(2)}</td>
                <td className="py-2 font-mono">{r.recall.toFixed(2)}</td>
                <td className="py-2 font-mono">{r.f1.toFixed(3)}</td>
                <td className="py-2 font-mono text-muted-foreground">{r.support}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Confusion matrix</p>
        <div className="mt-2 grid grid-cols-[auto_repeat(3,1fr)] gap-1 text-xs">
          <div />
          {CLASSES.map((c) => (
            <div key={c} className="pb-1 text-center text-muted-foreground">
              {c}
            </div>
          ))}
          {model.confusion.map((row, i) => (
            <div key={CLASSES[i]} className="contents">
              <div className="pr-2 text-right text-muted-foreground">{CLASSES[i]}</div>
              {row.map((v, j) => (
                <div
                  key={j}
                  className={cn(
                    "grid place-items-center rounded-md py-2 font-mono",
                    i === j ? "bg-primary/20 text-primary" : "bg-surface-2/70 text-muted-foreground",
                  )}
                >
                  {v}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
