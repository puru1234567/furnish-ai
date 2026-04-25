// lib/repositories/index.ts
// Repository exports

export type { IFurnitureRepository, FurnitureFilter } from './IFurnitureRepository'
export { InMemoryFurnitureRepository } from './InMemoryFurnitureRepository'
export { getFurnitureRepository, setFurnitureRepository, clearFurnitureRepository } from './repositoryFactory'
