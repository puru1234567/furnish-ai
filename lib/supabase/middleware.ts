import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthEnabled } from '@/lib/config/auth-config'

export async function updateSession(request: NextRequest) {
  const authEnabled = isAuthEnabled()

  if (!authEnabled) {
    const { pathname } = request.nextUrl
    const authDisabledRedirectRoutes = ['/account', '/vendor', '/admin', '/login', '/signup']
    const shouldRedirectHome = authDisabledRedirectRoutes.some(route => pathname.startsWith(route))

    if (shouldRedirectHome) {
      return NextResponse.redirect(new URL('/', request.nextUrl.origin))
    }

    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for SSR
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Routes requiring authentication
  const protectedRoutes = ['/find', '/result', '/account']
  // Routes requiring admin role
  const adminRoutes = ['/admin']
  // Routes requiring vendor role
  const vendorRoutes = ['/vendor']

  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))
  const isAdmin = adminRoutes.some(r => pathname.startsWith(r))
  const isVendor = vendorRoutes.some(r => pathname.startsWith(r))

  if (!user && (isProtected || isAdmin || isVendor)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('auth', 'login')
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (isAdmin || isVendor)) {
    const role = (user.app_metadata?.role as string) ?? ''
    if (isAdmin && role !== 'admin') {
      return NextResponse.redirect(new URL('/find', request.nextUrl.origin))
    }
    if (isVendor && role !== 'vendor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/find', request.nextUrl.origin))
    }
  }

  return supabaseResponse
}
