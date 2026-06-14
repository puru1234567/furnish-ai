# Motion Architecture

This folder contains reusable motion primitives and timing tokens for Furnish AI.

## Principles

- Keep microinteractions between 120ms and 240ms.
- Use reveal motion between 280ms and 380ms.
- Reserve longer, deliberate transitions (~460ms) for modal-level context changes.
- Prefer slight vertical movement (`y: 8-18`) with minimal scale transforms.
- Pair motion with depth changes (shadow/blur) for premium feel.

## Recommended Timing System

- `instant`: 120ms for pressed state feedback
- `micro`: 180ms for hover transitions
- `swift`: 240ms for chips and small state flips
- `smooth`: 340ms for section and card reveals
- `deliberate`: 460ms for larger state transitions

## Reusable Primitives

- `Reveal`: viewport-based fade + rise reveal
- `StaggerReveal`: orchestrated child reveal hierarchy
- `LiftCard`: subtle hover/press card interaction
