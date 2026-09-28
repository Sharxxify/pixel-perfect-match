/** Domain types + realistic mock data / demo-mode inference for AquaSense. */

export type QualityClass = "Good" | "Moderate" | "Poor";

export type WaterParameters = {
  temperature: number;
  dissolvedOxygen: number;
  ph: number;
  conductivity: number;
  bod: number;
  nitrate: number;
  fecalColiform: number;
  totalColiform: number;
};

export type ParameterKey = keyof WaterParameters;

export type ParameterSpec = {
  key: ParameterKey;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  ideal: [number, number];
  acceptable: [number, number];
  hint: string;
};

export const PARAMETER_SPECS: ParameterSpec[] = [
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    step: 0.1,
    min: 0,
    max: 50,
    ideal: [15, 26],
    acceptable: [10, 32],
    hint: "Warm water holds less oxygen",
  },
  {
    key: "dissolvedOxygen",
    label: "Dissolved Oxygen (DO)",
    unit: "mg/L",
    step: 0.1,
    min: 0,
    max: 20,
    ideal: [6, 14],
    acceptable: [4, 18],
    hint: "Above 6 mg/L supports aquatic life",
  },
  {
    key: "ph",
    label: "pH",
    unit: "",
    step: 0.1,
    min: 0,
    max: 14,
    ideal: [6.5, 8.5],
    acceptable: [6, 9],
    hint: "Neutral range 6.5 – 8.5",
  },
  {
    key: "conductivity",
    label: "Conductivity",
    unit: "µS/cm",
    step: 1,
    min: 0,
    max: 5000,
    ideal: [50, 800],
    acceptable: [20, 1500],
    hint: "Proxy for dissolved salts",
  },
  {
    key: "bod",
    label: "BOD",
    unit: "mg/L",
    step: 0.1,
    min: 0,
    max: 50,
    ideal: [0, 2],
    acceptable: [0, 5],
    hint: "Organic load indicator",
  },
  {
    key: "nitrate",
    label: "Nitrate + Nitrite",
    unit: "mg/L",
    step: 0.1,
    min: 0,
    max: 100,
    ideal: [0, 5],
    acceptable: [0, 10],
    hint: "Agricultural runoff marker",
  },
  {
    key: "fecalColiform",
    label: "Fecal Coliform",
    unit: "MPN/100mL",
    step: 1,
    min: 0,
    max: 20000,
    ideal: [0, 50],
    acceptable: [0, 500],
    hint: "Sewage contamination marker",
  },
  {
    key: "totalColiform",
    label: "Total Coliform",
    unit: "MPN/100mL",
    step: 1,
    min: 0,
    max: 50000,
    ideal: [0, 200],
    acceptable: [0, 2500],
    hint: "Overall microbial load",
  },
];

export const DEFAULT_PARAMETERS: WaterParameters = {
  temperature: 24.5,
  dissolvedOxygen: 6.8,
  ph: 7.4,
  conductivity: 420,
  bod: 2.1,
  nitrate: 3.4,
  fecalColiform: 180,
  totalColiform: 940,
};

export type ParameterHealth = {
  key: ParameterKey;
  label: string;
  unit: string;
  value: number;
  status: QualityClass;
  note: string;
};

export type ShapContribution = {
  feature: string;
  contribution: number;
};

export type ModelPrediction = {
  model: string;
  prediction: QualityClass;
  confidence: number;
  probabilities: Record<QualityClass, number>;
};

export type Recommendation = {
  title: string;
  priority: "Critical" | "Recommended" | "Optional";
  detail: string;
};

export type AnalysisResult = {
  classification: QualityClass;
  confidence: number;
  probabilities: Record<QualityClass, number>;
  models: ModelPrediction[];
  parameterHealth: ParameterHealth[];
  recommendations: Recommendation[];
  shap: ShapContribution[];
  wqi: number;
};

/* ------------------------------ scoring rules ------------------------------ */

function scoreParameter(spec: ParameterSpec, value: number): number {
  const [idealLow, idealHigh] = spec.ideal;
  const [okLow, okHigh] = spec.acceptable;
  if (value >= idealLow && value <= idealHigh) return 1;
  if (value >= okLow && value <= okHigh) return 0.6;
  const distance =
    value < okLow ? (okLow - value) / Math.max(okLow, 1) : (value - okHigh) / Math.max(okHigh, 1);
  return Math.max(0, 0.45 - Math.min(distance, 1) * 0.45);
}

function statusFromScore(score: number): QualityClass {
  if (score >= 0.85) return "Good";
  if (score >= 0.5) return "Moderate";
  return "Poor";
}

const WEIGHTS: Record<ParameterKey, number> = {
  dissolvedOxygen: 1.6,
  fecalColiform: 1.6,
  bod: 1.4,
  ph: 1.2,
  totalColiform: 1.1,
  nitrate: 1,
  conductivity: 0.8,
  temperature: 0.6,
};

function parameterNote(spec: ParameterSpec, value: number, status: QualityClass): string {
  if (status === "Good") return `Within ideal range (${spec.ideal[0]}–${spec.ideal[1]})`;
  const tooLow = value < spec.ideal[0];
  const direction = tooLow ? "below" : "above";
  return `${status === "Poor" ? "Far" : "Slightly"} ${direction} ideal range (${spec.ideal[0]}–${spec.ideal[1]})`;
}

export function mockExplain(params: WaterParameters): ShapContribution[] {
  return PARAMETER_SPECS.map((spec) => {
    const score = scoreParameter(spec, params[spec.key]);
    const weight = WEIGHTS[spec.key];
    return {
      feature: spec.label,
      contribution: Number((((score - 0.7) * weight) / 1.6).toFixed(3)),
    };
  }).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}

function buildRecommendations(params: WaterParameters, health: ParameterHealth[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const bad = (key: ParameterKey) => health.find((h) => h.key === key)?.status !== "Good";

  if (params.dissolvedOxygen < 5 || params.bod > 3) {
    recs.push({
      title: "Aeration",
      priority: params.dissolvedOxygen < 3.5 ? "Critical" : "Recommended",
      detail: `DO at ${params.dissolvedOxygen} mg/L with BOD ${params.bod} mg/L — install cascade or diffused aeration to raise oxygen above 6 mg/L and oxidise organic load.`,
    });
  }
  if (params.ph < 6.5 || params.ph > 8.5) {
    recs.push({
      title: "pH neutralization",
      priority: params.ph < 6 || params.ph > 9 ? "Critical" : "Recommended",
      detail:
        params.ph < 6.5
          ? `pH ${params.ph} is acidic — dose lime or soda ash to bring it into 6.5–8.5.`
          : `pH ${params.ph} is alkaline — dose CO₂ or dilute acid to bring it into 6.5–8.5.`,
    });
  }
  if (params.fecalColiform > 50 || params.totalColiform > 500) {
    recs.push({
      title: "Disinfection / chlorination",
      priority: params.fecalColiform > 500 ? "Critical" : "Recommended",
      detail: `Fecal coliform ${Math.round(params.fecalColiform)} MPN/100mL — chlorinate to 0.2–0.5 mg/L free residual, or use UV where turbidity allows.`,
    });
  }
  if (params.conductivity > 800 || params.bod > 5 || bad("totalColiform")) {
    recs.push({
      title: "Filtration",
      priority: params.conductivity > 1500 ? "Critical" : "Recommended",
      detail: `Conductivity ${Math.round(params.conductivity)} µS/cm — add rapid sand or multimedia filtration; consider RO/nanofiltration above 1500 µS/cm.`,
    });
  }
  if (params.nitrate > 5) {
    recs.push({
      title: "Nitrate removal",
      priority: params.nitrate > 10 ? "Critical" : "Recommended",
      detail: `Nitrate + nitrite at ${params.nitrate} mg/L — use ion exchange or biological denitrification and audit upstream fertiliser runoff.`,
    });
  }
  if (recs.length === 0) {
    recs.push({
      title: "Maintain monitoring cadence",
      priority: "Optional",
      detail:
        "All parameters sit in ideal ranges. Keep weekly sampling and quarterly sensor calibration to catch drift early.",
    });
  }
  return recs;
}

/** Deterministic demo-mode inference used when the FastAPI backend is offline. */
export function mockAnalyze(params: WaterParameters): AnalysisResult {
  const parameterHealth: ParameterHealth[] = PARAMETER_SPECS.map((spec) => {
    const value = params[spec.key];
    const score = scoreParameter(spec, value);
    const status = statusFromScore(score);
    return {
      key: spec.key,
      label: spec.label,
      unit: spec.unit,
      value,
      status,
      note: parameterNote(spec, value, status),
    };
  });

  const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  const weighted = PARAMETER_SPECS.reduce(
    (sum, spec) => sum + scoreParameter(spec, params[spec.key]) * WEIGHTS[spec.key],
    0,
  );
  const score = weighted / totalWeight;

  const good = Math.max(0.01, Math.min(0.97, (score - 0.45) * 2.1));
  const poor = Math.max(0.01, Math.min(0.97, (0.72 - score) * 2.0));
  const moderate = Math.max(0.02, 1 - good - poor);
  const norm = good + poor + moderate;
  const probabilities: Record<QualityClass, number> = {
    Good: good / norm,
    Moderate: moderate / norm,
    Poor: poor / norm,
  };

  const classification = (Object.entries(probabilities) as [QualityClass, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
  const confidence = probabilities[classification];

  const rfShift = 0.045;
  const rfProbs: Record<QualityClass, number> = {
    Good: Math.max(0.01, probabilities.Good - rfShift),
    Moderate: probabilities.Moderate + rfShift * 1.4,
    Poor: Math.max(0.01, probabilities.Poor - rfShift * 0.4),
  };
  const rfNorm = rfProbs.Good + rfProbs.Moderate + rfProbs.Poor;
  (Object.keys(rfProbs) as QualityClass[]).forEach((k) => {
    rfProbs[k] = rfProbs[k] / rfNorm;
  });
  const rfPrediction = (Object.entries(rfProbs) as [QualityClass, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];

  return {
    classification,
    confidence,
    probabilities,
    wqi: Math.round(score * 100),
    models: [
      { model: "XGBoost", prediction: classification, confidence, probabilities },
      {
        model: "Random Forest",
        prediction: rfPrediction,
        confidence: rfProbs[rfPrediction],
        probabilities: rfProbs,
      },
    ],
    parameterHealth,
    recommendations: buildRecommendations(params, parameterHealth),
    shap: mockExplain(params),
  };
}

/* ------------------------------- mock records ------------------------------ */

export type WaterSource = {
  id: string;
  name: string;
  location: string;
  type: "River" | "Lake" | "Reservoir" | "Groundwater" | "Canal";
  quality: QualityClass;
  lastUpdated: string;
  parameters: WaterParameters;
};

export const mockWaterSources: WaterSource[] = [
  {
    id: "WS-101",
    name: "Krishna River — Vijayawada",
    location: "Andhra Pradesh, IN",
    type: "River",
    quality: "Good",
    lastUpdated: "8 min ago",
    parameters: {
      temperature: 25.4,
      dissolvedOxygen: 7.6,
      ph: 7.5,
      conductivity: 385,
      bod: 1.6,
      nitrate: 2.1,
      fecalColiform: 32,
      totalColiform: 180,
    },
  },
  {
    id: "WS-102",
    name: "Hussain Sagar Lake",
    location: "Hyderabad, IN",
    type: "Lake",
    quality: "Poor",
    lastUpdated: "12 min ago",
    parameters: {
      temperature: 29.8,
      dissolvedOxygen: 2.4,
      ph: 9.2,
      conductivity: 1720,
      bod: 14.8,
      nitrate: 12.6,
      fecalColiform: 4200,
      totalColiform: 16800,
    },
  },
  {
    id: "WS-103",
    name: "Osman Sagar Reservoir",
    location: "Telangana, IN",
    type: "Reservoir",
    quality: "Good",
    lastUpdated: "20 min ago",
    parameters: {
      temperature: 23.1,
      dissolvedOxygen: 8.1,
      ph: 7.2,
      conductivity: 290,
      bod: 1.1,
      nitrate: 1.4,
      fecalColiform: 18,
      totalColiform: 96,
    },
  },
  {
    id: "WS-104",
    name: "Musi River — Amberpet",
    location: "Hyderabad, IN",
    type: "River",
    quality: "Poor",
    lastUpdated: "5 min ago",
    parameters: {
      temperature: 31.2,
      dissolvedOxygen: 1.6,
      ph: 6.1,
      conductivity: 2350,
      bod: 22.4,
      nitrate: 18.9,
      fecalColiform: 9800,
      totalColiform: 31000,
    },
  },
  {
    id: "WS-105",
    name: "Nagarjuna Sagar Canal",
    location: "Nalgonda, IN",
    type: "Canal",
    quality: "Moderate",
    lastUpdated: "31 min ago",
    parameters: {
      temperature: 27.4,
      dissolvedOxygen: 5.2,
      ph: 8.1,
      conductivity: 910,
      bod: 4.3,
      nitrate: 7.2,
      fecalColiform: 340,
      totalColiform: 2100,
    },
  },
  {
    id: "WS-106",
    name: "Borewell Cluster — Medak",
    location: "Medak, IN",
    type: "Groundwater",
    quality: "Moderate",
    lastUpdated: "48 min ago",
    parameters: {
      temperature: 26.1,
      dissolvedOxygen: 4.8,
      ph: 6.4,
      conductivity: 1180,
      bod: 2.9,
      nitrate: 9.1,
      fecalColiform: 210,
      totalColiform: 1450,
    },
  },
  {
    id: "WS-107",
    name: "Godavari — Bhadrachalam",
    location: "Telangana, IN",
    type: "River",
    quality: "Good",
    lastUpdated: "1 h ago",
    parameters: {
      temperature: 24.8,
      dissolvedOxygen: 7.1,
      ph: 7.7,
      conductivity: 445,
      bod: 1.9,
      nitrate: 3.1,
      fecalColiform: 44,
      totalColiform: 260,
    },
  },
  {
    id: "WS-108",
    name: "Himayat Sagar Intake",
    location: "Hyderabad, IN",
    type: "Reservoir",
    quality: "Good",
    lastUpdated: "1 h ago",
    parameters: {
      temperature: 23.9,
      dissolvedOxygen: 7.9,
      ph: 7.3,
      conductivity: 320,
      bod: 1.4,
      nitrate: 1.9,
      fecalColiform: 26,
      totalColiform: 140,
    },
  },
  {
    id: "WS-109",
    name: "Manjeera Feeder Canal",
    location: "Sangareddy, IN",
    type: "Canal",
    quality: "Moderate",
    lastUpdated: "2 h ago",
    parameters: {
      temperature: 28.2,
      dissolvedOxygen: 5.6,
      ph: 8.4,
      conductivity: 860,
      bod: 3.8,
      nitrate: 6.4,
      fecalColiform: 290,
      totalColiform: 1900,
    },
  },
  {
    id: "WS-110",
    name: "Kolleru Lake Inlet",
    location: "Eluru, IN",
    type: "Lake",
    quality: "Poor",
    lastUpdated: "2 h ago",
    parameters: {
      temperature: 30.4,
      dissolvedOxygen: 3.1,
      ph: 8.9,
      conductivity: 1560,
      bod: 11.2,
      nitrate: 14.1,
      fecalColiform: 2600,
      totalColiform: 12400,
    },
  },
  {
    id: "WS-111",
    name: "Tungabhadra Offtake",
    location: "Kurnool, IN",
    type: "River",
    quality: "Good",
    lastUpdated: "3 h ago",
    parameters: {
      temperature: 25.9,
      dissolvedOxygen: 6.9,
      ph: 7.6,
      conductivity: 510,
      bod: 2,
      nitrate: 3.6,
      fecalColiform: 58,
      totalColiform: 310,
    },
  },
  {
    id: "WS-112",
    name: "Industrial Outfall — Patancheru",
    location: "Sangareddy, IN",
    type: "Canal",
    quality: "Poor",
    lastUpdated: "3 h ago",
    parameters: {
      temperature: 33.6,
      dissolvedOxygen: 1.2,
      ph: 5.4,
      conductivity: 3100,
      bod: 28.6,
      nitrate: 21.4,
      fecalColiform: 7400,
      totalColiform: 24800,
    },
  },
];

export type Measurement = {
  id: string;
  sourceId: string;
  source: string;
  timestamp: string;
  ph: number;
  dissolvedOxygen: number;
  bod: number;
  quality: QualityClass;
  model: string;
  confidence: number;
};

export const mockMeasurements: Measurement[] = [
  {
    id: "M-9041",
    sourceId: "WS-104",
    source: "Musi River — Amberpet",
    timestamp: "Today 09:42",
    ph: 6.1,
    dissolvedOxygen: 1.6,
    bod: 22.4,
    quality: "Poor",
    model: "XGBoost",
    confidence: 0.96,
  },
  {
    id: "M-9040",
    sourceId: "WS-101",
    source: "Krishna River — Vijayawada",
    timestamp: "Today 09:35",
    ph: 7.5,
    dissolvedOxygen: 7.6,
    bod: 1.6,
    quality: "Good",
    model: "XGBoost",
    confidence: 0.94,
  },
  {
    id: "M-9039",
    sourceId: "WS-105",
    source: "Nagarjuna Sagar Canal",
    timestamp: "Today 09:11",
    ph: 8.1,
    dissolvedOxygen: 5.2,
    bod: 4.3,
    quality: "Moderate",
    model: "Random Forest",
    confidence: 0.81,
  },
  {
    id: "M-9038",
    sourceId: "WS-102",
    source: "Hussain Sagar Lake",
    timestamp: "Today 08:57",
    ph: 9.2,
    dissolvedOxygen: 2.4,
    bod: 14.8,
    quality: "Poor",
    model: "XGBoost",
    confidence: 0.93,
  },
  {
    id: "M-9037",
    sourceId: "WS-103",
    source: "Osman Sagar Reservoir",
    timestamp: "Today 08:40",
    ph: 7.2,
    dissolvedOxygen: 8.1,
    bod: 1.1,
    quality: "Good",
    model: "XGBoost",
    confidence: 0.97,
  },
  {
    id: "M-9036",
    sourceId: "WS-106",
    source: "Borewell Cluster — Medak",
    timestamp: "Today 08:22",
    ph: 6.4,
    dissolvedOxygen: 4.8,
    bod: 2.9,
    quality: "Moderate",
    model: "Random Forest",
    confidence: 0.78,
  },
  {
    id: "M-9035",
    sourceId: "WS-112",
    source: "Industrial Outfall — Patancheru",
    timestamp: "Today 07:58",
    ph: 5.4,
    dissolvedOxygen: 1.2,
    bod: 28.6,
    quality: "Poor",
    model: "XGBoost",
    confidence: 0.99,
  },
  {
    id: "M-9034",
    sourceId: "WS-107",
    source: "Godavari — Bhadrachalam",
    timestamp: "Today 07:30",
    ph: 7.7,
    dissolvedOxygen: 7.1,
    bod: 1.9,
    quality: "Good",
    model: "XGBoost",
    confidence: 0.92,
  },
];

export type Alert = {
  id: string;
  severity: "Critical" | "Warning" | "Info";
  source: string;
  parameter: string;
  message: string;
  time: string;
  acknowledged: boolean;
};

export const mockAlerts: Alert[] = [
  {
    id: "A-501",
    severity: "Critical",
    source: "Industrial Outfall — Patancheru",
    parameter: "BOD",
    message: "BOD spiked to 28.6 mg/L (limit 5) — untreated effluent suspected.",
    time: "07:58 today",
    acknowledged: false,
  },
  {
    id: "A-502",
    severity: "Critical",
    source: "Musi River — Amberpet",
    parameter: "Fecal Coliform",
    message: "Fecal coliform 9,800 MPN/100mL — immediate chlorination advised.",
    time: "09:42 today",
    acknowledged: false,
  },
  {
    id: "A-503",
    severity: "Critical",
    source: "Hussain Sagar Lake",
    parameter: "Dissolved Oxygen",
    message: "DO fell to 2.4 mg/L — hypoxic conditions, fish-kill risk.",
    time: "08:57 today",
    acknowledged: false,
  },
  {
    id: "A-504",
    severity: "Warning",
    source: "Kolleru Lake Inlet",
    parameter: "pH",
    message: "pH drifting alkaline at 8.9 — monitor algal bloom activity.",
    time: "Yesterday 22:10",
    acknowledged: false,
  },
  {
    id: "A-505",
    severity: "Warning",
    source: "Borewell Cluster — Medak",
    parameter: "Nitrate",
    message: "Nitrate at 9.1 mg/L approaching the 10 mg/L drinking limit.",
    time: "Yesterday 18:45",
    acknowledged: true,
  },
  {
    id: "A-506",
    severity: "Warning",
    source: "Manjeera Feeder Canal",
    parameter: "Conductivity",
    message: "Conductivity at 860 µS/cm — salinity trending upward for 5 days.",
    time: "Yesterday 14:02",
    acknowledged: true,
  },
  {
    id: "A-507",
    severity: "Info",
    source: "Osman Sagar Reservoir",
    parameter: "Sensor",
    message: "DO probe calibration completed, drift within 1.2%.",
    time: "Yesterday 09:30",
    acknowledged: true,
  },
];

export type HistoryPoint = {
  date: string;
  ph: number;
  dissolvedOxygen: number;
  bod: number;
  conductivity: number;
  nitrate: number;
  fecalColiform: number;
  totalColiform: number;
};

export const mockHistory: HistoryPoint[] = [
  { date: "Mar", ph: 7.6, dissolvedOxygen: 7.4, bod: 2.1, conductivity: 410, nitrate: 3.1, fecalColiform: 120, totalColiform: 640 },
  { date: "Apr", ph: 7.4, dissolvedOxygen: 7.0, bod: 2.6, conductivity: 460, nitrate: 3.8, fecalColiform: 180, totalColiform: 880 },
  { date: "May", ph: 7.2, dissolvedOxygen: 6.2, bod: 3.4, conductivity: 540, nitrate: 4.9, fecalColiform: 320, totalColiform: 1420 },
  { date: "Jun", ph: 6.9, dissolvedOxygen: 5.4, bod: 4.8, conductivity: 690, nitrate: 6.6, fecalColiform: 620, totalColiform: 2650 },
  { date: "Jul", ph: 7.0, dissolvedOxygen: 5.8, bod: 4.2, conductivity: 720, nitrate: 7.4, fecalColiform: 540, totalColiform: 2310 },
  { date: "Aug", ph: 7.3, dissolvedOxygen: 6.5, bod: 3.1, conductivity: 610, nitrate: 5.8, fecalColiform: 380, totalColiform: 1680 },
  { date: "Sep", ph: 7.5, dissolvedOxygen: 6.9, bod: 2.7, conductivity: 520, nitrate: 4.6, fecalColiform: 240, totalColiform: 1120 },
  { date: "Oct", ph: 7.7, dissolvedOxygen: 7.3, bod: 2.2, conductivity: 470, nitrate: 3.9, fecalColiform: 160, totalColiform: 820 },
  { date: "Nov", ph: 7.8, dissolvedOxygen: 7.7, bod: 1.8, conductivity: 430, nitrate: 3.2, fecalColiform: 110, totalColiform: 590 },
  { date: "Dec", ph: 7.6, dissolvedOxygen: 7.9, bod: 1.6, conductivity: 400, nitrate: 2.8, fecalColiform: 90, totalColiform: 480 },
];

export type ModelMetrics = {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  trainedOn: string;
  latencyMs: number;
  classReport: { label: QualityClass; precision: number; recall: number; f1: number; support: number }[];
  confusion: number[][];
};

export const mockModels: ModelMetrics[] = [
  {
    name: "XGBoost",
    accuracy: 0.943,
    precision: 0.938,
    recall: 0.931,
    f1: 0.934,
    trainedOn: "18,420 samples · CPCB 2015–2024",
    latencyMs: 12,
    classReport: [
      { label: "Good", precision: 0.96, recall: 0.97, f1: 0.965, support: 980 },
      { label: "Moderate", precision: 0.91, recall: 0.88, f1: 0.895, support: 610 },
      { label: "Poor", precision: 0.95, recall: 0.94, f1: 0.945, support: 452 },
    ],
    confusion: [
      [951, 24, 5],
      [41, 537, 32],
      [6, 21, 425],
    ],
  },
  {
    name: "Random Forest",
    accuracy: 0.917,
    precision: 0.909,
    recall: 0.902,
    f1: 0.905,
    trainedOn: "18,420 samples · CPCB 2015–2024",
    latencyMs: 27,
    classReport: [
      { label: "Good", precision: 0.94, recall: 0.95, f1: 0.945, support: 980 },
      { label: "Moderate", precision: 0.87, recall: 0.84, f1: 0.855, support: 610 },
      { label: "Poor", precision: 0.92, recall: 0.91, f1: 0.915, support: 452 },
    ],
    confusion: [
      [931, 42, 7],
      [55, 512, 43],
      [9, 32, 411],
    ],
  },
];

export const mockFeatureImportance = [
  { feature: "Fecal Coliform", xgboost: 0.24, randomForest: 0.21 },
  { feature: "Dissolved Oxygen", xgboost: 0.21, randomForest: 0.19 },
  { feature: "BOD", xgboost: 0.18, randomForest: 0.2 },
  { feature: "Total Coliform", xgboost: 0.12, randomForest: 0.13 },
  { feature: "pH", xgboost: 0.09, randomForest: 0.1 },
  { feature: "Nitrate + Nitrite", xgboost: 0.08, randomForest: 0.09 },
  { feature: "Conductivity", xgboost: 0.05, randomForest: 0.05 },
  { feature: "Temperature", xgboost: 0.03, randomForest: 0.03 },
];

export const mockTrainingCurve = [
  { epoch: 10, xgboost: 0.78, randomForest: 0.74 },
  { epoch: 30, xgboost: 0.85, randomForest: 0.81 },
  { epoch: 60, xgboost: 0.9, randomForest: 0.86 },
  { epoch: 100, xgboost: 0.925, randomForest: 0.895 },
  { epoch: 150, xgboost: 0.938, randomForest: 0.908 },
  { epoch: 200, xgboost: 0.943, randomForest: 0.917 },
];

export const qualityCounts = mockWaterSources.reduce(
  (acc, s) => {
    acc[s.quality] += 1;
    return acc;
  },
  { Good: 0, Moderate: 0, Poor: 0 } as Record<QualityClass, number>,
);
