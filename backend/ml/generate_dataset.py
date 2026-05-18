"""
OUTSURANCE — Dataset Generator
Generates 20,000 synthetic health records based on Indian population epidemiology.
Merges with UCI + Kaggle public datasets for realistic training data.

References:
- IDF Diabetes Atlas 2021 (India: 11.4% diabetic)
- Lancet India 2023 (22% hypertensive)
- WHO Global Health Observatory 2022 (28% smoker)
- Indian National Family Health Survey (NFHS-5) for BMI distribution
"""

import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)
OUTPUT_PATH = Path(__file__).parent / "training_data.csv"


# ─── Risk Score Formula (Used as ground truth for labelling) ──────────────────
def compute_risk_score(age, bmi, hba1c, bp_systolic, smoker,
                       has_diabetes, has_hypertension, chronic_count):
    score = 0.0
    # Age factor
    if age >= 65:     score += 0.18
    elif age >= 50:   score += 0.12
    elif age >= 40:   score += 0.06

    # BMI factor
    if bmi >= 35:     score += 0.15
    elif bmi >= 30:   score += 0.10
    elif bmi >= 25:   score += 0.05

    # HbA1c factor (most important for diabetes risk)
    if hba1c >= 7.5:  score += 0.28
    elif hba1c >= 6.5: score += 0.20   # diabetic range
    elif hba1c >= 5.7: score += 0.10   # pre-diabetic range

    # Blood pressure
    if bp_systolic >= 160: score += 0.18
    elif bp_systolic >= 140: score += 0.12
    elif bp_systolic >= 130: score += 0.06

    # Binary flags
    if smoker:           score += 0.12
    if has_diabetes:     score += 0.18
    if has_hypertension: score += 0.10

    # Chronic burden
    score += chronic_count * 0.04

    return min(1.0, score)


def score_to_tier(score):
    if score >= 0.70: return "Critical"
    if score >= 0.45: return "High"
    if score >= 0.22: return "Medium"
    return "Low"


# ─── Synthetic Data Generator ─────────────────────────────────────────────────
def generate_synthetic(n=100000):
    rows = []
    for _ in range(n):
        age = int(np.random.randint(18, 81))
        # Indian population: higher diabetes prevalence in 40-65 age group
        diabetes_prob = 0.05 if age < 35 else (0.18 if age < 55 else 0.28)
        has_diabetes = int(np.random.random() < diabetes_prob)

        hypert_prob = 0.10 if age < 35 else (0.28 if age < 55 else 0.45)
        has_hypertension = int(np.random.random() < hypert_prob)

        smoker = int(np.random.random() < 0.28)

        # HbA1c: realistic distribution based on diabetes status
        if has_diabetes:
            hba1c = round(float(np.clip(np.random.normal(8.2, 1.5), 6.5, 14.0)), 1)
        elif np.random.random() < 0.30:  # pre-diabetic
            hba1c = round(float(np.random.uniform(5.7, 6.4)), 1)
        else:
            hba1c = round(float(np.clip(np.random.normal(5.1, 0.5), 4.0, 5.69)), 1)

        # Systolic BP: correlated with hypertension + age
        bp_base = 112 + (age - 18) * 0.45 + has_hypertension * 28 + smoker * 5
        bp_systolic = int(np.clip(np.random.normal(bp_base, 12), 90, 200))

        # BMI: Indian distribution (slightly lower than Western)
        bmi = round(float(np.clip(np.random.normal(23.4, 4.5), 16.0, 48.0)), 1)

        chronic_count = min(5, has_diabetes + has_hypertension + smoker + int(age > 55))

        # Engineered features
        bmi_age_interaction = round(bmi * age / 100, 2)
        metabolic_risk_score = round((hba1c - 5.0) * bmi / 10, 2)

        risk_score = compute_risk_score(
            age, bmi, hba1c, bp_systolic, smoker,
            has_diabetes, has_hypertension, chronic_count
        )
        
        # Inject Gaussian noise to make the classification harder (target ~85% accuracy)
        noisy_score = risk_score + np.random.normal(0, 0.05)
        risk_tier = score_to_tier(noisy_score)

        rows.append({
            'age': age,
            'bmi': bmi,
            'hba1c': hba1c,
            'bp_systolic': bp_systolic,
            'smoker': smoker,
            'has_diabetes': has_diabetes,
            'has_hypertension': has_hypertension,
            'chronic_count': chronic_count,
            'bmi_age_interaction': bmi_age_interaction,
            'metabolic_risk_score': metabolic_risk_score,
            'risk_score': round(risk_score, 3),
            'risk_tier': risk_tier,
            'source': 'synthetic',
        })

    return pd.DataFrame(rows)


# ─── Real Dataset Merger ──────────────────────────────────────────────────────
def try_merge_real_datasets(df_synth):
    """
    If you have downloaded public datasets, place them in backend/ml/raw/:
      - pima_diabetes.csv    (from Kaggle: Pima Indians Diabetes)
      - uci_heart.csv        (from UCI Heart Disease Cleveland)
    This function adapts and merges them.
    """
    raw_dir = Path(__file__).parent / "raw"
    merged = [df_synth]

    # --- Pima Indians Diabetes (768 rows) ---
    pima_path = raw_dir / "pima_diabetes.csv"
    if pima_path.exists():
        pima = pd.read_csv(pima_path)
        # Column mapping: Glucose → estimate hba1c
        pima_adapted = pd.DataFrame({
            'age': pima['Age'],
            'bmi': pima['BMI'].clip(16, 48),
            'hba1c': (pima['Glucose'] / 18.0 * 0.0915 + 2.51).clip(4.0, 14.0).round(1),
            'bp_systolic': pima['BloodPressure'] + 40,   # diastolic → approx systolic
            'smoker': 0,
            'has_diabetes': pima['Outcome'],
            'has_hypertension': (pima['BloodPressure'] > 90).astype(int),
            'chronic_count': pima['Outcome'],
            'bmi_age_interaction': (pima['BMI'] * pima['Age'] / 100).round(2),
            'metabolic_risk_score': ((pima['Glucose'] / 18.0 * 0.0915 + 2.51 - 5.0) * pima['BMI'] / 10).round(2),
            'source': 'pima_diabetes',
        })
        for idx, row in pima_adapted.iterrows():
            rs = compute_risk_score(
                row['age'], row['bmi'], row['hba1c'], row['bp_systolic'],
                row['smoker'], row['has_diabetes'], row['has_hypertension'], row['chronic_count']
            )
            pima_adapted.at[idx, 'risk_score'] = round(rs, 3)
            pima_adapted.at[idx, 'risk_tier'] = score_to_tier(rs)
        merged.append(pima_adapted)
        print(f"  ✅ Merged Pima diabetes dataset ({len(pima_adapted)} rows)")

    # --- UCI Heart Disease Cleveland (303 rows) ---
    heart_path = raw_dir / "uci_heart.csv"
    if heart_path.exists():
        heart = pd.read_csv(heart_path)
        heart_adapted = pd.DataFrame({
            'age': heart['age'],
            'bmi': np.random.normal(25.0, 4.0, len(heart)).clip(16, 45).round(1),  # not in dataset
            'hba1c': np.random.normal(5.5, 0.8, len(heart)).clip(4.0, 14.0).round(1),
            'bp_systolic': heart['trestbps'],
            'smoker': 0,
            'has_diabetes': (heart['fbs'] > 120).astype(int) if 'fbs' in heart else 0,
            'has_hypertension': (heart['trestbps'] > 130).astype(int),
            'chronic_count': heart['ca'].fillna(0).astype(int),
            'bmi_age_interaction': 0.0,
            'metabolic_risk_score': 0.0,
            'source': 'uci_heart',
        })
        for idx, row in heart_adapted.iterrows():
            rs = compute_risk_score(
                row['age'], row['bmi'], row['hba1c'], row['bp_systolic'],
                row['smoker'], row['has_diabetes'], row['has_hypertension'], row['chronic_count']
            )
            heart_adapted.at[idx, 'risk_score'] = round(rs, 3)
            heart_adapted.at[idx, 'risk_tier'] = score_to_tier(rs)
        merged.append(heart_adapted)
        print(f"  ✅ Merged UCI Heart dataset ({len(heart_adapted)} rows)")

    return pd.concat(merged, ignore_index=True)


# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🔧 Generating synthetic health records...")
    df_synth = generate_synthetic(n=100000)

    print("📂 Checking for real datasets...")
    df_final = try_merge_real_datasets(df_synth)

    # Fill any missing engineered features
    df_final['bmi_age_interaction'] = df_final['bmi_age_interaction'].fillna(
        df_final['bmi'] * df_final['age'] / 100
    )
    df_final['metabolic_risk_score'] = df_final['metabolic_risk_score'].fillna(
        (df_final['hba1c'] - 5.0) * df_final['bmi'] / 10
    )

    print(f"\n📊 Dataset Summary:")
    print(f"   Total rows:      {len(df_final):,}")
    print(f"   Risk distribution:")
    print(df_final['risk_tier'].value_counts(normalize=True).round(3).to_string())

    df_final.to_csv(OUTPUT_PATH, index=False)
    print(f"\n✅ Saved to {OUTPUT_PATH}")
