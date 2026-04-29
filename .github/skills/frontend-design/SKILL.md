---
name: frontend-design
description: "Use when designing or redesigning UI, pages, layouts, components, animations, visual systems, or frontend interactions for FurnishAI. Creates distinctive, production-grade frontend interfaces with strong aesthetic direction and avoids generic AI-looking design."
---

# Frontend Design

Use this skill for visual design and frontend implementation tasks in FurnishAI, especially when working on result cards, page layouts, interactions, animations, filters, headers, mobile responsiveness, and component polish.

## Objective

Create distinctive, production-grade frontend interfaces that feel intentionally designed for the product rather than generic generated UI.

The goal is not decoration for its own sake. The goal is a cohesive interface with:
- clear visual hierarchy
- memorable details
- excellent usability
- strong spacing and typography discipline
- refined motion and interaction feedback

## Product Context

FurnishAI is a furniture recommendation product. Users come here to:
- describe a room and furniture need
- upload room images
- answer contextual follow-up questions
- review ranked recommendations
- compare, shortlist, save, and share products

The result should feel premium, trustworthy, warm, and design-aware.

## Current Technical Context

- Framework: Next.js App Router
- Language: TypeScript
- Styling: global CSS
- Existing typography: DM Serif Display + DM Sans
- Existing palette direction: terracotta, gold, moss, charcoal, sand

Preserve working functionality and accessibility while improving visual quality.

## Design Thinking Process

Before coding, choose a clear aesthetic direction.

Work through these questions:

1. Purpose
- What is the user trying to accomplish on this screen?
- What must feel obvious, fast, and confidence-inspiring?

2. Tone
- Choose one strong direction, not a mushy compromise.
- Suitable directions for this project include: luxury refined, editorial warm, modern organic, gallery-like, premium natural, high-end catalog.

3. Constraints
- Must remain responsive.
- Must remain accessible.
- Must not hurt performance.
- Must fit the current product architecture.

4. Differentiation
- Define one memorable visual idea per screen.
- Example: layered cards, refined catalog framing, tactile filter chips, elegant motion rhythm.

## Frontend Aesthetics Guidelines

### Typography
- Keep DM Serif Display for display moments where elegance matters.
- Keep DM Sans for body/UI copy.
- Use size, spacing, and weight with intention.
- Prefer stronger contrast in hierarchy over adding extra ornament.

### Color & Theme
- Use CSS variables consistently.
- Favor a dominant warm-neutral base with selective accents.
- Avoid generic purple-on-white AI aesthetics.
- Use color to clarify hierarchy, not to color every element equally.

### Motion
- Prefer CSS-based motion where practical.
- Use a few meaningful animations, not constant motion everywhere.
- Good candidates: page-load stagger, hover refinement, button feedback, sticky header transitions.
- Motion should reinforce structure and quality.

### Spatial Composition
- Avoid default dashboard sameness.
- Use asymmetry, overlap, intentional negative space, and card rhythm when useful.
- Balance expressive layout with clear scanning.

### Backgrounds & Detail
- Build atmosphere with subtle gradients, texture, soft shadow layering, border treatments, and depth.
- Use these lightly and consistently.
- Avoid gimmicks that overpower product clarity.

## Anti-Patterns

Do not produce:
- generic component-library-looking layouts
- overused AI visual tropes
- random purple gradients
- flat, characterless white cards everywhere
- too many competing accents
- excessive animation noise
- decorative complexity that hurts readability

## FurnishAI-Specific Guidance

When working in this repo:
- results pages should feel premium and editorial, not like a commodity ecommerce grid
- recommendation cards should have a stronger sense of hierarchy than filters
- filters should feel compact and useful, not visually heavier than results
- compare, wishlist, save, and share actions should feel integrated and polished
- mobile layouts should preserve clarity before visual flourish

## Implementation Requirements

Your output should be:
- production-ready code
- visually cohesive
- consistent with the current stack
- accessible and responsive
- minimal in scope unless a broader redesign is explicitly requested

When making changes, explain the aesthetic direction briefly, then implement working code.