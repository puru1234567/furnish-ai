import Link from 'next/link'

export function ResubmitAction({ productId, status }: { productId: string; status: string }) { if (status !== 'rejected' && status !== 'vendor_fix_required') return null; return <Link href={`/vendor/products/${productId}/edit`} className="btn-next">Correct and resubmit</Link> }