# Backend Action Plan for FurnishAI

## 1. Move inventory to a real database (Supabase/Postgres)
- Design a normalized product table matching `FurnitureItem`.
- Write a migration script to load `furniture-data.ts` into the DB.
- Update `repositoryFactory` to support both in-memory and Supabase backends (feature flag).
- Implement a Supabase repository with the same `IFurnitureRepository` interface.

## 2. Split product data into structured fields + searchable text blob
- In DB schema, keep all current fields as columns.
- Add a `search_blob` column: concatenate name, description, tags, style, material, brand, warranty, etc.
- Update data loader to populate this field.

## 3. Push hard filtering out of the LLM path
- Refactor `filterAndRankItems` to ensure all hard constraints are applied before any LLM/semantic step.
- Add unit tests to verify no invalid items pass through.

## 4. Expand deterministic ranking before semantic retrieval
- Move as much scoring logic as possible from prompts into code (pain boost, style overlap, rating, price fit).
- Make the LLM prompt only about soft intent and explanation.

## 5. Add embeddings for soft-intent matching
- Integrate a text embedding model (OpenAI, HuggingFace, or Supabase’s built-in).
- Store embeddings for each product’s `search_blob`.
- At query time, embed the user’s intent and run vector search on the filtered set.

## 6. Prefer hybrid retrieval over pure vector retrieval
- Combine SQL filters, keyword/BM25 search on `search_blob`, and vector similarity.
- Use reciprocal rank fusion or similar to merge results.

## 7. Shrink the LLM role
- Only send the top 8–12 candidates to the LLM for reranking or explanation.
- Make the LLM output optional for cost control.

## 8. Add evaluation before tuning
- Create a test harness: 30–50 sample user queries, expected good results.
- Log recall, relevance, token cost, and latency for each pipeline stage.

## 9. Standardize request validation and error shape
- Use your `validation.ts` and `dtos.ts` in every route.
- Return consistent `ApiResponse<T>` shapes everywhere.

## 10. Add caching
- Cache room analysis by image hash.
- Cache question generation by room-analysis hash.
- Cache recommendations by normalized user context.

---

This plan is tailored for your current state (in-memory data, no real vendor ingestion yet) and will evolve as you add real data and scale up.
