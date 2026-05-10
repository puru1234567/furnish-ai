# Database Setup Guide

This guide explains how to set up Supabase/Postgres for FurnishAI.

## Overview

FurnishAI uses a **feature flag** to switch between two database backends:

1. **InMemoryFurnitureRepository** (default): Hardcoded furniture data in `lib/furniture-data.ts`
2. **SupabaseFurnitureRepository** (production): Live Postgres database via Supabase

## Option 1: Quick Start (In-Memory, No Setup Required)

If you just want to develop without a database:

```bash
# Leave USE_SUPABASE_DB=false in .env.local
# The app will use InMemoryFurnitureRepository automatically
npm run dev
```

## Option 2: Set Up Supabase (Production-Ready)

### Prerequisites

- Supabase account (https://supabase.com)
- Node.js 18+

### Step 1: Create a Supabase Project

1. Go to https://supabase.com and create an account
2. Create a new project
3. Wait for the project to initialize
4. Copy your **Project URL** and **Anon Key** from Settings → API

### Step 2: Set Environment Variables

Edit `.env.local` and add:

```env
USE_SUPABASE_DB=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find these:**
- **Project URL**: Supabase Dashboard → Settings → API
- **Anon Key**: Settings → API → `anon` key
- **Service Role Key**: Settings → API → `service_role` key (KEEP SECRET!)

### Step 3: Create the Database Schema

Run the SQL schema file in Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy contents of `lib/db/schema.sql`
4. Paste into the SQL Editor
5. Run the query

**What this creates:**
- `products` table (main inventory)
- Indexes for filtering and search
- `product_cache` table (optional, for caching)
- `product_audit_log` table (optional, for auditing)

### Step 4: Seed Data

Load your furniture data into the database:

```bash
npm run db:seed
```

This script will:
- Read `lib/furniture-data.ts`
- Generate `search_blob` for each product (for hybrid retrieval)
- Insert all products into Supabase

**Output:**
```
[seed] Loading 25 products into Supabase...
[seed] ✓ Successfully seeded 25 products
```

### Step 5: Verify Connection

Start the dev server:

```bash
npm run dev
```

Check the logs when you trigger a recommendation:

```
[repositoryFactory] Using SupabaseFurnitureRepository
```

If you see this, the Supabase backend is active.

## Switching Backends

To switch between in-memory and Supabase:

**In `.env.local`:**

```env
# Use in-memory (development without DB)
USE_SUPABASE_DB=false

# Use Supabase (production-ready)
USE_SUPABASE_DB=true
```

The `repositoryFactory` automatically selects the correct implementation based on this flag.

## Troubleshooting

### "SupabaseFurnitureRepository requires NEXT_PUBLIC_SUPABASE_URL..."

Make sure both environment variables are set in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### "Supabase query failed: 401 Unauthorized"

Your API keys are invalid or expired. Regenerate them in Supabase Settings → API.

### "Supabase insert failed: 409 Conflict"

You're trying to seed duplicate product IDs. Either:
- Delete existing products first: `DELETE FROM products;`
- Or run: `npm run db:seed -- --force`

### No products returned from queries

Make sure you ran `npm run db:seed` to populate the database with data.

## Architecture Notes

### Repository Pattern

The repository abstraction (`IFurnitureRepository`) decouples the app from database implementation:

```
Routes → getFurnitureRepository() → SupabaseFurnitureRepository OR InMemoryFurnitureRepository
```

This allows:
- **Easy testing**: Mock the repository interface
- **Easy switching**: Change one environment variable
- **Easy scaling**: Add new backends (MongoDB, ElasticSearch, etc.) without changing routes

### Search Blob for Hybrid Retrieval

The `search_blob` column is a denormalized text field built by concatenating:
- Product name
- Description
- Tags (product and style)
- Material
- Brand
- Maintenance info
- Warranty info

This enables:
- **Keyword search** via Postgres full-text search index
- **Vector search** (future): embed the search_blob, index with pgvector
- **Hybrid retrieval** (future): combine keyword + vector + structured filters

## Future Improvements

1. **Vector embeddings** (Step 5 of action plan):
   - Enable pgvector extension in Supabase
   - Generate embeddings for each `search_blob`
   - Use for semantic search

2. **Hybrid retrieval** (Step 6):
   - Combine metadata filters (SQL)
   - Keyword search (Postgres full-text search)
   - Vector search (pgvector)
   - Merge results with reciprocal rank fusion

3. **Caching** (Step 10):
   - Populate `product_cache` table
   - Cache filtered product sets by query signature

4. **Real-time updates**:
   - Use Supabase Realtime to sync product changes across clients
   - Invalidate caches on product updates
