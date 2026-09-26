'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { AdminProduct, CatalogListResult, AdminProductStatus } from '@/lib/admin/catalog'

type CatalogFilterStatus = AdminProductStatus | 'pending' | ''

const statuses: Array<[CatalogFilterStatus, string]> = [
  ['', 'All statuses'],
  ['pending', 'Awaiting moderation'],
  ['draft', 'Draft'],
  ['submitted', 'Submitted'],
  ['under_review', 'Under review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['published', 'Published'],
  ['inactive', 'Inactive'],
  ['archived', 'Archived'],
]

function label(value: string) {
  return value.replaceAll('_', ' ')
}

function date(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function CatalogWorkspace({ initialStatus = '' }: { initialStatus?: CatalogFilterStatus }) {
  const [result, setResult] = useState<CatalogListResult | null>(null)
  const [search, setSearch] = useState('')
  const [sku, setSku] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<CatalogFilterStatus>(initialStatus)
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('updated_desc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search,
        sku,
        vendorId,
        category,
        status,
        createdFrom,
        createdTo,
        minPrice,
        maxPrice,
        sort,
        page: String(page),
        pageSize: '20',
      })
      const response = await fetch(`/api/admin/catalog?${params}`)
      const data = (await response.json()) as CatalogListResult & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Unable to load catalog.')
      setResult(data)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load catalog.')
    } finally {
      setLoading(false)
    }
  }, [category, createdFrom, createdTo, maxPrice, minPrice, page, search, sku, sort, status, vendorId])

  useEffect(() => {
    void load()
  }, [load])

  function resetPage<T>(setter: (value: T) => void, value: T) {
    setPage(1)
    setter(value)
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/admin" className="logo logo-active">
          Furnish<span>AI</span>
        </Link>
        <nav>
          <Link href="/admin" className="admin-nav-link">
            Dashboard
          </Link>
          <Link href="/admin/vendors" className="admin-nav-link">
            Vendors
          </Link>
          <span className="admin-role-chip">Catalog</span>
        </nav>
      </header>

      <div className="admin-shell">
        <section className="admin-hero admin-hero-compact">
          <div>
            <p className="admin-eyebrow">Admin portal / Phase 04</p>
            <h1>Platform catalog.</h1>
            <p>
              Moderate product information across every vendor while keeping approval and publication
              rules explicit.
            </p>
          </div>
        </section>

        <section className="admin-catalog-filters">
          <label>
            <span>Search</span>
            <input
              value={search}
              onChange={(event) => resetPage(setSearch, event.target.value)}
              placeholder="Product name or description"
            />
          </label>
          <label>
            <span>SKU</span>
            <input
              value={sku}
              onChange={(event) => resetPage(setSku, event.target.value)}
              placeholder="SKU"
            />
          </label>
          <label>
            <span>Vendor</span>
            <select value={vendorId} onChange={(event) => resetPage(setVendorId, event.target.value)}>
              <option value="">All vendors</option>
              {result?.vendors.map((vendor) => (
                <option value={vendor.id} key={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={(event) => resetPage(setCategory, event.target.value)}>
              <option value="">All categories</option>
              {result?.categories.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => resetPage(setStatus, event.target.value as AdminProductStatus | '')}
            >
              {statuses.map(([value, text]) => (
                <option value={value} key={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="updated_desc">Recently updated</option>
              <option value="created_desc">Recently created</option>
              <option value="price_asc">Price low-high</option>
              <option value="price_desc">Price high-low</option>
              <option value="name_asc">Name A-Z</option>
            </select>
          </label>
          <label>
            <span>Created from</span>
            <input
              type="date"
              value={createdFrom}
              onChange={(event) => resetPage(setCreatedFrom, event.target.value)}
            />
          </label>
          <label>
            <span>Created to</span>
            <input
              type="date"
              value={createdTo}
              onChange={(event) => resetPage(setCreatedTo, event.target.value)}
            />
          </label>
          <label>
            <span>Min price</span>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => resetPage(setMinPrice, event.target.value)}
            />
          </label>
          <label>
            <span>Max price</span>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => resetPage(setMaxPrice, event.target.value)}
            />
          </label>
        </section>

        {error ? (
          <div className="admin-config-notice admin-config-error" role="alert">
            {error}
          </div>
        ) : null}

        <section className="admin-panel admin-vendor-table-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="admin-eyebrow">Global product list</p>
              <h2>{result ? `${result.total} products` : 'Catalog records'}</h2>
            </div>
            <span className="admin-data-note">Server-side filters</span>
          </div>

          {loading ? (
            <p className="admin-empty">Loading products...</p>
          ) : result?.items.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product / SKU</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Inventory</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((product) => (
                    <ProductRow product={product} key={product.id} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-empty">No products match the current filters.</p>
          )}

          <div className="admin-pagination">
            <button
              type="button"
              className="admin-button admin-button-secondary"
              disabled={!result || page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span>{result ? `Page ${result.page} of ${result.totalPages}` : 'Page —'}</span>
            <button
              type="button"
              className="admin-button admin-button-secondary"
              disabled={!result || page >= result.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

function ProductRow({ product }: { product: AdminProduct }) {
  return (
    <tr>
      <td>
        <Link href={`/admin/catalog/${product.id}`} className="admin-table-primary">
          {product.name}
        </Link>
        <span className="admin-table-secondary">{product.sku}</span>
      </td>
      <td>{product.vendorName}</td>
      <td>{product.category}</td>
      <td>₹{product.price.toLocaleString()}</td>
      <td>{product.stock}</td>
      <td>
        <span className={`admin-status admin-status-${product.status}`}>{label(product.status)}</span>
      </td>
      <td>{date(product.createdAt)}</td>
      <td>{date(product.updatedAt)}</td>
      <td>
        <Link href={`/admin/catalog/${product.id}`} className="admin-text-link">
          View
        </Link>
      </td>
    </tr>
  )
}
