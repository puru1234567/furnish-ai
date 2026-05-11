import Link from 'next/link'

export default function VendorPage() {
  return (
    <main className="min-h-screen px-6 py-24" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="mx-auto max-w-5xl rounded-[36px] border border-[rgba(181,138,82,0.16)] bg-[rgba(255,253,249,0.88)] p-10 shadow-[0_28px_70px_rgba(28,25,23,0.08)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--terracotta)]">Vendor studio</p>
        <h1 className="mt-4 text-5xl text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-serif)' }}>
          Vendor portal shell is live.
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--warm-grey)]">
          This route is now role-protected. Vendors and admins can enter here; shopper accounts cannot. Next step is wiring catalog ingestion, source management, and upload jobs.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/account" className="btn-skip">Back to account</Link>
          <Link href="/find" className="btn-next">Open room read</Link>
        </div>
      </div>
    </main>
  )
}