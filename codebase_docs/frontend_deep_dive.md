# Frontend Deep Dive

The Outsurance frontend is built with **Next.js 16** (App Router) and **TypeScript**. It runs in any modern browser and is fully responsive across mobile, tablet, and desktop.

## Structure (`frontend/src/`)

### 1. `app/` — Next.js App Router Pages
All routes live here as `page.tsx` files. Each folder becomes a URL segment.

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — cinematic loader, GSAP ScrollTrigger sections |
| `/login` | `app/login/page.tsx` | Login (delegates to `AuthSplitLayout`) |
| `/register` | `app/register/page.tsx` | Signup (delegates to `AuthSplitLayout`) |
| `/assessment` | `app/assessment/page.tsx` | 5-step health intake wizard |
| `/dashboard` | `app/dashboard/page.tsx` | Risk card + plan recommendations + agent chat |
| `/explorer` | `app/explorer/page.tsx` | Filter/sort plan listing |
| `/explorer/[id]` | `app/explorer/[id]/page.tsx` | Plan detail + stress test |
| `/saved` | `app/saved/page.tsx` | Bookmarked plans |
| `/profile` | `app/profile/page.tsx` | Account management |

### 2. `components/` — Reusable UI Components
- **`AuthSplitLayout.tsx`**: Two-panel auth UI (video left, form right). Used by `/login` and `/register`.
- **`Sidebar.tsx`**: Desktop vertical sidebar + mobile full-screen drawer overlay. Fetches user name from Supabase.
- **`StressTestModal.tsx`**: Emergency cost calculator — 5 scenarios, client-side calculations.
- **`CompareDrawer.tsx`**: Bottom sheet for side-by-side plan comparison (up to 3 plans, 9 row comparison table).
- **`editorial.tsx`**: Shared UI primitives: `Crosshair`, `HybridHeadline`, `FormField`, `EditorialButton`, `AnnotationBox`, etc.

### 3. `lib/`
- **`api.ts`**: Backend API client — `assessHealthProfile()`, `fetchAllPlans()`, `runStressTest()`, `chatWithAdvisor()`, `processLabReport()`
- **`supabase.ts`**: Supabase auth + database operations — JWT management, `saveAssessmentResult()`, `toggleSavedPlan()`, `getLatestRecommendation()`
- **`compare.ts`**: `useCompare()` hook — plan comparison state via `localStorage` with multi-tab sync via custom events
- **`utils.ts`**: Misc utility functions

### 4. `data/` + `enums/`
- **`data/landing.data.ts`**: Landing page copy — features, annotations, cross marker positions
- **`enums/landing.enum.ts`**: Brand constants — `BRAND_NAME = "OUTSURANCE"`, `TAGLINE`, `REGION = "INDIA"`

## Key Technologies

### Tailwind CSS v4 + PostCSS
Uses utility classes via `className`. CSS variables defined in `globals.css` provide the design token system:
```css
--color-sutera-green: #1E5B3B;
--font-display: 'Syne', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### GSAP + ScrollTrigger + Framer Motion
- **GSAP**: Landing page orchestration — cinematic loader timeline, ScrollTrigger pinned sections, parallax effects, stagger animations
- **Framer Motion**: App screen component-level animations — stagger on plan card reveal, modal entrance/exit

### PDF Parsing
When a user uploads a medical report, `pdfjs-dist` reads the text content of the PDF entirely in the browser — no server call. Regex patterns then extract HbA1c, Blood Pressure, and BMI values before they are confirmed by the user on Step 4.

### Supabase Integration
Uses `@supabase/supabase-js` for:
- User Authentication (Email/Password, JWT)
- Storing user profile data, assessments, recommendations, saved plans
- Row-Level Security ensures users only access their own data

## Flow: The Assessment Process
1. **Step 1-2**: User fills demographic + health condition form fields
2. **Step 3**: User uploads PDF (pdfjs-dist parses on-device) or enters values via chat
3. **Step 4**: User reviews and confirms all 10 extracted values (privacy checkpoint)
4. **API Call**: Only 10 numeric values sent to FastAPI `/api/assess` (JWT-authenticated)
5. **Step 5 loading**: XGBoost + scorer + cosine similarity runs on backend
6. **Dashboard**: Risk card + top-5 plan cards + agent chat rendered with Framer Motion stagger
