import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FlaskConical, Loader2, RotateCcw, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/aqua/AppShell";
import { QUALITY_STYLES, QualityBadge, SectionCard } from "@/components/aqua/quality";
import { chartTooltipStyle } from "@/lib/chart-style";
import {
  DEFAULT_PARAMETERS,
  PARAMETER_SPECS,
  mockWaterSources,
  type AnalysisResult,
  type QualityClass,
  type WaterParameters,
} from "@/lib/mock-data";
import { predict, type ApiSource } from "@/services/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analysis")({
  head: () => ({
    meta: [
      { title: "Water Quality Analysis — AquaSense" },
      {
        name: "description",
        content:
          "Enter temperature, DO, pH, conductivity, BOD, nitrate and coliform values to get an AI Good/Moderate/Poor classification with treatment recommendations.",
      },
      { property: "og:title", content: "Water Quality Analysis — AquaSense" },
      {
        property: "og:description",
        content:
          "XGBoost vs Random Forest predictions, SHAP feature contributions and treatment guidance for any water sample.",
      },
    ],
  }),
  component: AnalysisPage,
});

const PRESETS: { label: string; params: WaterParameters }[] = [
  { label: "Clean reservoir", params: mockWaterSources[2].parameters },
  { label: "Urban canal", params: mockWaterSources[4].parameters },
  { label: "Industrial outfall", params: mockWaterSources[11].parameters },
];

function AnalysisPage() {
  const [params, setParams] = useState<WaterParameters>(DEFAULT_PARAMETERS);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [source, setSource] = useState<ApiSource>("demo");
  const [loading, setLoading] = useState(false);

  const update = (key: keyof WaterParameters, raw: string) => {
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value)) return;
    setParams((p) => ({ ...p, [key]: value }));
  };

  const analyze = async () => {
    setLoading(true);
    const started = Date.now();
    const res = await predict(params);
    const elapsed = Date.now() - started;
    if (elapsed < 650) await new Promise((r) => setTimeout(r, 650 - elapsed));
    setResult(res.data);
    setSource(res.source);
    setLoading(false);
  };

  return (
    <>
      <PageHeader
        title="Water Quality Analysis"
        description="Submit an eight-parameter sample for ensemble classification, explainability and treatment guidance."
        actions={
          <button
            onClick={() => {
              setParams(DEFAULT_PARAMETERS);
              setResult(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-4" /> Reset
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <SectionCard
          title="Sample parameters"
          description="Values are validated against CPCB / WHO reference ranges"
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setParams(p.params)}
                className="rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PARAMETER_SPECS.map((spec) => (
              <div key={spec.key}>
                <label
                  htmlFor={spec.key}
                  className="flex items-baseline justify-between gap-2 text-xs font-medium"
                >
                  <span>{spec.label}</span>
                  {spec.unit && <span className="text-muted-foreground">{spec.unit}</span>}
                </label>
                <input
                  id={spec.key}
                  type="number"
                  step={spec.step}
                  min={spec.min}
                  max={spec.max}
                  value={params[spec.key]}
                  onChange={(e) => update(spec.key, e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background/60 px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{spec.hint}</p>
              </div>
            ))}
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Running ensemble…
              </>
            ) : (
              <>
                <FlaskConical className="size-4" /> Analyze Water Quality
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {source === "backend"
              ? "Predictions served by the FastAPI backend."
              : "Demo Mode: deterministic mock inference, no backend required."}
          </p>
        </SectionCard>

        <div className="space-y-4">
          {!result ? (
            <div className="panel grid min-h-[420px] place-items-center p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12 glow-ring">
                  <Sparkles className="size-6 text-primary" />
                </div>
                <h2 className="mt-4 font-display text-lg font-semibold">Awaiting a sample</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter parameter values or pick a preset, then run the analysis to see
                  classification, model comparison, SHAP contributions and treatment steps.
                </p>
              </div>
            </div>
          ) : (
            <ResultPanels result={result} />
          )}
        </div>
      </div>
    </>
  );
}

function ResultPanels({ result }: { result: AnalysisResult }) {
  const probData = (["Good", "Moderate", "Poor"] as QualityClass[]).map((k) => ({
    name: k,
    probability: Number((result.probabilities[k] * 100).toFixed(1)),
  }));

  const comparison = (["Good", "Moderate", "Poor"] as QualityClass[]).map((k) => ({
    name: k,
    XGBoost: Number((result.models[0].probabilities[k] * 100).toFixed(1)),
    "Random Forest": Number((result.models[1].probabilities[k] * 100).toFixed(1)),
  }));

  const styles = QUALITY_STYLES[result.classification];

  return (
    <>
      <div className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              AI classification
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className={cn("font-display text-4xl font-semibold", styles.text)}>
                {result.classification}
              </span>
              <QualityBadge quality={result.classification} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Water Quality Index score {result.wqi}/100 · ensemble agreement{" "}
              {result.models[0].prediction === result.models[1].prediction ? "yes" : "split"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Confidence</p>
            <p className={cn("font-display text-4xl font-semibold", styles.text)}>
              {(result.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${result.confidence * 100}%`, background: styles.hex }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Class probabilities" description="Softmax output of the XGBoost head">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={probData} margin={{ left: -20, right: 8, top: 10 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} unit="%" />
                <Tooltip {...chartTooltipStyle} formatter={(v) => `${v}%`} />
                <Bar dataKey="probability" radius={[6, 6, 0, 0]} maxBarSize={64}>
                  <LabelList
                    dataKey="probability"
                    position="top"
                    fontSize={11}
                    fill="var(--muted-foreground)"
                    formatter={(v: number) => `${v}%`}
                  />
                  {probData.map((d) => (
                    <Cell key={d.name} fill={QUALITY_STYLES[d.name as QualityClass].hex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="XGBoost vs Random Forest"
          description="Per-class probability comparison between the two trained models"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison} margin={{ left: -20, right: 8, top: 10 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} unit="%" />
                <Tooltip {...chartTooltipStyle} formatter={(v) => `${v}%`} />
                <Legend iconType="circle" />
                <Bar dataKey="XGBoost" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar
                  dataKey="Random Forest"
                  fill="var(--chart-5)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {result.models.map((m) => (
              <div key={m.model} className="rounded-lg border border-border/70 bg-surface/60 p-3">
                <p className="text-xs text-muted-foreground">{m.model}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className={cn("font-semibold", QUALITY_STYLES[m.prediction].text)}>
                    {m.prediction}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {(m.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Parameter health indicators"
        description="Each input scored against ideal and acceptable ranges"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {result.parameterHealth.map((h) => (
            <div key={h.key} className="rounded-lg border border-border/70 bg-surface/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium">{h.label}</p>
                <span className={cn("size-2 shrink-0 rounded-full", QUALITY_STYLES[h.status].dot)} />
              </div>
              <p className={cn("mt-2 font-mono text-lg", QUALITY_STYLES[h.status].text)}>
                {h.value}
                <span className="ml-1 text-[11px] text-muted-foreground">{h.unit}</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{h.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Treatment recommendations"
          description="Rule-based actions triggered by the current parameter profile"
        >
          <ul className="space-y-3">
            {result.recommendations.map((r) => (
              <li key={r.title} className="rounded-lg border border-border/70 bg-surface/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.title}</p>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                      r.priority === "Critical"
                        ? "border-poor/40 bg-poor/10 text-poor"
                        : r.priority === "Recommended"
                          ? "border-moderate/40 bg-moderate/10 text-moderate"
                          : "border-good/40 bg-good/10 text-good",
                    )}
                  >
                    {r.priority}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{r.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="SHAP feature contributions"
          description="Positive values push toward Good, negative toward Poor"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={result.shap}
                layout="vertical"
                margin={{ left: 40, right: 16, top: 8 }}
              >
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  width={130}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                />
                <ReferenceLine x={0} stroke="var(--muted-foreground)" />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="contribution" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {result.shap.map((s) => (
                    <Cell
                      key={s.feature}
                      fill={s.contribution >= 0 ? "var(--good)" : "var(--poor)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
