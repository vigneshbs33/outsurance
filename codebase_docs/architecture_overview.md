# Outsurance Architecture Overview

Outsurance is an AI-powered smart insurance recommendation platform. It helps users find the best insurance plans by analyzing their health data (including PDF reports) and providing personalized risk assessments and plan reasoning.

## High-Level Architecture

The system follows a classic Client-Server architecture with a specialized Machine Learning layer.

```mermaid
graph TD
    subgraph "Frontend (Next.js 16 / TypeScript)"
        UI[User Interface]
        Auth[Supabase Auth]
        PDF[PDF Parser (pdf.js)]
    end

    subgraph "Backend (FastAPI)"
        API[FastAPI Server]
        Scorer[Plan Scorer]
        JWT[JWT Validator]
    end

    subgraph "ML Layer"
        XGB[XGBoost Risk Model]
        Gemma[Gemma 3 Reasoner]
    end

    subgraph "External"
        Supabase[Supabase DB / Auth]
    end

    UI --> Auth
    UI --> PDF
    UI --> API
    Auth <--> Supabase
    API --> XGB
    API --> Scorer
    API --> Gemma
    Scorer --> API
```

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router) + TypeScript.
- **Styling**: Tailwind CSS v4 + PostCSS.
- **Animation**: GSAP + ScrollTrigger + Framer Motion.
- **Authentication**: Supabase Auth (JWT).
- **Data Handling**: Supabase JS client.

### BackendDF.js for on-device PDF parsin
- **Framework**: FastAPI (Python).
- **Security**: Supabase JWT Verification.
- **Database**: Supabase (PostgreSQL).

### Machine Learning
- **Risk Assessment**: XGBoost Classifier.
- **Reasoning**: Google Gemma 3 1B (Quantized 4-bit).
- **Data Processing**: Pandas, NumPy, Scikit-learn.

## Key Features
1. **Smart PDF Extraction**: Eerate, High, Critical) using a trained XGBoost model.
3. **Personalized Ranking**: Ranks insurance plans based on budget, health conditions, and risk score.
4. **Natural Language Reasoning**: Uses Gemma 3 to explain *why* a specific plan is recommended in plain English.
xtracts health vitals (HbA1c, BP, BMI) directly from medical reports.
2. **AI Risk Assessment**: Classifies users into risk tiers (Low, Mod