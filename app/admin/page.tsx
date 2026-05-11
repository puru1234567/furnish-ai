import Link from 'next/link'

export default function AdminPage() {
  return (
    <main className="min-h-screen px-6 py-24" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="mx-auto max-w-5xl rounded-[36px] border border-[rgba(181,138,82,0.16)] bg-[rgba(255,253,249,0.88)] p-10 shadow-[0_28px_70px_rgba(28,25,23,0.08)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--terracotta)]">Admin console</p>
        <h1 className="mt-4 text-5xl text-[var(--charcoal)]" style={{ fontFamily: 'var(--font-serif)' }}>
          Admin entry point is protected and ready.
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--warm-grey)]">
          Only admin-role users can reach this route. The console shell is in place so the next iteration can add vendor approvals, catalog moderation, and user management without reopening the auth architecture.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/account" className="btn-skip">Back to account</Link>
          <Link href="/find" className="btn-next">Open room read</Link>
        </div>
      </div>
    </main>
  )
}