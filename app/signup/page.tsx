import { redirect } from 'next/navigation'
import { isAuthEnabled } from '@/lib/config/auth-config'

export default function SignupPage() {
  if (!isAuthEnabled()) {
    redirect('/')
  }

  redirect('/?auth=signup')
}
