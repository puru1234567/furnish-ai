import { redirect } from 'next/navigation'
import { isAuthEnabled } from '@/lib/config/auth-config'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  if (!isAuthEnabled()) {
    redirect('/')
  }

  const params = await searchParams
  const query = new URLSearchParams({ auth: 'login' })

  if (params.redirectTo) {
    query.set('next', params.redirectTo)
  }

  redirect(`/?${query.toString()}`)
}
