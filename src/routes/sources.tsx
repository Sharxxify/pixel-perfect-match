import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin } from "lucide-react";

import { PageHeader } from "@/components/aqua/AppShell";
import { QualityBadge, SectionCard } from "@/components/aqua/quality";
import { mockWaterSources, type QualityClass } from "@/lib/mock-data";
import { getWaterSources } from "@/services/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: "Water Sources — AquaSense" },
      {
        name: "description",
        content:
          "Browse all monitored stations with location, source type, current AI quality class and the latest sensor measurements.",
      },
      { property: "og:title", content: "Water Sources — AquaSense" },
      {
        property: "og:description",
        content: "Rivers, lakes, reservoirs, canals and borewells with live quality classification.",
      },
    ],
  }),
  component: SourcesPage,
});

const FILTERS = ["All", "Good", "Moderate", "Poor"] as const;

function SourcesPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const { data: sourcesRes } = useQuery({
    queryKey: ["water-sources"],
    queryFn: getWaterSources,
    staleTime: 30_000,
  });

  const allSources = sourcesRes?.data ?? mockWaterSources;
  const list = allSources.filter((s) => filter === "All" || s.quality === filter);

  return (
    <>
      <PageHeader
        title="Water Sources"
        description="Every monitoring station in the network with its latest eight-parameter reading."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              filter === f
                ? "border-primary/50 bg-primary/12 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
            {f !== "All" && (
              <span className="ml-1.5 opacity-70">
                {allSources.filter((s) => s.quality === (f as QualityClass)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <SectionCard
            key={s.id}
            title={s.name}
            description={s.type}
            actions={<QualityBadge quality={s.quality} />}
          >
            <p className="-mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-primary" />
              {s.location} · updated {s.lastUpdated}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <Row label="Temperature" value={`${s.parameters.temperature} °C`} />
              <Row label="DO" value={`${s.parameters.dissolvedOxygen} mg/L`} />
              <Row label="pH" value={s.parameters.ph.toFixed(1)} />
              <Row label="Conductivity" value={`${s.parameters.conductivity} µS/cm`} />
              <Row label="BOD" value={`${s.parameters.bod} mg/L`} />
              <Row label="Nitrate" value={`${s.parameters.nitrate} mg/L`} />
              <Row label="Fecal coli." value={`${s.parameters.fecalColiform}`} />
              <Row label="Total coli." value={`${s.parameters.totalColiform}`} />
            </dl>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">{s.id}</p>
          </SectionCard>
        ))}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/50 pb-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
