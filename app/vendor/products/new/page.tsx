'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserRole } from '@/lib/supabase/roles'
import { createEmptyProductInput, validateProduct, vendorCatalogService, type ProductInput } from '@/lib/vendor/catalog'
import { ProductForm } from '../../components/ProductForm'

export default function NewProductPage() { const [vendorId, setVendorId] = useState<string | null>(null); const [error, setError] = useState(''); useEffect(() => { void createClient().auth.getUser().then(({ data: { user } }) => { if (user && (getUserRole(user) === 'vendor' || getUserRole(user) === 'admin')) setVendorId(user.id) }) }, []); async function save(input: ProductInput) { const errors = validateProduct(input); if (Object.keys(errors).length) { setError(Object.values(errors)[0]); return } if (!vendorId) return; await vendorCatalogService.create(vendorId, input); window.location.href = '/vendor/products' } return <main className="vendor-page"><header className="vendor-header"><Link href="/vendor/products" className="logo logo-active">Furnish<span>AI</span></Link><span className="vendor-header-label">New product</span></header><div className="product-editor-shell"><div className="product-editor-heading"><p className="vendor-eyebrow">Catalog / New product</p><h1>Add a product</h1><p>Save as a draft first. Submission always enters the approval workflow.</p></div>{error ? <div className="catalog-feedback catalog-feedback-error" role="alert">{error}</div> : null}<ProductForm initialValue={createEmptyProductInput()} submitLabel="Save draft" onSubmit={save} /></div></main> }