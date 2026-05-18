"""
OUTSURANCE — XGBoost Model Trainer
Trains a multi-class risk classifier: Low / Medium / High / Critical

Run this ONCE before starting the backend:
  cd backend
  python -m ml.train_model
"""

import json
import warnings
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib
import shap
from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score, f1_score
)
from sklearn.utils.class_weight import compute_sample_weight

warnings.filterwarnings('ignore')

BASE = Path(__file__).parent
DATA_PATH = BASE / "training_data.csv"
MODEL_PATH = BASE / "risk_model.json"
ENCODER_PATH = BASE / "label_encoder.pkl"
SHAP_PATH = BASE / "shap_explainer.pkl"
METRICS_PATH = BASE / "model_metrics.json"

FEATURES = [
    'age', 'bmi', 'hba1c', 'bp_systolic',
    'smoker', 'has_diabetes', 'has_hypertension',
    'chronic_count', 'bmi_age_interaction', 'metabolic_risk_score',
]
TARGET = 'risk_tier'

# ─── 1. Load Data ─────────────────────────────────────────────────────────────
def load_data():
    if not DATA_PATH.exists():
        print("⚙️  Dataset not found — generating now...")
        from ml.generate_dataset import generate_synthetic, try_merge_real_datasets
        df = generate_synthetic(20000)
        df = try_merge_real_datasets(df)
        df.to_csv(DATA_PATH, index=False)
        print(f"   ✅ Generated {len(df):,} rows")
    else:
        df = pd.read_csv(DATA_PATH)
        print(f"✅ Loaded dataset: {len(df):,} rows")

    print("\n   Class distribution:")
    print(df[TARGET].value_counts().to_string())
    return df


# ─── 2. Prepare Features ──────────────────────────────────────────────────────
def prepare_features(df):
    # Fill any missing engineered columns
    if 'bmi_age_interaction' not in df.columns:
        df['bmi_age_interaction'] = df['bmi'] * df['age'] / 100
    if 'metabolic_risk_score' not in df.columns:
        df['metabolic_risk_score'] = (df['hba1c'] - 5.0) * df['bmi'] / 10

    X = df[FEATURES].copy().astype(float)
    y = df[TARGET].copy()

    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    print(f"\n   Label mapping: {dict(zip(le.classes_, le.transform(le.classes_)))}")

    return X, y_enc, le


# ─── 3. Train XGBoost ────────────────────────────────────────────────────────
def train_xgboost(X_train, y_train, n_classes):
    # Compute sample weights to handle class imbalance
    sample_weights = compute_sample_weight('balanced', y_train)

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        num_class=n_classes,
        objective='multi:softprob',
        eval_metric='mlogloss',
        use_label_encoder=False,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train, y_train,
        sample_weight=sample_weights,
        verbose=False,
    )
    return model


# ─── 4. Evaluate ─────────────────────────────────────────────────────────────
def evaluate(model, X_test, y_test, le):
    y_pred = model.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    f1_weighted = f1_score(y_test, y_pred, average='weighted')

    print(f"\n{'='*50}")
    print(f"  OUTSURANCE ML MODEL — EVALUATION REPORT")
    print(f"{'='*50}")
    print(f"  Accuracy:        {acc:.4f}  ({acc*100:.1f}%)")
    print(f"  Weighted F1:     {f1_weighted:.4f}")
    print(f"\n  Per-Class Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    print("  Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    cm_df = pd.DataFrame(cm, index=le.classes_, columns=le.classes_)
    print(cm_df.to_string())

    print(f"\n  Feature Importances (top 10):")
    fi = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
    for feat, imp in fi.head(10).items():
        bar = '█' * int(imp * 100)
        print(f"    {feat:<30} {imp:.4f}  {bar}")

    return {
        "accuracy": round(float(acc), 4),
        "weighted_f1": round(float(f1_weighted), 4),
        "per_class_f1": {
            cls: round(float(f1_score(y_test, y_pred, labels=[i], average='micro')), 4)
            for i, cls in enumerate(le.classes_)
        },
        "feature_importances": {k: round(float(v), 4) for k, v in fi.items()},
    }


# ─── 5. SHAP Explainer ───────────────────────────────────────────────────────
def build_shap_explainer(model, X_test):
    print("\n  Building SHAP Explainer (auto mode for XGBoost 3.x)...")
    try:
        # Try modern shap.Explainer (works with XGBoost 3.x)
        explainer = shap.Explainer(model, X_test)
        sample_shap = explainer(X_test.head(5))
        print(f"   SHAP ready — values shape: {sample_shap.values.shape}")
        return explainer
    except Exception as e1:
        print(f"   shap.Explainer failed ({e1}), trying TreeExplainer...")
        try:
            explainer = shap.TreeExplainer(model)
            _ = explainer.shap_values(X_test.head(2))
            print("   SHAP TreeExplainer ready")
            return explainer
        except Exception as e2:
            print(f"   SHAP unavailable ({e2}) — continuing without it")
            return None


# ─── 6. Cross Validation ────────────────────────────────────────────────────
def cross_validate(model, X, y):
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=skf, scoring='f1_weighted', n_jobs=-1)
    print(f"\n  5-Fold CV F1 scores: {cv_scores.round(3)}")
    print(f"  Mean: {cv_scores.mean():.4f}  Std: {cv_scores.std():.4f}")
    return cv_scores.tolist()


# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  OUTSURANCE — ML Training Pipeline")
    print("=" * 50)

    # 1. Load
    df = load_data()
    X, y_enc, le = prepare_features(df)

    # 2. Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, stratify=y_enc, random_state=42
    )
    print(f"\n  Train: {len(X_train):,} | Test: {len(X_test):,}")

    # 3. Train
    print("\n⚙️  Training XGBoost classifier...")
    n_classes = len(le.classes_)
    model = train_xgboost(X_train, y_train, n_classes)
    print("   ✅ Training complete")

    # 4. Evaluate
    metrics = evaluate(model, X_test, y_test, le)

    # 5. Cross-validate
    cv_scores = cross_validate(model, X, y_enc)
    metrics['cv_f1_scores'] = cv_scores
    metrics['cv_f1_mean'] = round(float(np.mean(cv_scores)), 4)

    # 6. SHAP
    shap_explainer = build_shap_explainer(model, X_test)

    # 7. Save artefacts
    print("\nSaving model artefacts...")
    model.save_model(str(MODEL_PATH))
    joblib.dump(le, ENCODER_PATH)
    if shap_explainer is not None:
        joblib.dump(shap_explainer, SHAP_PATH)
    else:
        print("   SHAP not saved (unavailable on this XGBoost version)")

    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=2)

    print(f"   ✅ Model  → {MODEL_PATH}")
    print(f"   ✅ Encoder → {ENCODER_PATH}")
    print(f"   ✅ SHAP    → {SHAP_PATH}")
    print(f"   ✅ Metrics → {METRICS_PATH}")
    print("\n🚀 Run the backend: uvicorn app.main:app --reload --port 8000")
