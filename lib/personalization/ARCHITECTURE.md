# Furnish AI Personalization Engine

## 1) System Architecture

### Components

1. Event Collection Layer
- Collects click/save/compare/search/refinement/dwell signals through `lib/analytics`.
- Emits typed events into `analytics_events_v2`.

2. Signal Normalization Layer
- Maps raw analytics events into personalization signals via `toPersonalizationSignal`.
- Removes noisy events and standardizes dimensions (`category`, `styleTags`, `price`, `roomSizeSqft`).

3. Taste Profile Service
- Maintains per-user `taste_profiles` (style, budget, room, color, category affinity).
- Updates profile incrementally as new signals arrive.

4. Personalization Scoring Layer
- Combines base model score with taste-profile signal score.
- Dynamically adjusts personalization influence by profile confidence.

5. Retrieval + Rerank Layer
- Stage A: Candidate retrieval (existing pipeline).
- Stage B: AI/base ranking score.
- Stage C: Personalization rerank with explainable score breakdown.

6. Feedback Loop
- User interactions after rerank become new behavioral events.
- Profile updates become progressively stronger over time.

## 2) Recommendation Scoring Logic

`finalScore = baseModelScore * (1 - pWeight) + personalizedComposite * pWeight`

Where:
- `pWeight` = confidence-weighted personalization weight (0.12 -> 0.45)
- `personalizedComposite` = weighted sum of:
  - style compatibility
  - budget fit
  - room fit
  - color affinity
  - category affinity
  - behavior boost

## 3) Behavioral Weighting Strategy

Signal importance:
- click = 1.0
- search = 1.0
- search_refined = 1.2
- dwell = 1.5
- compare = 2.0
- save = 3.0

Rationale:
- Saves and compares represent deliberate preference.
- Dwell indicates latent intent quality.
- Refinements show precision-seeking behavior.

## 4) Personalization Flow

1. User interacts with recommendations and search.
2. Analytics events are batched and stored.
3. Events are normalized into personalization signals.
4. Taste profile is updated incrementally.
5. Future recommendation requests pull latest profile.
6. Scoring layer reranks candidates with profile-aware boost.
7. Explainability UI can display profile-driven reasons.

## 5) Future-Ready Vector Integration Plan

### Phase 1: Scalar profile + JSON affinity (implemented)
- Keep explicit dimensions interpretable and debuggable.

### Phase 2: Query and product embeddings
- Add `query_embedding` and `profile_embedding` vectors.
- Blend similarity score with scalar profile score.

### Phase 3: Multi-vector profile memory
- Separate vectors for style, budget sensitivity, and room preference.
- Retrieve nearest preference memories for session-aware adaptation.

### Phase 4: Online learning
- Introduce contextual bandit exploration with safety constraints.
- Use long-term retention and conversion as delayed rewards.

## 6) Operational Notes

- Recompute profile confidence nightly from trailing 30-day events.
- Decay stale signals to avoid old preference lock-in.
- Keep profile update idempotent for reprocessing pipelines.
- Version profile schema (`profileVersion`) for migrations.
