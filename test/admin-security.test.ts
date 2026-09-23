import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { getAdminRole, hasAdminPermission } from '../lib/admin/authorization'

const root = new URL('../', import.meta.url)
async function source(path: string) { return readFile(new URL(path, root), 'utf8') }

const adminRoles = ['super_admin', 'platform_admin', 'vendor_admin', 'catalog_admin', 'support_admin', 'analytics_admin'] as const

test('admin role resolution fails closed for missing and unknown admin_role', () => {
  assert.equal(getAdminRole({ app_metadata: { role: 'admin' } }), null)
  assert.equal(getAdminRole({ app_metadata: { role: 'admin', admin_role: 'unknown' } }), null)
})

test('valid platform and super admin roles receive expected permissions', () => {
  const platform = getAdminRole({ app_metadata: { role: 'admin', admin_role: 'platform_admin' } })
  const superAdmin = getAdminRole({ app_metadata: { role: 'admin', admin_role: 'super_admin' } })
  assert.equal(platform, 'platform_admin')
  assert.equal(superAdmin, 'super_admin')
  assert.equal(hasAdminPermission(platform, 'manage_vendors'), true)
  assert.equal(hasAdminPermission(superAdmin, 'settings.manage'), true)
})

test('non-admin identities cannot resolve to an Admin role', () => {
  assert.equal(getAdminRole({ app_metadata: { role: 'user', admin_role: 'super_admin' } }), null)
  assert.equal(getAdminRole({ app_metadata: { role: 'vendor', admin_role: 'platform_admin' } }), null)
})

test('supported Admin roles are represented in the authorization map', async () => {
  const authorization = await source('lib/admin/authorization.ts')
  for (const role of adminRoles) assert.match(authorization, new RegExp(`${role}:`))
})

test('Admin API services retain server-side permission gates', async () => {
  const services = ['lib/admin/vendors.ts', 'lib/admin/catalog.ts', 'lib/admin/marketplace-controls.ts', 'lib/admin/user-management.ts', 'lib/admin/integrations.ts', 'lib/admin/bulk-operations.ts']
  for (const file of services) assert.match(await source(file), /requireAdmin\(/)
})

test('representative Admin API routes delegate to protected services', async () => {
  const routes = [
    'app/api/admin/vendors/route.ts', 'app/api/admin/catalog/route.ts', 'app/api/admin/onboarding/route.ts',
    'app/api/admin/users/route.ts', 'app/api/admin/integrations/route.ts', 'app/api/admin/bulk/route.ts',
  ]
  for (const file of routes) assert.match(await source(file), /from ['"]@?\/?.*lib\/admin\//)
})

test('vendor status validates vendor ownership and consequential reasons', async () => {
  const code = await source('lib/admin/vendors.ts')
  assert.match(code, /targetProfile\.role !== 'vendor'/)
  assert.match(code, /STATUSES_REQUIRING_REASON/)
  assert.match(code, /trimmedReason/)
})

test('user status scopes Super Admin requirement to admin targets', async () => {
  const code = await source('lib/admin/user-management.ts')
  assert.match(code, /target\.role === 'admin' && role !== 'super_admin'/)
  assert.doesNotMatch(code, /if \(status === 'active' && role !== 'super_admin'\)/)
})

test('Admin role assignment has no internal authorization bypass', async () => {
  const code = await source('lib/admin/user-management.ts')
  assert.match(code, /assignAdminRole\(userId: string, roleKey: AdminRole\)/)
  assert.doesNotMatch(code, /assignAdminRole\(userId: string, roleKey: AdminRole, internal/)
  assert.match(code, /if \(!isSuperAdmin\(role\)\)/)
})

test('role escalation paths require explicit Super Admin authorization', async () => {
  const userManagement = await source('lib/admin/user-management.ts')
  const roleRoute = await source('app/api/admin/users/[userId]/roles/route.ts')
  const remediation = await source('lib/db/admin-security-remediation-phase1-schema.sql')
  assert.match(userManagement, /input\.type === 'admin' && !isSuperAdmin\(role\)/)
  assert.match(userManagement, /if \(!isSuperAdmin\(role\)\) throw new Error\('SUPER_ADMIN_REQUIRED'\)/)
  assert.match(roleRoute, /ADMIN_ROLES\.includes/)
  assert.match(remediation, /auth\.uid\(\) is not null/)
})

test('roles API validates Admin and vendor roles at runtime', async () => {
  const route = await source('app/api/admin/users/[userId]/roles/route.ts')
  assert.match(route, /ADMIN_ROLES\.includes/)
  assert.match(route, /VENDOR_USER_ROLES\.includes/)
  assert.doesNotMatch(route, /as never/)
})

test('category editing requires an active configured category', async () => {
  const code = await source('lib/admin/catalog.ts')
  assert.match(code, /getCatalogConfiguration\(\)/)
  assert.match(code, /!category\.isActive \|\| category\.archivedAt/)
  assert.match(code, /INVALID_PRODUCT_CATEGORY/)
})

test('audit vendor filter validates UUID before PostgREST interpolation', async () => {
  const code = await source('lib/admin/audit.ts')
  assert.match(code, /assertUuid\(filter\.vendorId\)/)
  assert.match(code, /INVALID_VENDOR_ID/)
})

test('bulk job inspection derives permission from operation', async () => {
  const code = await source('lib/admin/bulk-operations.ts')
  assert.match(code, /permission\(job\.operation as BulkOperation\)/)
  assert.match(code, /manage_vendors/)
  assert.match(code, /manage_pricing/)
  assert.match(code, /manage_inventory/)
  assert.match(code, /review_products/)
})

test('consequential catalog and marketplace actions require reasons', async () => {
  const catalog = await source('lib/admin/catalog.ts')
  const marketplace = await source('lib/admin/marketplace-controls.ts')
  assert.match(catalog, /'reject', 'request_changes', 'archive'/)
  assert.match(marketplace, /\['deactivate', 'activate'\]/)
  assert.match(marketplace, /REASON_REQUIRED/)
})

test('upload validation accepts a valid PNG and rejects size/type violations', async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  const { validateUpload } = await import('../lib/security/upload-validation')
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  await assert.doesNotReject(() => validateUpload(new File([png], 'item.png', { type: 'text/plain' }), 'image'))
  await assert.rejects(() => validateUpload(new File([new Uint8Array(26 * 1024 * 1024)], 'item.png'), 'image'), /UPLOAD_TOO_LARGE/)
  await assert.rejects(() => validateUpload(new File(['not an image'], 'item.txt'), 'image'), /UPLOAD_TYPE_NOT_ALLOWED/)
})

test('RPC remediation migration revokes public execution and grants service_role only', async () => {
  const migration = await source('lib/db/admin-security-remediation-phase1-schema.sql')
  assert.match(migration, /revoke execute on function public\.set_user_role/)
  assert.match(migration, /grant execute on function public\.set_user_role[\s\S]*to service_role/)
  assert.match(migration, /revoke execute on function public\.admin_analytics_vendor_metrics/)
  assert.match(migration, /grant execute on function public\.admin_analytics_operational_metrics[\s\S]*to service_role/)
})
