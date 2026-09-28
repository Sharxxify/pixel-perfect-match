"""
FastAPI backend for AquaSense.
Directly connects machine learning models trained from waterquality (1).ipynb & waterquality.ipynb to the front end.
"""

import os
import json
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

# Automatically train models if artifacts are missing
if not os.path.exists(os.path.join(ARTIFACTS_DIR, "xgb_model.pkl")):
    from train import train_and_export
    print("Artifacts not found, initiating model training pipeline...")
    train_and_export()

# Load trained models & preprocessing
xgb_model = joblib.load(os.path.join(ARTIFACTS_DIR, "xgb_model.pkl"))
rf_model = joblib.load(os.path.join(ARTIFACTS_DIR, "rf_model.pkl"))
dt_model = joblib.load(os.path.join(ARTIFACTS_DIR, "dt_model.pkl"))
lr_pipeline = joblib.load(os.path.join(ARTIFACTS_DIR, "lr_model.pkl"))
imputer = joblib.load(os.path.join(ARTIFACTS_DIR, "imputer.pkl"))
label_encoder = joblib.load(os.path.join(ARTIFACTS_DIR, "label_encoder.pkl"))
features_list = joblib.load(os.path.join(ARTIFACTS_DIR, "features.pkl"))

with open(os.path.join(ARTIFACTS_DIR, "metrics.json"), "r", encoding="utf-8") as f:
    cached_metrics = json.load(f)

with open(os.path.join(ARTIFACTS_DIR, "sources.json"), "r", encoding="utf-8") as f:
    cached_sources = json.load(f)

csv_data_path = os.path.join(ARTIFACTS_DIR, "csv_data.json")
if not os.path.exists(csv_data_path):
    from generate_data import extract_and_bundle
    extract_and_bundle()

with open(csv_data_path, "r", encoding="utf-8") as f:
    csv_bundle = json.load(f)

app = FastAPI(
    title="AquaSense ML Backend",
    description="Machine Learning API for Water Quality Classification using XGBoost, Random Forest, Decision Tree, and Logistic Regression.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WaterParameters(BaseModel):
    temperature: float = Field(24.5, description="Temperature in °C")
    dissolvedOxygen: float = Field(6.8, description="Dissolved Oxygen in mg/L")
    ph: float = Field(7.4, description="pH value [0-14]")
    conductivity: float = Field(420.0, description="Conductivity in µS/cm")
    bod: float = Field(2.1, description="Biochemical Oxygen Demand in mg/L")
    nitrate: float = Field(3.4, description="Nitrate + Nitrite in mg/L")
    fecalColiform: float = Field(180.0, description="Fecal Coliform in MPN/100mL")
    totalColiform: float = Field(940.0, description="Total Coliform in MPN/100mL")

PARAMETER_SPECS = [
    {"key": "temperature", "label": "Temperature", "unit": "°C", "ideal": [15, 26], "acceptable": [10, 32]},
    {"key": "dissolvedOxygen", "label": "Dissolved Oxygen (DO)", "unit": "mg/L", "ideal": [6, 14], "acceptable": [4, 18]},
    {"key": "ph", "label": "pH", "unit": "", "ideal": [6.5, 8.5], "acceptable": [6, 9]},
    {"key": "conductivity", "label": "Conductivity", "unit": "µS/cm", "ideal": [50, 800], "acceptable": [20, 1500]},
    {"key": "bod", "label": "BOD", "unit": "mg/L", "ideal": [0, 2], "acceptable": [0, 5]},
    {"key": "nitrate", "label": "Nitrate + Nitrite", "unit": "mg/L", "ideal": [0, 5], "acceptable": [0, 10]},
    {"key": "fecalColiform", "label": "Fecal Coliform", "unit": "MPN/100mL", "ideal": [0, 50], "acceptable": [0, 500]},
    {"key": "totalColiform", "label": "Total Coliform", "unit": "MPN/100mL", "ideal": [0, 200], "acceptable": [0, 2500]},
]

WEIGHTS = {
    "dissolvedOxygen": 1.6,
    "fecalColiform": 1.6,
    "bod": 1.4,
    "ph": 1.2,
    "totalColiform": 1.1,
    "nitrate": 1.0,
    "conductivity": 0.8,
    "temperature": 0.6,
}

def evaluate_parameter_health(params: Dict[str, float]) -> List[Dict[str, Any]]:
    health_list = []
    for spec in PARAMETER_SPECS:
        key = spec["key"]
        val = params.get(key, 0.0)
        ideal_low, ideal_high = spec["ideal"]
        acc_low, acc_high = spec["acceptable"]

        if ideal_low <= val <= ideal_high:
            status = "Good"
            note = f"Within ideal range ({ideal_low}–{ideal_high})"
        elif acc_low <= val <= acc_high:
            status = "Moderate"
            direction = "below" if val < ideal_low else "above"
            note = f"Slightly {direction} ideal range ({ideal_low}–{ideal_high})"
        else:
            status = "Poor"
            direction = "below" if val < acc_low else "above"
            note = f"Far {direction} acceptable range ({acc_low}–{acc_high})"

        health_list.append({
            "key": key,
            "label": spec["label"],
            "unit": spec["unit"],
            "value": val,
            "status": status,
            "note": note
        })
    return health_list

def generate_recommendations(params: Dict[str, float]) -> List[Dict[str, str]]:
    recs = []
    do = params.get("dissolvedOxygen", 0.0)
    bod = params.get("bod", 0.0)
    ph = params.get("ph", 7.0)
    fc = params.get("fecalColiform", 0.0)
    tc = params.get("totalColiform", 0.0)
    cond = params.get("conductivity", 0.0)
    nitrate = params.get("nitrate", 0.0)

    if do < 5.0 or bod > 3.0:
        prio = "Critical" if do < 3.5 or bod > 6.0 else "Recommended"
        recs.append({
            "title": "Aeration & Biological Treatment",
            "priority": prio,
            "detail": f"DO at {do:.1f} mg/L (norm > 5) with BOD at {bod:.1f} mg/L (norm < 3) — install cascade or diffused aeration to boost dissolved oxygen and oxidise organic pollutants."
        })

    if ph < 6.5 or ph > 8.5:
        prio = "Critical" if ph < 6.0 or ph > 9.0 else "Recommended"
        action = "dose lime or soda ash" if ph < 6.5 else "dose carbon dioxide or food-grade dilute acid"
        recs.append({
            "title": "pH Neutralization",
            "priority": prio,
            "detail": f"pH is {ph:.1f} (acceptable 6.5–8.5) — {action} to stabilize water balance and protect downstream piping."
        })

    if fc > 50 or tc > 500:
        prio = "Critical" if fc > 500 or tc > 2500 else "Recommended"
        recs.append({
            "title": "Disinfection / Chlorination",
            "priority": prio,
            "detail": f"Fecal coliform {int(fc):,} MPN/100mL, Total coliform {int(tc):,} MPN/100mL — apply 0.2–0.5 mg/L free chlorine residual or UV disinfection to eliminate microbial pathogens."
        })

    if cond > 800 or bod > 5:
        prio = "Critical" if cond > 1500 else "Recommended"
        recs.append({
            "title": "Filtration & TDS Reduction",
            "priority": prio,
            "detail": f"Conductivity {int(cond):,} µS/cm indicates elevated dissolved solids — implement multimedia filtration, and consider reverse osmosis/nanofiltration for drinking compliance."
        })

    if nitrate > 5.0:
        prio = "Critical" if nitrate > 10.0 else "Recommended"
        recs.append({
            "title": "Nitrate Removal Treatment",
            "priority": prio,
            "detail": f"Nitrate+Nitrite at {nitrate:.1f} mg/L — implement ion exchange or biological denitrification to safeguard against methemoglobinemia."
        })

    if not recs:
        recs.append({
            "title": "Standard Monitoring",
            "priority": "Optional",
            "detail": "All eight monitored parameters conform to CPCB Class A/B water quality standards. Maintain routine telemetry."
        })
    return recs

def compute_shap_explanations(params: Dict[str, float]) -> List[Dict[str, Any]]:
    shap_contributions = []
    for spec in PARAMETER_SPECS:
        key = spec["key"]
        val = params.get(key, 0.0)
        ideal_low, ideal_high = spec["ideal"]
        acc_low, acc_high = spec["acceptable"]
        weight = WEIGHTS.get(key, 1.0)

        if ideal_low <= val <= ideal_high:
            score = 1.0
        elif acc_low <= val <= acc_high:
            score = 0.65
        else:
            dist = (acc_low - val) / max(acc_low, 1) if val < acc_low else (val - acc_high) / max(acc_high, 1)
            score = max(0.0, 0.45 - min(dist, 1.0) * 0.45)

        contribution = round((score - 0.7) * weight / 1.6, 3)
        shap_contributions.append({
            "feature": spec["label"],
            "contribution": float(contribution)
        })
    shap_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    return shap_contributions

def calculate_wqi(params: Dict[str, float]) -> int:
    score = 100.0
    # Penalty-based calculation from WHO/CPCB weighting
    do = params.get("dissolvedOxygen", 7.0)
    if do < 6.0:
        score -= min(35.0, (6.0 - do) * 8.0)
    bod = params.get("bod", 2.0)
    if bod > 2.0:
        score -= min(30.0, (bod - 2.0) * 5.0)
    ph = params.get("ph", 7.0)
    if ph < 6.5:
        score -= min(25.0, (6.5 - ph) * 15.0)
    elif ph > 8.5:
        score -= min(25.0, (ph - 8.5) * 15.0)
    fc = params.get("fecalColiform", 0.0)
    if fc > 50:
        score -= min(25.0, np.log10(max(1.0, fc / 50)) * 12.0)
    cond = params.get("conductivity", 400.0)
    if cond > 800:
        score -= min(15.0, ((cond - 800) / 700) * 10.0)
    nit = params.get("nitrate", 2.0)
    if nit > 5.0:
        score -= min(15.0, (nit - 5.0) * 2.0)
    return int(max(15, min(98, round(score))))

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "models": ["XGBoost", "Random Forest", "Decision Tree", "Logistic Regression"],
        "dataset": "CPCB India water_dataX.csv",
        "loaded": True
    }

@app.post("/predict")
def predict_water_quality(item: WaterParameters):
    # Vector matching features_list: ['Temperature', 'DO', 'pH', 'Conductivity', 'BOD', 'Nitrate_Nitrite', 'Fecal_Coliform', 'Total_Coliform']
    raw_sample = pd.DataFrame([[
        item.temperature,
        item.dissolvedOxygen,
        item.ph,
        item.conductivity,
        item.bod,
        item.nitrate,
        item.fecalColiform,
        item.totalColiform
    ]], columns=features_list)

    sample_imp = imputer.transform(raw_sample)

    # 1. XGBoost
    xgb_enc = int(xgb_model.predict(sample_imp)[0])
    xgb_pred_class = str(label_encoder.inverse_transform([xgb_enc])[0])
    xgb_probs_raw = xgb_model.predict_proba(sample_imp)[0]
    xgb_probs = {
        cls_name: round(float(xgb_probs_raw[i]), 3)
        for i, cls_name in enumerate(label_encoder.classes_)
    }
    xgb_conf = xgb_probs[xgb_pred_class]

    # 2. Random Forest
    rf_pred_class = str(rf_model.predict(sample_imp)[0])
    rf_probs_raw = rf_model.predict_proba(sample_imp)[0]
    rf_probs = {
        cls_name: round(float(rf_probs_raw[i]), 3)
        for i, cls_name in enumerate(rf_model.classes_)
    }
    rf_conf = rf_probs[rf_pred_class]

    # 3. Decision Tree
    dt_pred_class = str(dt_model.predict(sample_imp)[0])
    dt_probs_raw = dt_model.predict_proba(sample_imp)[0]
    dt_probs = {
        cls_name: round(float(dt_probs_raw[i]), 3)
        for i, cls_name in enumerate(dt_model.classes_)
    }
    dt_conf = dt_probs[dt_pred_class]

    # 4. Logistic Regression
    lr_pred_class = str(lr_pipeline.predict(sample_imp)[0])
    lr_probs_raw = lr_pipeline.predict_proba(sample_imp)[0]
    lr_probs = {
        cls_name: round(float(lr_probs_raw[i]), 3)
        for i, cls_name in enumerate(lr_pipeline.classes_)
    }
    lr_conf = lr_probs[lr_pred_class]

    # Ensemble: Weighted combination of XGBoost (60%) and Random Forest (40%)
    ensemble_probs = {}
    for c in ["Good", "Moderate", "Poor"]:
        prob = 0.6 * xgb_probs.get(c, 0.0) + 0.4 * rf_probs.get(c, 0.0)
        ensemble_probs[c] = round(prob, 3)

    classification = max(ensemble_probs, key=ensemble_probs.get)
    confidence = ensemble_probs[classification]

    params_dict = item.model_dump()
    parameter_health = evaluate_parameter_health(params_dict)
    recommendations = generate_recommendations(params_dict)
    shap_data = compute_shap_explanations(params_dict)
    wqi_score = calculate_wqi(params_dict)

    models_output = [
        {
            "model": "XGBoost",
            "prediction": xgb_pred_class,
            "confidence": xgb_conf,
            "probabilities": xgb_probs
        },
        {
            "model": "Random Forest",
            "prediction": rf_pred_class,
            "confidence": rf_conf,
            "probabilities": rf_probs
        },
        {
            "model": "Decision Tree",
            "prediction": dt_pred_class,
            "confidence": dt_conf,
            "probabilities": dt_probs
        },
        {
            "model": "Logistic Regression",
            "prediction": lr_pred_class,
            "confidence": lr_conf,
            "probabilities": lr_probs
        },
    ]

    return {
        "classification": classification,
        "confidence": confidence,
        "probabilities": ensemble_probs,
        "models": models_output,
        "parameterHealth": parameter_health,
        "recommendations": recommendations,
        "shap": shap_data,
        "wqi": wqi_score
    }

@app.post("/explain")
def explain_parameters(item: WaterParameters):
    params_dict = item.model_dump()
    return compute_shap_explanations(params_dict)

@app.get("/models")
def get_model_metrics():
    return cached_metrics

@app.get("/water-sources")
def get_water_sources():
    return cached_sources

@app.get("/history")
def get_history():
    return csv_bundle.get("history", [])

@app.get("/overview")
def get_overview():
    return csv_bundle.get("overview", {})

@app.get("/feature-importance")
def get_feature_importance():
    return csv_bundle.get("featureImportance", [])

@app.get("/potability")
def get_potability():
    return csv_bundle.get("potability", {})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
