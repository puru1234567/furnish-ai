# FurnishAI Copilot Instructions

## 🔴 CRITICAL: ALWAYS CONSULT THE GRAPH FIRST

**Before writing any code or making changes:**

1. **Read the graph** — Open `graphify-out/GRAPH_REPORT.md` or run `/graphify query "[your task]"` to understand:
   - Which **god nodes** (core abstractions) your change touches
   - Which **communities** (module groups) interact with your code
   - Which **hyperedges** (critical data flows) you might impact
   - Which **surprising connections** might create side effects

2. **Check the recommendation pipeline** — If touching recommendation logic, trace:
   - Photo upload → Room Analysis (preprocess, Groq Vision)
   - Room Analysis → Furniture Query (pain points, ranking)
   - Query → Deterministic Ranking → LLM Reranking → Results Display
   - Reference: `graphify-out/GRAPH_REPORT.md` → "Hyperedges" section

3. **Validate against god nodes** (your core abstractions):
   - `compilerOptions` (TS config, 16 edges) — don't break type safety
   - `isAuthEnabled()` (auth gating, 15 edges) — check all guarded routes
   - `DeterministicRankingService` (scoring, 13 edges) — test with real data
   - `FindPage` orchestration (multi-step flow, 13 edges) — trace full journey
   - `InMemoryFurnitureRepository` (data abstraction, 11 edges) — respect interface
   - `RoomAnalysis` type (type safety, 10 edges) — maintain schema compatibility
   - `PainPointType` & strategies (domain logic, 10 edges) — don't skip validation

4. **Ask the graph before modifying:**
   - Adding an API endpoint? Query: `"Where does recommendation API route fit in the pipeline?"`
   - Touching UI state? Query: `"What hooks manage find page state?"`
   - Changing a database schema? Query: `"Which repositories depend on this table?"`
   - Modifying filtering logic? Query: `"How do pain point strategies integrate with filtering?"`

---

Use the `frontend-design` skill from `.github/skills/frontend-design/SKILL.md` whenever the task involves:
- UI redesign
- frontend polish
- component styling
- layout improvements
- animations or transitions
- visual hierarchy
- responsive behavior

For this repository:
- preserve working product behavior first
- prefer elegant, premium, warm design over generic dashboard styling
- keep DM Serif Display for strong display moments and DM Sans for interface/body text
- use the existing terracotta, gold, moss, charcoal, and sand palette as the base direction unless a redesign is requested
- avoid generic AI-looking visuals and default component-library aesthetics
- prefer focused, high-impact visual changes instead of noisy decoration

When working on frontend tasks, choose a clear aesthetic direction before editing code and keep the result cohesive across layout, spacing, color, and motion.

---

## 📋 TASK-SPECIFIC GRAPH CHECKS

### If adding/modifying an API route:
- Query: `"Which API routes exist and what do they touch?"`
- Check: Does your route touch `rankingPipeline`? If yes, validate LLM response parsing (see `app/api/recommend/route.ts` for validation pattern)
- Validate: New endpoint must not create circular dependencies (check god node edges)
- Test: Run the full pipeline end-to-end with graph validation

### If touching the Find page flow:
- Check: All 5 steps (Intake, Questions, Room Details, Selection, Results) in `FindPage` orchestration
- Verify: `useRoomAnalysisFlow()` → `useRoomPhotos()` → `preprocessRoomImages()` → `callGroqVision()` chain intact
- Test: Photo upload → analysis → recommendation display (full journey)

### If modifying ranking/filtering logic:
- Check: How does your change interact with `PainPointStrategy` pattern?
- Verify: `DeterministicRankingService.scoreItem()` must run before `RankingPipeline.rank()`
- Validate: No item should bypass pain point filtering (`passesPainHardFilter()`)
- Test: Filter with different pain points, budgets, room types

### If adding a database table or modifying schema:
- Check: Which repositories depend on this table? (`IFurnitureRepository`, `InMemoryFurnitureRepository`, `SupabaseFurnitureRepository`)
- Verify: Backward compatibility with `RoomAnalysis` legacy/modern models
- Validate: Seed script (`db/seed.ts`) can populate new fields
- Test: Both in-memory and Supabase implementations

### If touching authentication:
- Check: `isAuthEnabled()` guards all protected routes
- Verify: Auth session lifecycle: `middleware` → `callback` → `signout` intact
- Validate: Profile & role tables (`auth.users`, `profiles`, `app_role`) in sync
- Test: Login → protected routes → signout flow

---

## ✅ VALIDATION RULES (Enforced by Graph)

### Code review checklist before merge:
- [ ] Ran `/graphify query "[my change description]"` to identify impacted communities
- [ ] Checked god nodes table — no unexpected edge additions to core abstractions
- [ ] Verified hyperedges — didn't break any data flow pipelines
- [ ] Confirmed: All surprise connections are intentional (if any introduced)
- [ ] Tested: Full recommendation flow (photo → ranking → display) if touching any stage
- [ ] Validated: No new circular dependencies in call graph
- [ ] Documented: New components in their respective community (update `GRAPH_REPORT.md` after merge if structure changed)

---

## 🚨 COMMON PITFALLS (Learn from the graph)

| Pitfall | Why it breaks | How to avoid |
|---------|---------------|--------------|
| LLM returns item ID not in `topCandidates` | Hallucination not validated | See `app/api/recommend/route.ts` validation pattern — filter LLM output against candidate pool |
| Rank items without pain point filtering | Wrong items promoted to user | Always run `applyPainPointFilters()` before scoring — check `filterAndRankItems()` |
| Skip deterministic scoring, go straight to LLM | Token waste, slower, worse results | Follow `rankingPipeline` order: filters → deterministic → top 12 → LLM |
| Modify `RoomAnalysis` schema without legacy compat | Old saved results break | Use `fromRoomAnalysisLegacy()` / `toRoomAnalysisLegacy()` adapters |
| Auth check in component, not in route | Client-side only (insecure) | Always gate in `middleware` or route handler — `isAuthEnabled()` must pass server-side |
| Add field to repository interface without impl | Breaks `InMemoryFurnitureRepository` | Implement in all 4 repo classes: Interface, InMemory, Supabase, Fallback |

---

## 📊 QUICK REFERENCE: TOP COMMUNITIES BY IMPACT

1. **Groq AI Client Layer** (51 nodes) — All LLM calls go through here; changes affect cost & latency
2. **Image Processing & Dedup** (26 nodes) — Photo upload pipeline; changes affect room analysis quality
3. **Find Flow UI Steps** (26 nodes) — User journey; breaking here blocks full feature
4. **Ranking & Furniture Data** (33 nodes) — Ranking logic + catalog; core to recommendations
5. **Room Analysis Types** (9 nodes, high cohesion 0.35) — Schema for room context; breaking changes cascade

---

## 🔗 GRAPH RESOURCES

- **Full graph**: `graphify-out/graph.json` (728 nodes, 1216 edges, 76 communities)
- **Audit report**: `graphify-out/GRAPH_REPORT.md` (god nodes, hyperedges, surprising connections)
- **Interactive viz**: `graphify-out/graph.html` (open in browser, explore relationships)
- **Query the graph**: Run `/graphify query "[your question]"` in terminal

### God Nodes Deep Dive (in order of connectivity):
1. `compilerOptions` (16 edges) → Type safety across codebase
2. `isAuthEnabled()` (15 edges) → Auth gating for all protected features
3. `DeterministicRankingService` (13 edges) → Scoring pipeline
4. `FindPage` (13 edges) → Multi-step room-to-recommendation flow
5. `InMemoryFurnitureRepository` (11 edges) → Data abstraction for queries

### Hyperedges (Critical Data Flows):
- **Room Vision Analysis** → `analyzeroom_route` → `roomvision` → `groqclient_callGroqVision`
- **Recommendation Pipeline** → `recommend_route` → `filterAndRankItems` → `rankingPipeline`
- **Find Page Multi-Step** → `page_findpage` → 5 steps → result display
- **Pain Point Strategy** → 6 strategy implementations → registry → filtering
- **Auth Session Lifecycle** → middleware → callback → signout

---

For this repository:
- preserve working product behavior first
- prefer elegant, premium, warm design over generic dashboard styling
- keep DM Serif Display for strong display moments and DM Sans for interface/body text
- use the existing terracotta, gold, moss, charcoal, and sand palette as the base direction unless a redesign is requested
- avoid generic AI-looking visuals and default component-library aesthetics
- prefer focused, high-impact visual changes instead of noisy decoration