# Outsurance Codebase Documentation

Welcome to the internal documentation for the Outsurance platform. This folder contains a detailed analysis of how the system is built and how data flows through it.

## Contents

1.  **[Architecture Overview](./architecture_overview.md)**: High-level system design and tech stack.
2.  **[Frontend Deep Dive](./frontend_deep_dive.md)**: Detailed look at the Next.js 16 web application.
3.  **[Backend & ML Deep Dive](./backend_deep_dive.md)**: Explanation of the FastAPI server and XGBoost/Gemma ML models.
4.  **[Data Flow](./data_flow.md)**: Step-by-step breakdown of the insurance assessment process.
5.  **[Setup Guide](./setup_guide.md)**: Instructions for setting up the local development environment.

---

## Quick Summary
- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4, GSAP, Framer Motion, PDF.js, Supabase.
- **Backend**: FastAPI, Supabase JWT Auth.
- **ML Layer**: XGBoost (Risk Tiering), Google Gemma 3 (Plan Reasoning).
