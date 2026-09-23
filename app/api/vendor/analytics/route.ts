import { NextRequest, NextResponse } from 'next/server'
import { requireVendor } from '@/lib/api/vendor-auth'
import type { AnalyticsDateRange, ProductPerformance } from '@/lib/vendor/analytics'

function rangeFor(key: AnalyticsDateRange) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - Number(key.replace('d', '')) + 1)
  return { key, from: from.toISOString(), to: to.toISOString() }
}

export async function GET(request: NextRequest) {
  const auth = await requireVendor(); if ('response' in auth) return auth.response
  const rangeKey = (request.nextUrl.searchParams.get('range') ?? '30d') as AnalyticsDateRange
  const range = rangeFor(['7d', '30d', '90d'].includes(rangeKey) ? rangeKey : '30d')
  const { data: products, error: productError } = await auth.supabase.from('vendor_products').select('id, name, sku, status, lifecycle_status').eq('vendor_id', auth.user.id)
  if (productError) return NextResponse.json({ error: 'Unable to load vendor analytics.' }, { status: 500 })
  const productIds = (products ?? []).map((product) => product.id)
  const { data: engagements, error: engagementError } = productIds.length
    ? await auth.supabase.from('analytics_recommendation_engagement').select('product_id, action, created_at').in('product_id', productIds).gte('created_at', range.from).lte('created_at', range.to)
    : { data: [], error: null }
  if (engagementError) return NextResponse.json({ error: 'Unable to load vendor analytics.' }, { status: 500 })

  const rows = products ?? []
  const events = engagements ?? []
  const performance: ProductPerformance[] = rows.map((product) => {
    const productEvents = events.filter((event) => event.product_id === product.id)
    const views = productEvents.filter((event) => ['view', 'product.viewed', 'impression'].includes(event.action)).length
    const clicks = productEvents.filter((event) => ['click', 'product.clicked'].includes(event.action)).length
    return { productId: product.id, productName: product.name, sku: product.sku, views, clicks, enquiries: 0, conversionRate: null }
  }).filter((product) => product.views > 0 || product.clicks > 0).sort((a, b) => b.clicks - a.clicks)

  const counts = { totalProducts: rows.length, activeProducts: rows.filter((item) => item.lifecycle_status === 'active').length, approvedProducts: rows.filter((item) => item.status === 'approved').length, pendingProducts: rows.filter((item) => ['submitted', 'under_review', 'resubmitted'].includes(item.status)).length, rejectedProducts: rows.filter((item) => ['rejected', 'vendor_fix_required'].includes(item.status)).length }
  const productViews = performance.reduce((sum, product) => sum + product.views, 0)
  const productClicks = performance.reduce((sum, product) => sum + product.clicks, 0)
  return NextResponse.json({ range, kpis: { ...counts, productViews: productViews || null, productClicks: productClicks || null, enquiries: null, conversionRate: null }, trend: [], topProducts: performance.slice(0, 10), poorProducts: performance.slice(-10).reverse(), availableMetrics: ['totalProducts', 'activeProducts', 'approvedProducts', 'pendingProducts', 'rejectedProducts', ...(productViews || productClicks ? ['productViews', 'productClicks'] : [])], unavailableMetrics: ['enquiries', 'conversionRate', 'trend'] })
}
