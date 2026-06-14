export type AnalyticsEventName =
  | "search.query_submitted"
  | "search.refined"
  | "product.clicked"
  | "product.saved_toggled"
  | "product.compared_toggled"
  | "recommendation.engaged"
  | "session.scroll_depth"
  | "session.duration_reported"

export interface SearchQuerySubmittedPayload {
  query: string
  resultCount?: number
  source?: "hero" | "find" | "refinement" | "other"
}

export interface SearchRefinedPayload {
  previousQuery: string
  nextQuery: string
  refinementCount: number
}

export interface ProductClickedPayload {
  productId: string
  productName?: string
  position?: number
  listId?: string
}

export interface ProductSavedToggledPayload {
  productId: string
  saved: boolean
  location?: string
}

export interface ProductComparedToggledPayload {
  productId: string
  compared: boolean
  compareCount?: number
}

export interface RecommendationEngagedPayload {
  productId: string
  action: "expand_reasoning" | "collapse_reasoning" | "view_alternatives" | "view_details"
  section?: string
}

export interface ScrollDepthPayload {
  depthPercent: 25 | 50 | 75 | 100
  page: string
}

export interface SessionDurationPayload {
  durationMs: number
  page: string
}

export interface AnalyticsEventPayloadMap {
  "search.query_submitted": SearchQuerySubmittedPayload
  "search.refined": SearchRefinedPayload
  "product.clicked": ProductClickedPayload
  "product.saved_toggled": ProductSavedToggledPayload
  "product.compared_toggled": ProductComparedToggledPayload
  "recommendation.engaged": RecommendationEngagedPayload
  "session.scroll_depth": ScrollDepthPayload
  "session.duration_reported": SessionDurationPayload
}

export interface AnalyticsEventEnvelope<TName extends AnalyticsEventName = AnalyticsEventName> {
  eventName: TName
  payload: AnalyticsEventPayloadMap[TName]
  sessionId: string
  timestamp: string
  pagePath?: string
  userId?: string | null
}

export interface AnalyticsContext {
  sessionId: string
  userId?: string | null
}

export const ANALYTICS_EVENT_NAMES: ReadonlySet<string> = new Set<AnalyticsEventName>([
  "search.query_submitted",
  "search.refined",
  "product.clicked",
  "product.saved_toggled",
  "product.compared_toggled",
  "recommendation.engaged",
  "session.scroll_depth",
  "session.duration_reported",
])
