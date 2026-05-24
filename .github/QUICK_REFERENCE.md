# Quick Reference: System Architecture at a Glance

**Skim this in 2 minutes to understand the entire system.**

---

## 🧠 The 7 God Nodes (Core Abstractions)

These are the most connected concepts in the system. **Understand these, understand everything.**

| # | Node | Edges | What it does | When you touch it |
|---|------|-------|-------------|-------------------|
| 1 | `compilerOptions` | 16 | TypeScript type safety across codebase | Changing type definitions, config |
| 2 | `isAuthEnabled()` | 15 | Auth gating for all protected features | Protecting routes, checking permissions |
| 3 | `DeterministicRankingService` | 13 | Fast item scoring (no LLM) | Adding scoring factors, ranking changes |
| 4 | `FindPage` | 13 | Multi-step room-to-result orchestration | Modifying Find flow, adding steps |
| 5 | `InMemoryFurnitureRepository` | 11 | Data abstraction for furniture queries | Querying catalog, adding filters |
| 6 | `RoomAnalysis` | 10 | Type for room context metadata | Changing room analysis schema |
| 7 | `PainPointType` | 10 | Domain model for user pain points | Adding strategies, changing pain logic |

**Rule:** Every god node change = high risk. Test all its edges.

---

## 🔗 The 7 Hyperedges (Critical Data Flows)

These are the major pipelines. **Breaking any of these breaks the feature.**

### 1️⃣ Room Vision Analysis Pipeline
```
Photo Upload → preprocessRoomImages() → callGroqVision() → RoomAnalysis
```
**File:** `app/api/analyze-room/route.ts`  
**What it does:** Analyzes room from photos, returns structured metadata  
**If you break it:** Users can't get room analysis (whole feature down)  

### 2️⃣ Recommendation Scoring Pipeline
```
Candidates → applyPainPointFilters() → DeterministicRankingService.scoreItem() → top 12 → LLM rerank → final results
```
**File:** `app/api/recommend/route.ts`  
**What it does:** Filters, scores, and reranks furniture  
**If you break it:** Wrong items recommended or hallucinated IDs  

### 3️⃣ Find Page Multi-Step Flow
```
Intake → Questions → Room Details → Selection → Results Display
```
**File:** `app/find/page.tsx` + 5 step components  
**What it does:** Guides user through room-to-recommendation journey  
**If you break it:** User can't complete the flow  

### 4️⃣ Pain Point Strategy Pattern
```
6 Strategy Classes → PainPointStrategyRegistry → applyPainPointFilters() → scoring
```
**File:** `lib/ai/strategies/`, `lib/ai/item-filter.ts`  
**What it does:** Matches furniture to user pain points (durability, comfort, assembly, etc.)  
**If you break it:** Wrong items pass through filters  

### 5️⃣ Auth Session Lifecycle
```
Login → middleware (updateSession) → callback (exchange code) → protected routes → signout
```
**Files:** `lib/supabase/middleware.ts`, `app/auth/callback/route.ts`, `app/auth/signout/route.ts`  
**What it does:** Handles user authentication and session state  
**If you break it:** Users locked out or security vuln  

### 6️⃣ Repository Pattern (Data Layer)
```
Interface → 4 Implementations (InMemory, Supabase, Fallback, Memory)
```
**File:** `lib/repositories/`  
**What it does:** Abstracts furniture catalog access  
**If you break it:** Some implementations fail (test vs production)  

### 7️⃣ LLM Reranking with Validation
```
Top 12 candidates → buildLLMRerankerPrompt() → Groq API → parse response → validate against topCandidates → rebuild order
```
**File:** `app/api/recommend/route.ts` (lines 96-113)  
**What it does:** Uses LLM for final ranking with safety checks  
**If you break it:** Hallucinated items slip through to user  

**Rule:** Every hyperedge has a full pipeline test. Write one.

---

## 📦 The 5 Most Important Communities

| Community | Size | Cohesion | Why it matters |
|-----------|------|----------|----------------|
| Groq AI Client | 51 nodes | 0.06 | All LLM calls go through here; cost & latency |
| Image Processing | 26 nodes | 0.09 | Photo upload & dedup; affects room analysis quality |
| Find Flow UI | 26 nodes | 0.10 | User journey; if broken = feature down |
| Ranking & Furniture | 33 nodes | 0.09 | Scoring + catalog; core to recommendations |
| Room Analysis Types | 9 nodes | **0.35** ⚠️ | High cohesion = high connectivity; breaking changes cascade |

---

## 🚨 The 5 Biggest Risks

| Risk | Why | How to avoid |
|------|-----|-------------|
| **LLM hallucination** | LLM can invent item IDs not in catalog | Validate against `topCandidates` (see line 102-112 in `recommend/route.ts`) |
| **Pain point filtering bypassed** | Items sneak through without validation | Always run `applyPainPointFilters()` before scoring |
| **RoomAnalysis schema break** | Legacy compatibility breaks saved results | Use `fromRoomAnalysisLegacy()` / `toRoomAnalysisLegacy()` adapters |
| **Auth bypass** | Client-side checks only (insecure) | **Always** gate in middleware or route handler |
| **Repository impl missing** | Only implement in 1 of 4 repo classes | Implement in: Interface, InMemory, Supabase, Fallback |

---

## 💡 The 5 Surprising Connections

These connections weren't obvious but are critical:

1. **Logos connected to auth** (`Next.js Wordmark Logo` ↔ `Auth Toggle`)
   - SVGs in `/public/` are referenced in `README.md` auth docs

2. **Log snapshots tied to sorting** (`Recommendation Run 2026-04-09` ↔ `sortRecommendations()`)
   - Historical logs inform recommendation cache behavior

3. **TypeScript config is a god node** (`compilerOptions` with 16 edges)
   - Type safety touches everything; changing TS config affects all modules

4. **Room Analysis legacy/modern split** (`RoomAnalysisLegacy` ↔ `RoomAnalysisModern`)
   - Two versions needed for backward compatibility with saved results

5. **All UI steps depend on useRoomAnalysisFlow** (`FindStepRoomDetails` → `useRoomAnalysisFlow`)
   - Room analysis is the bottleneck; if it's slow, whole feature feels slow

---

## 📍 File Locations (Quick Navigation)

### Core Logic
- **Recommendation**: `app/api/recommend/route.ts`
- **Ranking**: `lib/ai/ranking/RankingPipeline.ts`
- **Filtering**: `lib/ai/item-filter.ts`
- **Pain strategies**: `lib/ai/strategies/`
- **Room analysis**: `app/api/analyze-room/route.ts`

### UI Flow
- **Find page**: `app/find/page.tsx`
- **5 steps**: `app/find/components/FindStep*.tsx`
- **Hooks**: `app/find/hooks/`
- **Results**: `app/find/components/ResultsDisplay.tsx`

### Data Layer
- **Repositories**: `lib/repositories/`
- **Types**: `lib/types/`
- **Database**: `lib/db/schema.sql`, `lib/db/seed.ts`
- **Validation**: `lib/api/validation.ts`

### Auth & Config
- **Auth**: `app/auth/`, `lib/supabase/`
- **Config**: `lib/config/`
- **Logger**: `lib/ai/logger.ts`

---

## ✅ 30-Second Sanity Checks

**Before submitting code, answer:**

1. ✅ Did I touch a god node? → Did I test all its edges?
2. ✅ Did I break a hyperedge? → Did I test the full pipeline?
3. ✅ Does my code parse external input (LLM, API)? → Did I validate it?
4. ✅ Did I touch auth? → Is check server-side + client-side?
5. ✅ Did I add a repository method? → Did I implement in all 4 classes?

---

## 🔍 How to Use This

1. **Bookmark this file** — Reference it daily
2. **When task drops** — Find it in the god nodes or hyperedges above
3. **When stuck** — Check "The 5 Biggest Risks" table
4. **When designing** — Use god nodes as decision points
5. **When testing** — Trace the relevant hyperedge

---

## 📚 Go Deeper

- Full god nodes explanation: `graphify-out/GRAPH_REPORT.md` → "God Nodes" section
- Hyperedges with confidence scores: `graphify-out/GRAPH_REPORT.md` → "Hyperedges" section
- Interactive visualization: `graphify-out/graph.html`
- Pre-implementation checklist: `.github/GRAPH_CHECKLIST.md`
- Development workflow: `.github/GRAPH_WORKFLOW.md`
