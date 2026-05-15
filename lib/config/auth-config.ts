const authEnabledEnv = process.env.NEXT_PUBLIC_AUTH_ENABLED

export function isAuthEnabled(): boolean {
  return authEnabledEnv !== 'false'
}
