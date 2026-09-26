import { CatalogWorkspace } from './CatalogWorkspace'

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams
  return <CatalogWorkspace initialStatus={status === 'pending' ? 'pending' : ''} />
}
