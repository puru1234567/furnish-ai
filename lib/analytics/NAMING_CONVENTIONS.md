# Analytics Naming Conventions

## Event naming

Use `domain.action` in lowercase snake-free dotted form.

Examples:
- `search.query_submitted`
- `search.refined`
- `product.clicked`
- `product.saved_toggled`
- `recommendation.engaged`
- `session.scroll_depth`

## Event payload conventions

- Use camelCase keys in payload JSON.
- Include stable IDs where possible (`productId`, `sessionId`).
- Avoid sending large strings and raw blobs.
- Keep payloads under 2 KB when possible.

## Required envelope fields

- `eventName`
- `sessionId`
- `timestamp` (ISO-8601)
- `payload`
- `pagePath` (recommended)
- `userId` (optional)

## Domain guidelines

- `search.*`: query lifecycle and refinements
- `product.*`: click/save/compare interactions
- `recommendation.*`: explainability and ranking engagement
- `session.*`: browsing depth and session quality indicators

## Versioning

If payload shape changes incompatibly, use one of:
- Add `payload.schemaVersion`
- Introduce a new event name suffix like `.v2`

## Privacy and performance

- Do not send secrets, tokens, or full personal addresses.
- Batch events to reduce network overhead.
- Use `sendBeacon` on pagehide to avoid blocking navigation.
