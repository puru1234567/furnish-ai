# FurnishAI 🛋️✨

> **AI-Powered Interior Spatial Reasoning & Furniture Shortlisting Engine**  
> FurnishAI bridges the gap between raw room photos, user pain points, and curated furniture catalogs through multimodal computer vision, deterministic spatial scoring, and explainable AI recommendations.

---

## 📑 Table of Contents

- [Vision & Key Capabilities](#-vision--key-capabilities)
- [System Architecture](#-system-architecture)
  - [1. Multimodal Room Vision Pipeline](#1-multimodal-room-vision-pipeline)
  - [2. Hybrid Two-Stage Recommendation Engine](#2-hybrid-two-stage-recommendation-engine)
  - [3. Multi-Dimensional Personalization Engine](#3-multi-dimensional-personalization-engine)
  - [4. Repository Pattern & Query Push-Down](#4-repository-pattern--query-push-down)
- [Whole-Home & 2D Room Blueprint Visualizer](#-whole-home--2d-room-blueprint-visualizer)
- [Explainability & Trust Features](#-explainability--trust-features)
- [Admin & Vendor Portal (RBAC)](#-admin--vendor-portal-rbac)
- [Environment Variables & Feature Flags](#-environment-variables--feature-flags)
- [Database Setup & Migrations](#-database-setup--migrations)
- [Development, Testing & Verification](#-development-testing--verification)

---

## 🌟 Vision & Key Capabilities

Buying furniture online is fraught with friction: pieces arrive too large for doorways, fabrics stain in busy homes with pets, or aesthetics clash with wall colors and floor finishes. **FurnishAI** replaces generic search bars with an intelligent design consultant:

1. **Multimodal Room Photo Intake**: Users upload room photos; the vision model extracts wall color, floor types, room dimensions, natural lighting, and existing furniture.
2. **Contextual Pain-Point Matching**: Solves real living friction (e.g. `stains_easily`, `too_bulky`, `assembly_nightmare`) using strict deterministic rules.
3. **Two-Tier Recommendation Delivery**: Surfaces **Primary Fits** (within budget) alongside justified **Stretch Options** (demonstrating why spending slightly more yields 5-10 year longevity).
4. **Visual Spatial Fitting**: Preview recommended pieces directly inside an architectural 2D room floor plan with clearance walkway validation.
5. **Zero-Blackbox Transparency**: Every recommendation exposes its exact scoring breakdown, compatibility percentage, and reasoning badges.

---

## 🏛️ System Architecture

FurnishAI is built on **Next.js 16 (App Router)** and **React 19**, leveraging TypeScript for end-to-end type safety.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              USER BROWSER                              │
│   /find (Intake)  ──>  /result (Shortlist)  ──>  2D Visualizer Modal   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS API BACKEND                             │
│                                                                        │
│   POST /api/analyze-room          POST /api/recommend                  │
│   ┌────────────────────────┐      ┌────────────────────────────────┐   │
│   │ Google Gemini 2.5 Flash│      │ 1. Push-Down Repository Query  │   │
│   │ Wall/Floor/Light/Needs │      │ 2. Deterministic Scoring Rule  │   │
│   └────────────────────────┘      │ 3. Personalization Engine      │   │
│                                   │ 4. Groq Llama 3.3 70B Rerank   │   │
│                                   └────────────────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DATA PERSISTENCE LAYER                           │
│   Supabase PostgreSQL (Products, Saved Searches, User Preferences)     │
│   + In-Memory High-Speed Fallback (Dev/Offline Mode)                   │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Multimodal Room Vision Pipeline
- **Endpoint**: [`app/api/analyze-room/route.ts`](file:///app/api/analyze-room/route.ts)
- **Model**: `gemini-2.5-flash` via `@google/genai`
- **Output**: Structured JSON containing wall colors, flooring materials, room layout, estimated width/depth in feet, spatial constraints, and high-priority furniture needs.

### 2. Hybrid Two-Stage Recommendation Engine
Instead of relying purely on an LLM (which hallucinates dimensions, pricing, and stock), FurnishAI uses a hybrid pipeline:
- **Stage 1 — Deterministic Rule Engine** ([`lib/ai/ranking/DeterministicRankingService.ts`](file:///lib/ai/ranking/DeterministicRankingService.ts)):
  - Enforces hard filters (city fulfillment, absolute budget caps, out-of-stock exclusion).
  - Scores pain-point alignment (e.g. machine-washable cotton covers get boosted for `stains_easily`; delicate velvet gets penalized).
  - Evaluates spatial footprint against room square footage.
- **Stage 2 — Soft Reranking & Synthesis** ([`lib/ai/groq-client.ts`](file:///lib/ai/groq-client.ts)):
  - Only the top ~12 candidates are forwarded to **Groq Llama 3.3 70B Versatile**.
  - Generates natural, context-rich "Why it fits you" and "Why it's worth the stretch" summaries.

### 3. Multi-Dimensional Personalization Engine
- **Module**: [`lib/personalization/`](file:///lib/personalization/)
- Computes weighted preference vectors across:
  - **Style Overlap**: Affinity for modern, minimal, warm, or traditional aesthetics.
  - **Budget Band**: Value, balanced, or premium comfort ranges.
  - **Room Scale**: Compact vs spacious footprint weighting.
  - **Behavioral Volume**: Gradually shifts ranking weights from cold-start session answers to learned user profile tastes.

### 4. Repository Pattern & Query Push-Down
- **Interface**: [`lib/repositories/IFurnitureRepository.ts`](file:///lib/repositories/IFurnitureRepository.ts)
- **Supabase Implementation**: [`lib/repositories/SupabaseFurnitureRepository.ts`](file:///lib/repositories/SupabaseFurnitureRepository.ts) pushes SQL queries down to PostgREST (`price <= max`, `category = eq`, `cities @>`, `limit`, `offset`).
- **In-Memory Implementation**: [`lib/repositories/InMemoryFurnitureRepository.ts`](file:///lib/repositories/InMemoryFurnitureRepository.ts) provides seamless offline and development fallback, with support for pan-India delivery matching.

---

## 📐 Whole-Home & 2D/3D Spatial Blueprint Visualizer

Located in [`app/components/visualizer/RoomVisualizerPreview.tsx`](file:///app/components/visualizer/RoomVisualizerPreview.tsx) and accessible directly at [`/visualizer`](file:///app/visualizer/page.tsx) or from the shortlist page (`/result`), this feature allows users to:
- **Dedicated Spatial Studio (`/visualizer`)**: Standalone interactive workspace to plan entire residences before taking any quiz.
- **2D Overhead Blueprint vs 3D Isometric View**: Toggle seamlessly between architectural grid blueprints and realistic 3D isometric perspectives with ambient depth and elevation shadows.
- **Multi-Zone Whole-Home Overview**: Switch between Living Room, Master Bedroom, Dining Space, and Home Office/Study, or inspect the Whole-Home Overview card deck.
- **Direct Drag-and-Drop Positioning**: Drag furniture pieces directly across the floor plan with real-time boundary clamping.
- **"✨ Equip This Space" Catalog Drawer**: Browse real pieces with CDN photography, prices, and dimensions, then click `+ Place` to scale them accurately into the layout.
- **"🪄 Auto-Furnish Suite" Preset**: Generate a cohesive design package for the selected room in one click.
- **Circulation & Door-Swing Collision Detection**: Dashed circulation halos warn in real time if pieces impede natural walkways.
- **Architectural Material Finishes**: Switch between Oak Hardwood, Italian Marble, Terrazzo, and Slate Concrete flooring, paired with curated wall accents.
- **"📥 Export Blueprint Spec Sheet"**: Produce an itemized bill of materials with dimensions, square footage, occupancy percentage, and investment totals—printable or downloadable as JSON.
- **Session Persistence**: Custom room layouts automatically save to browser local storage.
- **Mathematical Geometry Engine** ([`lib/visualizer/geometry.ts`](file:///lib/visualizer/geometry.ts)): Pure utility algorithms for area occupancy, distance threshold collision checking, and coordinate clamping covered by automated unit tests.

---

## 🔍 Explainability & Trust Features

FurnishAI avoids black-box recommendations:
- **`AIReasoningBadges`**: Tags identifying key decision factors (*"Family & Pet Safe"*, *"Space-Optimized"*, *"10y Warranty"*).
- **`ConfidenceIndicator`**: Visual percentage bar reflecting compatibility with the user's explicit intake answers.
- **`StretchOverhead`**: Clear callout showing exact rupee overhead over budget with justification on why the investment pays off.

---

## 🛡️ Admin & Vendor Portal (RBAC)

FurnishAI includes a complete, enterprise-grade administrative and marketplace subsystem:
- **Role-Based Access Control** ([`lib/admin/authorization.ts`](file:///lib/admin/authorization.ts)):
  - `super_admin`: Full platform control, role escalation, security settings.
  - `platform_admin`: Marketplace operations, vendor review, platform analytics.
  - `vendor_admin`: Vendor management and onboarding review.
  - `catalog_admin`: Catalog ingestion, product moderation, and categorization.
  - `support_admin`: Customer support and dispute resolution.
  - `analytics_admin`: Read-only access to audit logs and business intelligence.
- **PostgREST Pagination**: Both `listAdminProducts` and `listAdminVendors` execute `.range()` slice queries directly in PostgreSQL to ensure massive catalogs do not exhaust Node.js server memory.

---

## ⚙️ Environment Variables & Feature Flags

Create `.env.local` in the project root:

```env
# ── Authentication & Access Control ─────────────────────────────────
NEXT_PUBLIC_AUTH_ENABLED=false     # Set to 'false' for public demo mode; 'true' to require login

# ── Database & Storage ──────────────────────────────────────────────
USE_SUPABASE_DB=false              # 'false' uses curated in-memory catalog; 'true' uses Supabase Postgres
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── AI Model Providers ──────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key # Powers Google Gemini 2.5 Flash vision analysis
GROQ_API_KEY=your-groq-api-key     # Powers Groq Llama 3.3 70B reranking
ENABLE_LLM_RERANK=true             # Set to 'false' to run 100% deterministic code scoring
```

---

## 💾 Database Setup & Migrations

If using Supabase (`USE_SUPABASE_DB=true`), apply the SQL migrations located in `lib/db/`:

```bash
# 1. Apply core schema and RBAC roles
psql -d $DATABASE_URL -f lib/db/schema.sql
psql -d $DATABASE_URL -f lib/db/auth-schema.sql
psql -d $DATABASE_URL -f lib/db/admin-users-roles-schema.sql

# 2. Seed database with curated Indian furniture catalog
npm run db:seed
```

---

## 🧪 Development, Testing & Verification

### Run Dev Server
```bash
npm run dev
# Server boots at http://localhost:3000
```

### Run Unit Tests
FurnishAI uses Node's native test runner (`node:test` via `tsx`) for ultra-fast, zero-overhead testing:
```bash
npm test
```
Tests cover:
- Admin authorization, RBAC permission resolution, and security gates
- Deterministic pain-point ranking, boost scores, and exclusion filtering
- Ranking pipeline tier assignment (Primary vs Stretch vs Discarded)
- Repository criteria push-down, price bounding, pan-India delivery, and pagination

### Run Linter & Typecheck
```bash
npm run lint      # Strict ESLint 9 + React 19 hook purity checks
npx tsc --noEmit  # Full TypeScript typecheck across all files
```

---

## 📄 License

FurnishAI is proprietary and built with Next.js 16, React 19, and TailwindCSS / Vanilla CSS design system tokens.
