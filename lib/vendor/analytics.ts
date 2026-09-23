export type AnalyticsDateRange = '7d' | '30d' | '90d'
export interface AnalyticsRange { key: AnalyticsDateRange; from: string; to: string }
export interface AnalyticsKpis { totalProducts: number; activeProducts: number; approvedProducts: number; pendingProducts: number; rejectedProducts: number; productViews: number | null; productClicks: number | null; enquiries: number | null; conversionRate: number | null }
export interface AnalyticsPoint { date: string; views: number; clicks: number; enquiries: number }
export interface ProductPerformance { productId: string; productName: string; sku: string; views: number; clicks: number; enquiries: number; conversionRate: number | null }
export interface VendorAnalyticsDashboard { range: AnalyticsRange; kpis: AnalyticsKpis; trend: AnalyticsPoint[]; topProducts: ProductPerformance[]; poorProducts: ProductPerformance[]; availableMetrics: string[]; unavailableMetrics: string[] }
export interface VendorAnalyticsService { getDashboard(vendorId: string, range: AnalyticsDateRange): Promise<VendorAnalyticsDashboard>; exportPerformance(vendorId: string, range: AnalyticsDateRange): Promise<void> }

function getRange(key: AnalyticsDateRange): AnalyticsRange { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - Number(key.replace('d', '')) + 1); return { key, from: from.toISOString(), to: to.toISOString() } }
export const vendorAnalyticsService: VendorAnalyticsService = {
	async getDashboard(_vendorId, rangeKey) {
		const response = await fetch(`/api/vendor/analytics?range=${rangeKey}`)
		if (!response.ok) throw new Error('Unable to load vendor analytics.')
		return response.json() as Promise<VendorAnalyticsDashboard>
	},
	async exportPerformance(vendorId, rangeKey) {
		const dashboard = await this.getDashboard(vendorId, rangeKey)
		const rows = [['product_id', 'product_name', 'sku', 'views', 'clicks', 'enquiries', 'conversion_rate'], ...dashboard.topProducts.map((product) => [product.productId, product.productName, product.sku, product.views, product.clicks, product.enquiries, product.conversionRate ?? ''])]
		const blob = new Blob([rows.map((row) => row.map((value) => JSON.stringify(value)).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
		const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `vendor-performance-${rangeKey}.csv`; link.click(); URL.revokeObjectURL(url)
	},
}