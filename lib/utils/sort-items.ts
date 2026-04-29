import type { RecommendedItem } from '@/lib/types'

export type SortOption = 'relevance' | 'price-low' | 'price-high' | 'rating' | 'durability'

export interface SortConfig {
  value: SortOption
  label: string
}

export const SORT_OPTIONS: SortConfig[] = [
  { value: 'relevance', label: 'Best Match' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Rating: High to Low' },
  { value: 'durability', label: 'Durability Score' },
]

export function sortRecommendations(items: RecommendedItem[], sortBy: SortOption): RecommendedItem[] {
  const sorted = [...items]
  switch (sortBy) {
    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price)
    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price)
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    case 'durability':
      return sorted.sort((a, b) => b.durabilityScore - a.durabilityScore)
    case 'relevance':
    default:
      return sorted.sort((a, b) => b.score - a.score)
  }
}
