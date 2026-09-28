import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BellRing,
  BrainCircuit,
  Database,
  Droplets,
  Gauge,
  LayoutDashboard,
  Map,
  Menu,
  Settings,
  Waves,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useBackendStatus } from "@/hooks/use-backend-status";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analysis", label: "Water Quality Analysis", icon: Droplets },
  { to: "/sources", label: "Water Sources", icon: Map },
  { to: "/historical", label: "Historical Data", icon: Database },
  { to: "/insights", label: "AI Insights", icon: BrainCircuit },
  { to: "/models", label: "Model Performance", icon: Gauge },
  { to: "/alerts", label: "Alerts", icon: BellRing },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--primary)]"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-primary",
              )}
            />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-3 py-1">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/15 glow-ring">
        <Waves className="size-5 text-primary" />
      </div>
      <div className="leading-tight">
        <p className="font-display text-lg font-semibold">AquaSense</p>
        <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
          AI water intelligence
        </p>
      </div>
    </div>
  );
}

function StatusPill() {
  const { online, loading } = useBackendStatus();
  const demo = !online;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        demo ? "border-moderate/40 bg-moderate/10 text-moderate" : "border-good/40 bg-good/10 text-good",
      )}
      title={demo ? "FastAPI backend unreachable — serving mock predictions" : "Connected to FastAPI backend"}
    >
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            demo ? "bg-moderate" : "bg-good",
          )}
        />
        <span className={cn("relative inline-flex size-2 rounded-full", demo ? "bg-moderate" : "bg-good")} />
      </span>
      {loading ? "Checking backend…" : demo ? "Demo Mode" : "Live Backend"}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background aqua-grid">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col gap-6 border-r border-sidebar-border bg-sidebar/95 p-4 backdrop-blur lg:flex">
        <Brand />
        <NavLinks />
        <div className="mt-auto rounded-xl border border-sidebar-border bg-surface/60 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="size-3.5 text-primary" />
            Ensemble: XGBoost + Random Forest
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            IoT sondes stream every 15 minutes across 12 stations.
          </p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4">
            <Brand />
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
          <button
            className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
          <div className="hidden text-sm text-muted-foreground sm:block">
            Monitoring network · South India · 12 stations
          </div>
          <div className="ml-auto flex items-center gap-3">
            <StatusPill />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
