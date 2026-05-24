# Graph-Driven Development Workflow

This document shows how to integrate the knowledge graph into your daily development cycle to **minimize errors and maximize code coverage context for Copilot**.

---

## 🔄 Development Lifecycle

### Phase 1: Before You Code (5 min)

1. **Open the graph report**
   ```bash
   cat graphify-out/GRAPH_REPORT.md
   ```
   Or run a targeted query:
   ```bash
   /graphify query "Where should I add [my feature]?"
   ```

2. **Answer these questions:**
   - Which **god nodes** (core abstractions) will my change touch?
   - Which **communities** (modules) will I be modifying?
   - Which **hyperedges** (critical data flows) might be affected?
   - Is there a **surprising connection** I should know about?

3. **Check the checklist**
   ```bash
   cat .github/GRAPH_CHECKLIST.md
   ```
   Find your task type and check off items.

4. **Ask Copilot**
   - Mention the god nodes you found
   - Reference the hyperedge that affects your code
   - Link to the GRAPH_REPORT section
   - Example: *"Looking at the god node `DeterministicRankingService` (13 edges), I need to add a new scoring factor. Which hyperedges connect to this? Check GRAPH_REPORT.md"*

---

### Phase 2: While Coding (Continuous)

1. **Copilot context injection**
   - When prompting Copilot, include: *"Check GRAPH_REPORT.md for god nodes and hyperedges related to [your change]"*
   - Mention specific communities from the report
   - Reference validation patterns (e.g., `app/api/recommend/route.ts` for LLM response parsing)

2. **Cross-community awareness**
   - If touching multiple communities, ask Copilot: *"Show me all edges between [Community A] and [Community B] in the graph"*
   - This prevents missed dependencies

3. **God node validation**
   - Before changing any god node, run:
     ```bash
     /graphify query "What touches [god node name]?"
     ```
   - Update your test cases to cover all those dependencies

4. **Reference implementations**
   - Copy validation patterns from tested code:
     - LLM response parsing: `app/api/recommend/route.ts` (candidateIds validation)
     - Repository pattern: `lib/repositories/SupabaseFurnitureRepository.ts`
     - Pain point strategy: `lib/ai/strategies/PainPointStrategy.ts`
     - Auth gating: `lib/supabase/middleware.ts`

---

### Phase 3: Code Review (Self-check)

Before submitting PR:

1. **Trace your changes through the graph**
   ```bash
   /graphify query "[my change description]"
   ```

2. **Run the impact assessment**
   - Did I touch a god node? → Test all its edges
   - Did I break a hyperedge? → Test the full pipeline
   - Did I cross communities? → Verify no circular deps

3. **Validate with hyperedges**
   - If touching **Room Vision Pipeline**: Test photo → analysis → room context
   - If touching **Recommendation Pipeline**: Test items → filtering → ranking → display
   - If touching **Find Page**: Test all 5 steps in sequence
   - If touching **Auth**: Test login → protected routes → signout
   - If touching **Pain Points**: Test all 6 strategies

4. **Check error patterns**
   - Use validation from `dtos.ts` for API inputs
   - Use error response pattern from `middleware.ts`
   - Use LLM validation pattern from `recommend/route.ts`

---

### Phase 4: After Merge (Keep Graph Fresh)

1. **Update the graph** (if code structure changed significantly)
   ```bash
   /graphify --update
   ```
   This re-extracts new/changed files and updates `GRAPH_REPORT.md`.

2. **Review the diff**
   - New communities created?
   - God nodes edge counts changed?
   - New surprising connections?
   - Document in PR or commit message.

3. **Archive the old report**
   ```bash
   cp graphify-out/GRAPH_REPORT.md docs/GRAPH_REPORT_$(date +%Y%m%d).md
   ```
   Track how the system evolves over time.

---

## 🎯 Real-World Examples

### Example 1: Adding a new pain point strategy

**Before coding:**
```bash
/graphify query "How do pain point strategies work?"
```

**Graph shows:**
- Community: "Strategy Pattern Layer" (10 nodes)
- God node: `PainPointType` (10 edges)
- Hyperedge: "Pain Point Strategy Pattern" (6 strategies → registry → filtering → scoring)

**What this tells you:**
- You MUST extend 3 files: strategy interface, registry, and pain point selector
- All 6 existing strategies are tested → use one as template
- The registry is a god node → test that new strategy integrates
- Filtering must validate pain point BEFORE scoring (check order in `filterAndRankItems`)

**Copilot prompt:**
> "I'm adding a new pain point strategy. The graph shows `PainPointType` is a god node with 10 edges. Look at `lib/ai/strategies/` and the registry. What do I need to update? Also check the filtering order in `filterAndRankItems()` to ensure pain point validation happens before scoring."

---

### Example 2: Modifying the recommendation API response

**Before coding:**
```bash
/graphify path "recommend_route" "ResultsDisplay"
```

**Graph shows:**
- The path crosses 4 communities
- Hyperedge: "Recommendation Fetch and Comparison Rendering"
- `DeterministicRankingService` (god node) must run before LLM

**What this tells you:**
- Your API response structure is critical — it's used by ResultsDisplay
- LLM reranking is optional but when enabled, must validate candidates
- See validation pattern in `app/api/recommend/route.ts` (checks LLM output against `topCandidates`)

**Copilot prompt:**
> "I need to add a field to the recommendation response. The graph shows this affects `ResultsDisplay` and the full pipeline from routing to display. What data structure changes? And see line 96-113 in recommend/route.ts for LLM validation pattern — do I need similar validation?"

---

### Example 3: Changing RoomAnalysis schema

**Before coding:**
```bash
/graphify explain "RoomAnalysis"
```

**Graph shows:**
- Community: "Room Analysis Types" (cohesion 0.35 — highly connected)
- 9 dependent types
- Legacy adapters: `fromRoomAnalysisLegacy()` / `toRoomAnalysisLegacy()`
- All hooks depend on this: `useRoomAnalysisFlow`, `useFurnitureRecommendation`

**What this tells you:**
- Schema changes are **high risk** — affects many hooks
- You MUST update legacy adapters to prevent saved results from breaking
- Test both modern format AND conversion from legacy format

**Copilot prompt:**
> "I'm changing RoomAnalysis schema. The graph shows this is a high-connectivity type with legacy compatibility adapters. Walk me through: 1) what changes in the type, 2) what changes in the legacy adapter, 3) what tests to write for both modern and legacy formats."

---

## 📊 Queries You Should Know

**Copy-paste these into the terminal when needed:**

### Understand a component
```bash
/graphify explain "ComponentName"
```

### Find all connections between two concepts
```bash
/graphify path "ConceptA" "ConceptB"
```

### See what connects to something
```bash
/graphify query "What touches [god node name]?"
```

### Trace a data flow
```bash
/graphify query "How does [input] transform into [output]?"
```

### Check a community
```bash
/graphify query "What's in the [community name] community?"
```

---

## 🛡️ Safety Checklist

**Use this every time you code:**

1. ✅ **Consulted the graph** before writing code
2. ✅ **Identified which god nodes** I'm touching
3. ✅ **Checked which hyperedges** might break
4. ✅ **Used a reference implementation** for validation patterns
5. ✅ **Tested the full pipeline** if I touched a hyperedge
6. ✅ **Verified type safety** (TypeScript compilation)
7. ✅ **Ran error cases** (not just happy path)
8. ✅ **No circular dependencies** introduced
9. ✅ **Response format unchanged** (API contracts)
10. ✅ **Ready for code review** (graph-aware PR description)

---

## 📈 Long-Term Benefits

By integrating the graph into your workflow:

✅ **Fewer bugs** — God nodes highlight risk areas  
✅ **Better code coverage** — Hyperedges show test scenarios  
✅ **Faster code review** — Context already in graph  
✅ **Easier onboarding** — New devs learn system structure  
✅ **Lower refactoring cost** — See all impacts before changing  
✅ **Copilot works better** — More structured context for AI  

---

## 🚀 Next Steps

1. **Bookmark these files:**
   - `graphify-out/GRAPH_REPORT.md` (reference constantly)
   - `.github/GRAPH_CHECKLIST.md` (before each task)
   - `graphify-out/graph.html` (explore relationships)

2. **Share with your team:**
   - Review the god nodes together
   - Discuss the critical hyperedges
   - Agree on validation patterns

3. **Keep the graph fresh:**
   - Run `/graphify --update` after big refactors
   - Review changes to god nodes before merging
   - Archive reports monthly to track evolution

4. **Improve Copilot accuracy:**
   - Always mention the graph in your prompts
   - Reference god nodes and hyperedges
   - Link to specific implementation patterns
