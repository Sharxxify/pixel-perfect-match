"""
Model training and artifact generation pipeline for AquaSense.
Trained on CPCB Water Quality data from waterquality (1).ipynb & waterquality.ipynb.
"""

import os
import json
import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
candidate_paths = [
    os.path.join(ROOT_DIR, "data", "water_dataX.csv"),
    os.path.join(ROOT_DIR, "water_dataX.csv"),
    os.path.join(ROOT_DIR, "..", "water_dataX.csv"),
]
CSV_PATH = next((p for p in candidate_paths if os.path.exists(p)), candidate_paths[0])
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

FEATURES = [
    'Temperature',
    'DO',
    'pH',
    'Conductivity',
    'BOD',
    'Nitrate_Nitrite',
    'Fecal_Coliform',
    'Total_Coliform'
]

CLASSES = ['Good', 'Moderate', 'Poor']

def calculate_quality_score(row):
    score = 0
    # pH ideal range [6.5, 8.5]
    if 6.5 <= row['pH'] <= 8.5:
        score += 1
    # Dissolved Oxygen >= 5 mg/L
    if row['DO'] >= 5:
        score += 1
    # BOD <= 3 mg/L
    if row['BOD'] <= 3:
        score += 1
    # Nitrate + Nitrite <= 10 mg/L
    if row['Nitrate_Nitrite'] <= 10:
        score += 1
    # Fecal Coliform <= 100 MPN/100ml
    if row['Fecal_Coliform'] <= 100:
        score += 1
    # Total Coliform <= 500 MPN/100ml
    if row['Total_Coliform'] <= 500:
        score += 1
    return score

def classify_water(score):
    if score >= 5:
        return 'Good'
    elif score >= 3:
        return 'Moderate'
    else:
        return 'Poor'

def train_and_export():
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    print(f"Loading dataset from: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH, encoding='latin-1')
    total_samples = len(df)
    print(f"Raw dataset shape: {df.shape}")

    # Column mapping as defined in notebook cell 11
    rename_map = {
        'STATION CODE': 'Station_Code',
        'LOCATIONS': 'Location',
        'STATE': 'State',
        'Temp': 'Temperature',
        'D.O. (mg/l)': 'DO',
        'PH': 'pH',
        'B.O.D. (mg/l)': 'BOD',
        'FECAL COLIFORM (MPN/100ml)': 'Fecal_Coliform',
        'TOTAL COLIFORM (MPN/100ml)Mean': 'Total_Coliform',
        'year': 'Year'
    }
    for col in df.columns:
        if 'CONDUCTIVITY' in col.upper():
            rename_map[col] = 'Conductivity'
        elif 'NITRATE' in col.upper():
            rename_map[col] = 'Nitrate_Nitrite'
        elif 'TOTAL COLIFORM' in col.upper() and 'Total_Coliform' not in rename_map.values():
            rename_map[col] = 'Total_Coliform'

    df = df.rename(columns=rename_map)

    # Convert numeric columns
    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Data cleaning: fix impossible pH values (cell 34)
    invalid_ph = (df['pH'] > 14) | (df['pH'] < 0)
    df.loc[invalid_ph, 'pH'] = np.nan

    # Calculate target quality score and water quality classes (cell 35)
    df['Quality_Score'] = df.apply(calculate_quality_score, axis=1)
    df['Water_Quality'] = df['Quality_Score'].apply(classify_water)

    X = df[FEATURES]
    y = df['Water_Quality']

    # Stratified split: 80% train, 20% test (cell 39)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Median imputer (cell 40)
    imputer = SimpleImputer(strategy='median')
    X_train_imp = imputer.fit_transform(X_train)
    X_test_imp = imputer.transform(X_test)

    # Label encoder for XGBoost (cell 42)
    label_encoder = LabelEncoder()
    label_encoder.fit(CLASSES)
    y_train_encoded = label_encoder.transform(y_train)
    y_test_encoded = label_encoder.transform(y_test)

    # 1. XGBoost Classifier (cell 43)
    print("Training XGBoost Classifier...")
    t0 = time.time()
    xgb_model = XGBClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='mlogloss'
    )
    xgb_model.fit(X_train_imp, y_train_encoded)
    xgb_latency = int((time.time() - t0) * 1000 / len(X_test))
    y_pred_xgb_enc = xgb_model.predict(X_test_imp)
    y_pred_xgb = label_encoder.inverse_transform(y_pred_xgb_enc)

    # 2. Random Forest Classifier (cell 45)
    print("Training Random Forest Classifier...")
    t0 = time.time()
    rf_model = RandomForestClassifier(
        n_estimators=200,
        class_weight='balanced',
        random_state=42
    )
    rf_model.fit(X_train_imp, y_train)
    rf_latency = int((time.time() - t0) * 1000 / len(X_test))
    y_pred_rf = rf_model.predict(X_test_imp)

    # 3. Decision Tree Classifier (cell 45)
    print("Training Decision Tree Classifier...")
    t0 = time.time()
    dt_model = DecisionTreeClassifier(
        max_depth=8,
        class_weight='balanced',
        random_state=42
    )
    dt_model.fit(X_train_imp, y_train)
    dt_latency = int((time.time() - t0) * 1000 / len(X_test))
    y_pred_dt = dt_model.predict(X_test_imp)

    # 4. Logistic Regression with StandardScaler Pipeline
    print("Training Logistic Regression...")
    t0 = time.time()
    lr_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42))
    ])
    lr_pipeline.fit(X_train_imp, y_train)
    lr_latency = int((time.time() - t0) * 1000 / len(X_test))
    y_pred_lr = lr_pipeline.predict(X_test_imp)

    # Compute evaluation metrics for all models
    models_dict = {
        "XGBoost": (y_pred_xgb, xgb_latency, xgb_model.feature_importances_),
        "Random Forest": (y_pred_rf, rf_latency, rf_model.feature_importances_),
        "Decision Tree": (y_pred_dt, dt_latency, dt_model.feature_importances_),
        "Logistic Regression": (y_pred_lr, lr_latency, np.abs(lr_pipeline.named_steps['classifier'].coef_).mean(axis=0)),
    }

    metrics_list = []
    for name, (pred, latency, feat_imp) in models_dict.items():
        cm = confusion_matrix(y_test, pred, labels=CLASSES).tolist()
        cr_dict = classification_report(y_test, pred, labels=CLASSES, output_dict=True, zero_division=0)
        class_report = []
        for cls_name in CLASSES:
            sub = cr_dict.get(cls_name, {})
            class_report.append({
                "label": cls_name,
                "precision": round(sub.get("precision", 0.0), 3),
                "recall": round(sub.get("recall", 0.0), 3),
                "f1": round(sub.get("f1-score", 0.0), 3),
                "support": int(sub.get("support", 0))
            })

        feat_imp_norm = (feat_imp / feat_imp.sum()).round(3) if feat_imp.sum() > 0 else feat_imp
        feat_list = [
            {"feature": f, "importance": float(feat_imp_norm[i])}
            for i, f in enumerate(FEATURES)
        ]

        metrics_list.append({
            "name": name,
            "accuracy": round(float(accuracy_score(y_test, pred)), 3),
            "precision": round(float(precision_score(y_test, pred, average='weighted', zero_division=0)), 3),
            "recall": round(float(recall_score(y_test, pred, average='weighted', zero_division=0)), 3),
            "f1": round(float(f1_score(y_test, pred, average='weighted', zero_division=0)), 3),
            "trainedOn": f"{total_samples:,} samples · CPCB India Water Quality",
            "latencyMs": max(1, latency),
            "confusion": cm,
            "classReport": class_report,
            "featureImportance": sorted(feat_list, key=lambda x: x["importance"], reverse=True)
        })

    # Extract distinct water sources from dataset
    sources = []
    location_groups = df.groupby(['Location', 'State'])[FEATURES].median().reset_index()
    # Filter valid locations
    valid_locations = location_groups.dropna(subset=['Location']).head(16)
    
    # State approximate coordinates for map visualization
    state_coords = {
        'GOA': (15.2993, 74.1240),
        'DAMAN & DIU': (20.4283, 72.8397),
        'MAHARASHTRA': (19.7515, 75.7139),
        'KARNATAKA': (15.3173, 75.7139),
        'TAMILNADU': (11.1271, 78.6569),
        'KERALA': (10.8505, 76.2711),
        'ANDHRA PRADESH': (15.9129, 79.7400),
        'TELANGANA': (18.1124, 79.0193),
        'ODISHA': (20.9517, 85.0985),
        'GUJARAT': (22.2587, 71.1924),
    }

    for idx, row in valid_locations.iterrows():
        st_clean = str(row['State']).strip().upper()
        base_lat, base_lon = state_coords.get(st_clean, (17.3850 + (idx % 5) * 0.5, 78.4867 + (idx % 4) * 0.5))
        lat = round(base_lat + ((idx * 17) % 100 - 50) * 0.01, 4)
        lon = round(base_lon + ((idx * 23) % 100 - 50) * 0.01, 4)
        
        sample_vals = [
            float(row[f]) if not pd.isna(row[f]) else float(df[f].median())
            for f in FEATURES
        ]
        sample_imp = imputer.transform([sample_vals])
        pred_enc = xgb_model.predict(sample_imp)[0]
        q_class = label_encoder.inverse_transform([pred_enc])[0]
        probs = xgb_model.predict_proba(sample_imp)[0]
        conf = float(probs[pred_enc])

        loc_name = str(row['Location']).title()
        src_type = "River"
        if "LAKE" in str(row['Location']).upper() or "SAGAR" in str(row['Location']).upper():
            src_type = "Lake"
        elif "CANAL" in str(row['Location']).upper():
            src_type = "Canal"
        elif "WELL" in str(row['Location']).upper() or "BORE" in str(row['Location']).upper():
            src_type = "Borewell"

        sources.append({
            "id": f"WS-{101 + idx}",
            "name": loc_name[:40],
            "location": f"{st_clean.title()}, IN",
            "type": src_type,
            "quality": q_class,
            "confidence": round(conf, 2),
            "lat": lat,
            "lon": lon,
            "lastUpdated": f"{(idx % 4) + 1} h ago",
            "parameters": {
                "temperature": round(sample_vals[0], 1),
                "dissolvedOxygen": round(sample_vals[1], 1),
                "ph": round(sample_vals[2], 1),
                "conductivity": round(sample_vals[3], 0),
                "bod": round(sample_vals[4], 1),
                "nitrate": round(sample_vals[5], 1),
                "fecalColiform": round(sample_vals[6], 0),
                "totalColiform": round(sample_vals[7], 0)
            }
        })

    # Save artifacts
    print(f"Saving artifacts to: {ARTIFACTS_DIR}")
    joblib.dump(xgb_model, os.path.join(ARTIFACTS_DIR, "xgb_model.pkl"))
    joblib.dump(rf_model, os.path.join(ARTIFACTS_DIR, "rf_model.pkl"))
    joblib.dump(dt_model, os.path.join(ARTIFACTS_DIR, "dt_model.pkl"))
    joblib.dump(lr_pipeline, os.path.join(ARTIFACTS_DIR, "lr_model.pkl"))
    joblib.dump(imputer, os.path.join(ARTIFACTS_DIR, "imputer.pkl"))
    joblib.dump(label_encoder, os.path.join(ARTIFACTS_DIR, "label_encoder.pkl"))
    joblib.dump(FEATURES, os.path.join(ARTIFACTS_DIR, "features.pkl"))

    with open(os.path.join(ARTIFACTS_DIR, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_list, f, indent=2)

    with open(os.path.join(ARTIFACTS_DIR, "sources.json"), "w", encoding="utf-8") as f:
        json.dump(sources, f, indent=2)

    print("All models trained and exported successfully!")
    for m in metrics_list:
        print(f"  {m['name']}: Accuracy = {m['accuracy'] * 100:.1f}%, F1 = {m['f1'] * 100:.1f}%")

if __name__ == "__main__":
    train_and_export()
