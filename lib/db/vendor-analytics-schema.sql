-- FurnishAI Vendor Portal - Phase 8: vendor analytics requirements
-- No dashboard data is fabricated. These indexes support server-side aggregation.

create index if not exists idx_vendor_products_vendor_lifecycle on public.vendor_products(vendor_id, lifecycle_status);
create index if not exists idx_vendor_products_vendor_approval on public.vendor_products(vendor_id, status);

-- Required server-side aggregation contract:
-- 1. Join analytics_recommendation_engagement.product_id to vendor_products.id.
-- 2. Join analytics_events_v2.payload->>'productId' to vendor_products.id for product.clicked events.
-- 3. Filter every aggregation by vendor_products.vendor_id = auth.uid().
-- 4. Filter occurred_at/created_at using the requested inclusive date range.
-- 5. Return views, clicks, enquiries, conversion_rate, and ranked product performance.
-- 6. Enquiries require a future event/source contract; return NULL until defined.
-- 7. Expose the result through a server-side API or SECURITY DEFINER RPC that
--    verifies auth.uid() and never accepts an arbitrary vendor_id from the client.