'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { VendorAnalytics, ProductAnalytics, OperationalAnalytics } from '@/lib/admin/analytics'

function label(value: string) { return value.replaceAll('_', ' ').replace(/([A-Z])/g, ' $1').toLowerCase() }
function todayIso(daysAgo: number) { const date = new Date(); date.setDate(date.getDate() - daysAgo); return date.toISOString().slice(0, 10) }
function BarRow({ name, value, max }: { name: string; value: number; max: number }) { return <div className="admin-bar-row"><span className="admin-bar-label">{name}</span><div className="admin-bar-track"><span className="admin-bar-fill" style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }} /></div><strong>{value}</strong></div> }

export function AnalyticsWorkspace() {
  const [dateFrom, setDateFrom] = useState(todayIso(30)); const [dateTo, setDateTo] = useState(todayIso(0)); const [vendorId, setVendorId] = useState(''); const [category, setCategory] = useState('')
  const [vendorData, setVendorData] = useState<VendorAnalytics | null>(null); const [productData, setProductData] = useState<ProductAnalytics | null>(null); const [operationalData, setOperationalData] = useState<OperationalAnalytics | null>(null)
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ dateFrom: new Date(dateFrom).toISOString(), dateTo: new Date(dateTo).toISOString() })
      const productParams = new URLSearchParams(params); if (vendorId) productParams.set('vendorId', vendorId); if (category) productParams.set('category', category)
      const [vendorsRes, productsRes, operationsRes] = await Promise.all([
        fetch(`/api/admin/analytics/vendors?${params}`), fetch(`/api/admin/analytics/products?${productParams}`), fetch(`/api/admin/analytics/operations?${params}`),
      ])
      const [vendors, products, operations] = await Promise.all([vendorsRes.json(), productsRes.json(), operationsRes.json()])
      if (!vendorsRes.ok) throw new Error(vendors.error || 'Unable to load vendor analytics.')
      if (!productsRes.ok) throw new Error(products.error || 'Unable to load product analytics.')
      if (!operationsRes.ok) throw new Error(operations.error || 'Unable to load operational analytics.')
      setVendorData(vendors); setProductData(products); setOperationalData(operations); setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load analytics.') } finally { setLoading(false) }
  }, [category, dateFrom, dateTo, vendorId])
  useEffect(() => { void load() }, [load])

  const exportUrl = (dataset: 'vendors' | 'products' | 'operations') => { const params = new URLSearchParams({ dataset, dateFrom: new Date(dateFrom).toISOString(), dateTo: new Date(dateTo).toISOString() }); if (vendorId) params.set('vendorId', vendorId); if (category) params.set('category', category); return `/api/admin/analytics/export?${params}` }
  const categoryMax = Math.max(1, ...(productData?.byCategory ?? []).map((item) => item.product_count))
  const vendorMax = Math.max(1, ...(productData?.byVendor ?? []).map((item) => item.total_products))

  return <main className="admin-page"><header className="admin-header"><Link href="/admin" className="logo logo-active">Furnish<span>AI</span></Link><nav><Link href="/admin" className="admin-nav-link">Dashboard</Link><Link href="/admin/audit" className="admin-nav-link">Audit center</Link><span className="admin-role-chip">Analytics</span></nav></header><div className="admin-shell">
    <section className="admin-hero admin-hero-compact"><div><p className="admin-eyebrow">Admin portal / Phase 10</p><h1>Platform analytics.</h1><p>Vendor, catalog, and operational metrics computed directly from live platform data.</p></div></section>
    <section className="admin-filter-bar"><label><span>From</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label><span>To</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><label><span>Vendor</span><select value={vendorId} onChange={(event) => setVendorId(event.target.value)}><option value="">All vendors</option>{(productData?.byVendor ?? []).map((vendor) => <option value={vendor.vendor_id} key={vendor.vendor_id}>{vendor.vendor_name}</option>)}</select></label><label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{(productData?.byCategory ?? []).map((item) => <option value={item.category} key={item.category}>{item.category}</option>)}</select></label></section>
    {error ? <div className="admin-config-notice admin-config-error" role="alert">{error}</div> : null}
    {loading ? <p className="admin-empty">Loading analytics...</p> : <>
      <section className="admin-section"><div className="admin-section-heading"><div><p className="admin-eyebrow">Vendor analytics</p><h2>Vendor health</h2></div><Link href={exportUrl('vendors')} className="admin-button admin-button-secondary">Export CSV</Link></div>
        <div className="admin-metric-groups"><div className="admin-metric-group"><h3>Vendors</h3><div className="admin-metric-grid">{Object.entries(vendorData?.metrics ?? {}).map(([key, value]) => <article className="admin-metric-card" key={key}><span>{label(key)}</span><strong>{value}</strong></article>)}</div></div></div>
        <div className="admin-panel admin-panel-wide"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Vendor performance</p><h2>Top vendors by catalog size</h2></div></div>{vendorData?.vendors.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Vendor</th><th>Products</th><th>Approved</th><th>Active listings</th><th>New in range</th><th>Last activity</th></tr></thead><tbody>{vendorData.vendors.map((vendor) => <tr key={vendor.vendor_id}><td>{vendor.vendor_name}</td><td>{vendor.total_products}</td><td>{vendor.approved_products}</td><td>{vendor.active_listings}</td><td>{vendor.new_products}</td><td>{vendor.last_activity ? new Date(vendor.last_activity).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No vendor catalog activity recorded yet.</p>}</div>
      </section>
      <section className="admin-section"><div className="admin-section-heading"><div><p className="admin-eyebrow">Product analytics</p><h2>Catalog composition</h2></div><Link href={exportUrl('products')} className="admin-button admin-button-secondary">Export CSV</Link></div>
        <div className="admin-metric-groups"><div className="admin-metric-group"><h3>Products</h3><div className="admin-metric-grid">{Object.entries(productData?.metrics ?? {}).map(([key, value]) => <article className="admin-metric-card" key={key}><span>{label(key)}</span><strong>{value}</strong></article>)}</div></div></div>
        <div className="admin-content-grid"><div className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">By category</p><h2>Products per category</h2></div></div>{productData?.byCategory.length ? <div className="admin-bar-chart">{productData.byCategory.map((item) => <BarRow name={item.category} value={item.product_count} max={categoryMax} key={item.category} />)}</div> : <p className="admin-empty">No categories recorded.</p>}</div><div className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">By vendor</p><h2>Products per vendor</h2></div></div>{productData?.byVendor.length ? <div className="admin-bar-chart">{productData.byVendor.slice(0, 10).map((item) => <BarRow name={item.vendor_name} value={item.total_products} max={vendorMax} key={item.vendor_id} />)}</div> : <p className="admin-empty">No vendor catalog data.</p>}</div></div>
        <div className="admin-panel admin-panel-wide"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Catalog growth</p><h2>Products created per day</h2></div></div>{productData?.growth.length ? <div className="admin-bar-chart">{productData.growth.map((item) => <BarRow name={item.period} value={item.product_count} max={Math.max(1, ...productData.growth.map((row) => row.product_count))} key={item.period} />)}</div> : <p className="admin-empty">No catalog growth recorded in this range.</p>}</div>
      </section>
      <section className="admin-section"><div className="admin-section-heading"><div><p className="admin-eyebrow">Operational analytics</p><h2>Platform operations</h2></div><Link href={exportUrl('operations')} className="admin-button admin-button-secondary">Export CSV</Link></div>
        <div className="admin-metric-groups"><div className="admin-metric-group"><h3>Operations</h3><div className="admin-metric-grid">{Object.entries(operationalData?.metrics ?? {}).map(([key, value]) => <article className="admin-metric-card" key={key}><span>{label(key)}</span><strong>{value}</strong></article>)}</div></div></div>
        <div className="admin-content-grid"><div className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Support</p><h2>Tickets by status</h2></div></div><div className="admin-bar-chart">{Object.entries(operationalData?.ticketsByStatus ?? {}).map(([key, value]) => <BarRow name={label(key)} value={value} max={Math.max(1, ...Object.values(operationalData?.ticketsByStatus ?? {}))} key={key} />)}</div></div><div className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Documents</p><h2>Verification status</h2></div></div><div className="admin-bar-chart">{Object.entries(operationalData?.documentsByStatus ?? {}).map(([key, value]) => <BarRow name={label(key)} value={value} max={Math.max(1, ...Object.values(operationalData?.documentsByStatus ?? {}))} key={key} />)}</div></div></div>
      </section>
    </>}
  </div></main>
}
