import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const params = await searchParams
  const query = new URLSearchParams({ auth: 'login' })

  if (params.redirectTo) {
    query.set('next', params.redirectTo)
  }

  redirect(`/?${query.toString()}`)
}
