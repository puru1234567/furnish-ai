'use client'

import { useState } from 'react'
import type { ListingLifecycleAction, VendorProduct } from '@/lib/vendor/catalog'
import { ConfirmModal } from './ConfirmModal'

const consequences: Record<ListingLifecycleAction, { title: string; message: string; confirm: string }> = {
  activate: { title: 'Activate this listing?', message: 'Customers will be able to see and purchase this approved listing.', confirm: 'Activate listing' },
  deactivate: { title: 'Temporarily deactivate this listing?', message: 'The product will remain in your catalog, but customers will no longer see it as available. You can activate it again later.', confirm: 'Deactivate listing' },
  discontinue: { title: 'Mark this product discontinued?', message: 'This product will remain preserved for historical records but will no longer be treated as an active listing.', confirm: 'Mark discontinued' },
  archive: { title: 'Archive this listing?', message: 'The listing will be removed from active catalog work while all historical information is preserved. It will not be physically deleted.', confirm: 'Archive listing' },
  request_removal: { title: 'Request permanent removal?', message: 'This sends a removal request to the marketplace team. The product remains preserved until an authorized decision is made.', confirm: 'Request removal' },
  restore: { title: 'Restore this archived listing?', message: 'The listing will return as inactive. You can activate it again after confirming its details.', confirm: 'Restore listing' },
}

export function LifecycleActions({ product, onAction }: { product: VendorProduct; onAction: (action: ListingLifecycleAction) => Promise<void> }) { const [pending, setPending] = useState<ListingLifecycleAction | null>(null); const status = product.lifecycleStatus; const actions: ListingLifecycleAction[] = status === 'archived' ? ['restore'] : status === 'active' ? ['deactivate', 'discontinue', 'archive', 'request_removal'] : status === 'inactive' ? ['activate', 'discontinue', 'archive', 'request_removal'] : status === 'discontinued' ? ['archive', 'request_removal'] : status === 'removal_requested' ? ['archive'] : []; return <>{actions.length ? <div className="lifecycle-actions"><p className="vendor-eyebrow">Listing lifecycle</p><div>{actions.map((action) => <button type="button" className={action === 'archive' || action === 'request_removal' ? 'lifecycle-danger' : ''} key={action} onClick={() => setPending(action)}>{consequences[action].confirm}</button>)}</div></div> : null}{pending ? <ConfirmModal title={consequences[pending].title} message={consequences[pending].message} confirmLabel={consequences[pending].confirm} onCancel={() => setPending(null)} onConfirm={() => { const action = pending; setPending(null); void onAction(action) }} /> : null}</> }