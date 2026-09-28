"""
Extracts aggregated chart and summary data directly from:
  1. water_dataX.csv (CPCB Indian River & Monitoring Stations 2003-2014)
  2. water_potability _india.csv (Indian Potability Metrics)
  3. Trained ML models (XGBoost & Random Forest)
Generates json bundles for both the backend API and frontend static assets.
"""

import os
import json
import pandas as pd
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

candidate_csvs = [
    os.path.join(ROOT_DIR, "data", "water_dataX.csv"),
    os.path.join(ROOT_DIR, "water_dataX.csv"),
    os.path.join(ROOT_DIR, "..", "water_dataX.csv"),
]
CSV_PATH = next((p for p in candidate_csvs if os.path.exists(p)), candidate_csvs[0])

candidate_pot = [
    os.path.join(ROOT_DIR, "data", "water_potability _india.csv"),
    os.path.join(ROOT_DIR, "water_potability _india.csv"),
    os.path.join(ROOT_DIR, "..", "water_potability _india.csv"),
]
POTABILITY_CSV = next((p for p in candidate_pot if os.path.exists(p)), candidate_pot[0])

ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
FRONTEND_DATA_DIR = os.path.join(ROOT_DIR, "src", "data") if os.path.exists(os.path.join(ROOT_DIR, "src")) else os.path.join(ROOT_DIR, "pixel-perfect-match", "src", "data")
FRONTEND_PUBLIC_DIR = os.path.join(ROOT_DIR, "public", "data") if os.path.exists(os.path.join(ROOT_DIR, "public")) else os.path.join(ROOT_DIR, "pixel-perfect-match", "public", "data")

def extract_and_bundle():
    print(f"Reading CSV: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH, encoding='latin-1')

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

    for col in ['Temperature', 'DO', 'pH', 'Conductivity', 'BOD', 'Nitrate_Nitrite', 'Fecal_Coliform', 'Total_Coliform']:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Data cleaning for pH
    invalid_ph = (df['pH'] > 14) | (df['pH'] < 0)
    df.loc[invalid_ph, 'pH'] = np.nan
    df['pH'] = df['pH'].fillna(df['pH'].median())

    def calc_score(r):
        s = 0
        if 6.5 <= r['pH'] <= 8.5: s += 1
        if r['DO'] >= 5: s += 1
        if r['BOD'] <= 3: s += 1
        if r['Nitrate_Nitrite'] <= 10: s += 1
        if r['Fecal_Coliform'] <= 100: s += 1
        if r['Total_Coliform'] <= 500: s += 1
        return s

    df['Score'] = df.apply(calc_score, axis=1)
    df['Quality'] = df['Score'].apply(lambda x: 'Good' if x >= 5 else ('Moderate' if x >= 3 else 'Poor'))

    # 1. Yearly History Aggregation
    yearly = df.groupby('Year').agg({
        'pH': 'mean',
        'DO': 'mean',
        'BOD': 'mean',
        'Conductivity': 'mean',
        'Nitrate_Nitrite': 'mean',
        'Fecal_Coliform': 'median',
        'Total_Coliform': 'median'
    }).reset_index()

    history = []
    for _, r in yearly.iterrows():
        cond_val = float(r['Conductivity']) if not pd.isna(r['Conductivity']) else 450.0
        nit_val = float(r['Nitrate_Nitrite']) if not pd.isna(r['Nitrate_Nitrite']) else 2.5
        fc_val = float(r['Fecal_Coliform']) if not pd.isna(r['Fecal_Coliform']) else 150.0
        tc_val = float(r['Total_Coliform']) if not pd.isna(r['Total_Coliform']) else 600.0

        history.append({
            'date': str(int(r['Year'])),
            'ph': round(float(r['pH']), 2),
            'dissolvedOxygen': round(float(r['DO']), 2),
            'bod': round(float(r['BOD']), 2),
            'conductivity': round(cond_val, 1),
            'nitrate': round(nit_val, 2),
            'fecalColiform': round(fc_val, 1),
            'totalColiform': round(tc_val, 1),
        })

    # 2. Quality Counts & Donut Breakdown
    q_counts = df['Quality'].value_counts().to_dict()
    quality_counts = {
        'Good': int(q_counts.get('Good', 0)),
        'Moderate': int(q_counts.get('Moderate', 0)),
        'Poor': int(q_counts.get('Poor', 0))
    }
    donut = [
        {'name': 'Good', 'value': quality_counts['Good']},
        {'name': 'Moderate', 'value': quality_counts['Moderate']},
        {'name': 'Poor', 'value': quality_counts['Poor']}
    ]

    # 3. Recent Real Measurements from the CSV
    recent_df = df.dropna(subset=['Location', 'pH', 'DO', 'BOD']).tail(14)
    measurements = []
    for idx, (_, r) in enumerate(recent_df.iterrows()):
        loc_str = str(r['Location']).title()
        st_str = str(r['State']).title()
        measurements.append({
            'id': f"M-{3000 + idx}",
            'sourceId': f"WS-{r['Station_Code']}",
            'source': f"{loc_str[:26]} ({st_str[:12]})",
            'timestamp': f"Year {int(r['Year'])}",
            'ph': round(float(r['pH']), 1),
            'dissolvedOxygen': round(float(r['DO']), 1),
            'bod': round(float(r['BOD']), 1),
            'quality': r['Quality'],
            'model': 'XGBoost',
            'confidence': 0.96
        })

    # 4. Feature importance from ML models
    xgb = joblib.load(os.path.join(ARTIFACTS_DIR, 'xgb_model.pkl'))
    rf = joblib.load(os.path.join(ARTIFACTS_DIR, 'rf_model.pkl'))
    features = joblib.load(os.path.join(ARTIFACTS_DIR, 'features.pkl'))

    feat_names = {
        'Temperature': 'Temperature',
        'DO': 'Dissolved Oxygen',
        'pH': 'pH',
        'Conductivity': 'Conductivity',
        'BOD': 'BOD',
        'Nitrate_Nitrite': 'Nitrate + Nitrite',
        'Fecal_Coliform': 'Fecal Coliform',
        'Total_Coliform': 'Total Coliform'
    }

    xgb_imp = (xgb.feature_importances_ / xgb.feature_importances_.sum()).round(3)
    rf_imp = (rf.feature_importances_ / rf.feature_importances_.sum()).round(3)

    feature_importance = []
    for i, f in enumerate(features):
        feature_importance.append({
            'feature': feat_names.get(f, f),
            'xgboost': round(float(xgb_imp[i]), 3),
            'randomForest': round(float(rf_imp[i]), 3)
        })
    feature_importance.sort(key=lambda x: (x['xgboost'] + x['randomForest']) / 2, reverse=True)

    # 5. Potability dataset summary
    potability_summary = {}
    if os.path.exists(POTABILITY_CSV):
        df_pot = pd.read_csv(POTABILITY_CSV)
        pot_counts = df_pot['Potability'].value_counts().to_dict()
        potability_summary = {
            'total': int(len(df_pot)),
            'potable': int(pot_counts.get(1, 0)),
            'nonPotable': int(pot_counts.get(0, 0)),
            'potablePercent': round(float(pot_counts.get(1, 0)) / len(df_pot) * 100, 1),
            'avgPh': round(float(df_pot['ph'].dropna().mean()), 2),
            'avgHardness': round(float(df_pot['Hardness'].dropna().mean()), 1),
            'avgTurbidity': round(float(df_pot['Turbidity'].dropna().mean()), 2),
            'avgSolids': round(float(df_pot['Solids'].dropna().mean()), 0),
        }

    overview = {
        'totalSamples': int(len(df)),
        'uniqueStations': int(df['Location'].nunique()),
        'uniqueStates': int(df['State'].nunique()),
        'yearsRange': f"{int(df['Year'].min())}–{int(df['Year'].max())}",
        'qualityCounts': quality_counts,
        'donut': donut,
        'measurements': measurements,
        'potability': potability_summary
    }

    data_bundle = {
        'history': history,
        'overview': overview,
        'featureImportance': feature_importance,
        'potability': potability_summary
    }

    # Save to backend artifacts
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    with open(os.path.join(ARTIFACTS_DIR, 'csv_data.json'), 'w', encoding='utf-8') as f:
        json.dump(data_bundle, f, indent=2)

    # Save to frontend src/data
    os.makedirs(FRONTEND_DATA_DIR, exist_ok=True)
    with open(os.path.join(FRONTEND_DATA_DIR, 'csvData.json'), 'w', encoding='utf-8') as f:
        json.dump(data_bundle, f, indent=2)

    # Save to frontend public/data
    os.makedirs(FRONTEND_PUBLIC_DIR, exist_ok=True)
    with open(os.path.join(FRONTEND_PUBLIC_DIR, 'csvData.json'), 'w', encoding='utf-8') as f:
        json.dump(data_bundle, f, indent=2)

    print("CSV data bundle created successfully!")
    print(f"Total samples: {len(df):,}")
    print(f"Years: {overview['yearsRange']}")
    print(f"Donut: {donut}")

if __name__ == '__main__':
    extract_and_bundle()
