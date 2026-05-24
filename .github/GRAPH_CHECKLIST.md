# Pre-Implementation Graph Checklist

**Use this before writing ANY code.** Check off each item to ensure your implementation has proper graph context.

## ⚡ Quick Start (5 min)

- [ ] **1. Identify your task type** — What are you changing?
  - Adding API endpoint
  - Modifying UI/component
  - Changing ranking/filtering logic
  - Adding database schema
  - Changing auth flow
  - Other: _________

- [ ] **2. Run graph query** — Open terminal and run:
  ```bash
  /graphify query "[your change: e.g., 'add recommendation validation to API route']"
  ```
  Save the output — it shows related nodes and communities.

- [ ] **3. Check god nodes** — Which of these does your task touch?
  - [ ] `compilerOptions` (TS config) — Am I changing types?
  - [ ] `isAuthEnabled()` (auth) — Am I protecting a route?
  - [ ] `DeterministicRankingService` (scoring) — Am I touching ranking?
  - [ ] `FindPage` (orchestration) — Am I changing flow steps?
  - [ ] `InMemoryFurnitureRepository` (data) — Am I querying furniture?
  - [ ] `RoomAnalysis` (types) — Am I changing room metadata?
  - [ ] `PainPointType` (domain) — Am I modifying pain point logic?

- [ ] **4. Check hyperedges** — Will my change affect any of these pipelines?
  - [ ] Room Vision Analysis (`analyzeroom_route` → Groq Vision → `RoomAnalysis`)
  - [ ] Recommendation Pipeline (`recommend_route` → filtering → ranking → display)
  - [ ] Find Page Multi-Step (intake → questions → room details → selection → results)
  - [ ] Pain Point Strategy (strategies → registry → filtering → scoring)
  - [ ] Auth Session Lifecycle (middleware → callback → signout)

---

## 📋 Task-Specific Checks

### ✅ Adding an API endpoint

**Graph queries:**
```
/graphify query "Which API routes exist and what data do they transform?"
/graphify query "How does recommend route validate inputs?"
/graphify path "Recommend Route" "RankingPipeline"
```

**Checklist:**
- [ ] My endpoint matches one of these patterns:
  - [ ] Analysis (input: images → output: `RoomAnalysis`)
  - [ ] Query (input: criteria → output: furniture candidates)
  - [ ] Ranking (input: items → output: scored items)
  - [ ] Other: _________
- [ ] I checked: Does my endpoint need LLM calls? If yes, see validation pattern in `app/api/recommend/route.ts`
- [ ] I validated: Are all inputs sanitized? (`dtos.ts` + `validation.ts`)
- [ ] I documented: Error responses follow `createErrorResponse()` pattern
- [ ] I tested: Full end-to-end with sample data

---

### ✅ Modifying Find page or component flow

**Graph queries:**
```
/graphify query "What is the full Find page flow from photo to results?"
/graphify query "Which hooks manage state in Find page?"
/graphify path "useRoomPhotos" "ResultsDisplay"
```

**Checklist:**
- [ ] I traced: `FindPage` → hook chain → (upload → analysis → query → rank → display)
- [ ] I verified: All 5 steps are wired:
  - [ ] `FindStepPromptIntake` (furniture selection)
  - [ ] `FindStepQuestions` (preferences)
  - [ ] `FindStepRoomDetails` (room context + photos)
  - [ ] `FindStepSelection` (confirm criteria)
  - [ ] `ResultsDisplay` (show recommendations)
- [ ] I checked: New component integrates with state hooks (`useRoomAnalysisFlow`, `useFurnitureRecommendation`)
- [ ] I tested: Multi-step flow doesn't break navigation between steps

---

### ✅ Modifying ranking or filtering logic

**Graph queries:**
```
/graphify query "How does deterministic ranking work and when does LLM take over?"
/graphify query "What pain point strategies exist?"
/graphify path "PainPointStrategy" "RankingPipeline"
```

**Checklist:**
- [ ] I understand: Ranking happens in TWO stages:
  1. `filterAndRankItems()` → deterministic scoring (fast, no LLM)
  2. `rankingPipeline.rank()` → top 12 get LLM reranking (expensive)
- [ ] I verified: My change doesn't break either stage
- [ ] I checked: Pain point filtering (`applyPainPointFilters()`) still gates items BEFORE scoring
- [ ] I tested: All 6 pain point strategies work with my changes:
  - [ ] StainResistance
  - [ ] Durability
  - [ ] Comfort
  - [ ] Compact
  - [ ] Assembly
  - [ ] Custom (if added)
- [ ] I validated: LLM response is parsed and filtered against candidate pool (see `app/api/recommend/route.ts`)

---

### ✅ Modifying database schema

**Graph queries:**
```
/graphify query "Which repositories implement the furniture repository interface?"
/graphify query "What does seed.ts do and how does it populate tables?"
/graphify path "IFurnitureRepository" "products table"
```

**Checklist:**
- [ ] I checked: New schema must be implemented in ALL 4 repository classes:
  - [ ] `IFurnitureRepository` (interface)
  - [ ] `InMemoryFurnitureRepository` (for testing)
  - [ ] `SupabaseFurnitureRepository` (for production)
  - [ ] `FallbackFurnitureRepository` (fallback impl)
- [ ] I verified: `seed.ts` can populate new fields with defaults
- [ ] I checked: `RoomAnalysis` and legacy compatibility adapters still work
- [ ] I tested: Both in-memory (test) and Supabase (prod) implementations
- [ ] I documented: Migration strategy if dropping/renaming columns

---

### ✅ Touching authentication

**Graph queries:**
```
/graphify query "What is the complete auth flow from login to protected routes?"
/graphify explain "isAuthEnabled"
/graphify path "Auth Callback Route" "User Roles"
```

**Checklist:**
- [ ] I verified: Auth session lifecycle is intact:
  1. `middleware` (updateSession)
  2. `auth/callback/route` (exchange code for session)
  3. `auth/signout/route` (clear session)
  4. Protected routes (check `isAuthEnabled()`)
- [ ] I checked: Is my change server-side or client-side?
  - [ ] Server-side: implement in `middleware` or route handler
  - [ ] Client-side: MUST have server-side fallback check
- [ ] I verified: `profiles` and `app_role` tables stay in sync with `auth.users`
- [ ] I tested: Full auth flow: login → protected page → signout

---

## 🚨 Blocking Issues

**STOP if any of these are true — you may break the system:**

- [ ] I modified a god node (like `DeterministicRankingService`) without running the full recommendation pipeline test
- [ ] I added code that touches `rankingPipeline` without validating LLM response parsing
- [ ] I changed `RoomAnalysis` schema without implementing legacy compatibility adapters
- [ ] I broke one of the 7 hyperedges (critical data flows)
- [ ] I added auth check only on client-side (frontend) without server-side validation
- [ ] I implemented a repository method in `IFurnitureRepository` without implementing in all 4 classes
- [ ] I added an API route without error handling pattern from `dtos.ts` / `middleware.ts`

---

## ✅ Final Sign-Off

Before submitting a PR:

- [ ] I consulted the graph for my change type
- [ ] I checked which god nodes I touched
- [ ] I verified I didn't break any hyperedges (data flows)
- [ ] I ran the full pipeline test (if applicable)
- [ ] I tested with real data (not just happy path)
- [ ] I documented any new communities or changes to existing ones

**If updating the code structure significantly, run after merge:**
```bash
/graphify --update
```
This will re-extract changes and update `GRAPH_REPORT.md`.

---

## 📚 Reference Links

- **Graph Report**: `graphify-out/GRAPH_REPORT.md` (god nodes, hyperedges, communities)
- **Graph JSON**: `graphify-out/graph.json` (raw graph data)
- **Interactive Viz**: `graphify-out/graph.html` (open in browser)
- **Copilot Instructions**: `.github/copilot-instructions.md` (always consult graph)
- **Recommendation Pipeline Example**: `app/api/recommend/route.ts` (validation pattern)
