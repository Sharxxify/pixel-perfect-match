# AquaSense — AI Water Quality Intelligence System

A full-stack AI-driven water quality monitoring and prediction platform combining machine learning models (XGBoost, Random Forest, Decision Tree, Logistic Regression) trained on Central Pollution Control Board (CPCB) India water telemetry data with a modern interactive dashboard.

---

## Features

- **Predictive Water Quality Classification**: Real-time ensemble classification into `Good`, `Moderate`, and `Poor` quality classes.
- **Machine Learning Models**:
  - **XGBoost Classifier** (97.2% accuracy, 97.2% F1)
  - **Random Forest Classifier** (96.5% accuracy, 96.5% F1)
  - **Decision Tree Classifier** (93.0% accuracy, 93.1% F1)
  - **Logistic Regression** (StandardScaler pipeline)
- **Interactive Parameter Sliders**: 8 water quality parameters with synchronized sliding bars, direct numeric inputs, and ideal safety benchmarks:
  - Temperature, Dissolved Oxygen (DO), pH, Conductivity, BOD, Nitrate + Nitrite, Fecal Coliform, Total Coliform.
- **Explainability & Recommendations**:
  - SHAP feature contribution analysis.
  - Automated regulatory water management and treatment protocols (aeration, pH neutralization, chlorination/UV, filtration, nitrate removal).
  - Water Quality Index (WQI) scoring (0–100).
- **Historical Analysis & Trend Tracking**:
  - 12-year longitudinal sensor trend analysis (2003–2014) across 666 Indian monitoring stations.
  - Indian water potability evaluation across 3,276 water samples.
- **Navigation Shell & System Dashboard**: Responsive sidebar navigation, real-time backend connectivity detection, alert feeds, and telemetry tables.

---

## Project Structure

```
├── backend/                  # FastAPI Python backend & ML services
│   ├── main.py               # REST API endpoints (/predict, /history, /models, etc.)
│   ├── train.py              # ML model training and serialization pipeline
│   ├── generate_data.py      # CSV data extraction and aggregation pipeline
│   ├── requirements.txt      # Python dependencies
│   └── artifacts/            # Serialized models (.pkl), encoders, and metrics
├── data/                     # Source CSV telemetry and potability datasets
│   ├── water_dataX.csv
│   └── water_potability _india.csv
├── notebooks/                # Research & exploratory data analysis notebooks
│   ├── waterquality.ipynb
│   └── waterquality (1).ipynb
├── src/                      # Frontend web application (React, TanStack, Tailwind)
│   ├── components/           # UI components, AppShell sidebar, quality badges
│   ├── routes/               # Dashboard, analysis, historical, models, sources
│   ├── services/             # API client connecting to FastAPI backend
│   └── data/                 # Bundled static data fallbacks
└── public/                   # Static assets, favicon, and datasets
```

---

## Quick Start

### 1. Backend (FastAPI & ML Engine)

```sh
cd backend
pip install -r requirements.txt
python main.py
```
The API server will run at `http://localhost:8000`.

### 2. Frontend (React + Vite)

```sh
npm install
npm run dev
```
Open `http://localhost:8081` (or indicated port) in your browser.

