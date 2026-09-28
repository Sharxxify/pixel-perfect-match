/**
 * AquaSense API layer.
 *
 * Talks to a FastAPI backend when reachable, otherwise falls back to Demo Mode
 * (deterministic mock predictions + mock station data). The UI never depends on
 * the backend being available.
 */
import {
  mockAnalyze,
  mockExplain,
  mockModels,
  mockWaterSources,
  type AnalysisResult,
  type ModelMetrics,
  type ShapContribution,
  type WaterParameters,
  type WaterSource,
} from "@/lib/mock-data";

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000";

export type ApiSource = "backend" | "demo";

export type ApiResponse<T> = {
  data: T;
  source: ApiSource;
};

const TIMEOUT_MS = 3500;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** GET /health */
export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status?: string }>("/health");
    return true;
  } catch {
    return false;
  }
}

/** POST /predict */
export async function predict(params: WaterParameters): Promise<ApiResponse<AnalysisResult>> {
  try {
    const data = await request<AnalysisResult>("/predict", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return { data, source: "backend" };
  } catch {
    return { data: mockAnalyze(params), source: "demo" };
  }
}

/** POST /explain */
export async function explain(
  params: WaterParameters,
): Promise<ApiResponse<ShapContribution[]>> {
  try {
    const data = await request<ShapContribution[]>("/explain", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return { data, source: "backend" };
  } catch {
    return { data: mockExplain(params), source: "demo" };
  }
}

/** GET /water-sources */
export async function getWaterSources(): Promise<ApiResponse<WaterSource[]>> {
  try {
    const data = await request<WaterSource[]>("/water-sources");
    return { data, source: "backend" };
  } catch {
    return { data: mockWaterSources, source: "demo" };
  }
}

/** GET /models */
export async function getModels(): Promise<ApiResponse<ModelMetrics[]>> {
  try {
    const data = await request<ModelMetrics[]>("/models");
    return { data, source: "backend" };
  } catch {
    return { data: mockModels, source: "demo" };
  }
}
