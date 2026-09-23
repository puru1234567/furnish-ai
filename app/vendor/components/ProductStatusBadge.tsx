import { PRODUCT_STATUS_LABELS, type ProductStatus } from '@/lib/vendor/catalog'

export function ProductStatusBadge({ status }: { status: ProductStatus }) { return <span className={`product-status product-status-${status}`}>{PRODUCT_STATUS_LABELS[status]}</span> }