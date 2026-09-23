export type CatalogValueType = 'text' | 'number' | 'boolean' | 'select' | 'multi_select'

export interface CatalogCategory { id: string; parentId: string | null; name: string; slug: string; description: string | null; sortOrder: number; isActive: boolean; archivedAt: string | null; createdAt: string; updatedAt: string }
export interface CatalogAttribute { id: string; name: string; slug: string; valueType: CatalogValueType; isRequired: boolean; allowedValues: string[]; validationRules: Record<string, unknown>; isActive: boolean; categoryIds: string[]; createdAt: string; updatedAt: string }
export interface CatalogRequirement { id: string; categoryId: string; fieldKey: string; label: string; isRequired: boolean; validationRules: Record<string, unknown>; sortOrder: number; isActive: boolean; createdAt: string; updatedAt: string }
export interface CatalogConfiguration { categories: CatalogCategory[]; attributes: CatalogAttribute[]; requirements: CatalogRequirement[] }

export const FALLBACK_CATEGORIES = ['Sofas', 'Beds', 'Tables', 'Chairs', 'Storage', 'Lighting', 'Decor']

export function getActiveCategories(configuration: CatalogConfiguration | null): CatalogCategory[] {
  return configuration?.categories.filter((category) => category.isActive && !category.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder) ?? FALLBACK_CATEGORIES.map((name, index) => ({ id: `fallback-${name.toLowerCase()}`, parentId: null, name, slug: name.toLowerCase(), description: null, sortOrder: index, isActive: true, archivedAt: null, createdAt: '', updatedAt: '' }))
}

export function validateConfiguredProduct(input: Record<string, unknown>, configuration: CatalogConfiguration): Record<string, string> {
  const errors: Record<string, string> = {}
  const category = String(input.category ?? '')
  const categoryRecord = configuration.categories.find((item) => item.name === category || item.slug === category)
  if (!categoryRecord || !categoryRecord.isActive || categoryRecord.archivedAt) errors.category = 'Choose an active catalog category.'
  const requirements = configuration.requirements.filter((item) => item.categoryId === categoryRecord?.id && item.isActive)
  const attributes = configuration.attributes.filter((attribute) => attribute.isActive && attribute.categoryIds.includes(categoryRecord?.id ?? ''))
  for (const requirement of requirements) {
    const value = input[requirement.fieldKey]
    if (requirement.isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) errors[requirement.fieldKey] = `${requirement.label} is required.`
  }
  for (const attribute of attributes) {
    const value = input[attribute.slug]
    if (attribute.isRequired && (value === undefined || value === null || value === '')) errors[attribute.slug] = `${attribute.name} is required.`
    if ((attribute.valueType === 'select' || attribute.valueType === 'multi_select') && attribute.allowedValues.length && value !== undefined) {
      const values = Array.isArray(value) ? value : [value]
      if (values.some((item) => !attribute.allowedValues.includes(String(item)))) errors[attribute.slug] = `${attribute.name} contains an invalid value.`
    }
  }
  return errors
}
