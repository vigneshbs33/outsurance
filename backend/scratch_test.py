import os
import joblib
import pandas as pd
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(BASE_DIR, 'ml')
model_path = os.path.join(ML_DIR, 'risk_model.json')
encoder_path = os.path.join(ML_DIR, 'label_encoder.pkl')

if os.path.exists(model_path) and os.path.exists(encoder_path):
    model = xgb.XGBClassifier()
    model.load_model(model_path)
    le = joblib.load(encoder_path)
    print("Classes:", le.classes_)
    
    test_row = {
        'age': 32.0,
        'bmi': 26.5,
        'hba1c': 6.2,
        'bp_systolic': 128.0,
        'smoker': 0.0,
        'has_diabetes': 1.0,
        'has_hypertension': 1.0,
        'chronic_count': 0.0,
        'bmi_age_interaction': 8.48,
        'metabolic_risk_score': 3.18
    }
    
    FEATURES = [
        'age', 'bmi', 'hba1c', 'bp_systolic',
        'smoker', 'has_diabetes', 'has_hypertension',
        'chronic_count', 'bmi_age_interaction', 'metabolic_risk_score'
    ]
    
    X = pd.DataFrame([test_row])[FEATURES]
    pred_idx = model.predict(X)[0]
    proba = model.predict_proba(X)[0]
    print("Pred Index:", pred_idx)
    print("Pred Class:", le.inverse_transform([pred_idx])[0])
    print("Probabilities:", proba)
else:
    print("Model or encoder not found")
