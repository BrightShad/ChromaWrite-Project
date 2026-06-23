# ChromaWrite — Setup Guide

## 1. Install & run

```
bun install
bun dev
```
Open http://localhost:8080

---

## 2. Groq API key (free, no credit card)

1. Go to console.groq.com
2. Sign up → API Keys → Create API Key
3. Copy the key (starts with gsk_)
4. Add to .env:
   VITE_GROQ_API_KEY=gsk_your_key_here

Powers: custom emotion mapping, AI nudges, finish fingerprint.
Without it: app works fully in local mode.

---

## 3. Supabase database (free, optional but recommended)

Without Supabase: stories save to localStorage (same browser only).
With Supabase: real Postgres database, stories sync across devices, user accounts.

### Step 1 — Create project
1. Go to supabase.com → New project
2. Choose a region close to you
3. Wait ~2 min for it to spin up

### Step 2 — Run the schema
1. In your Supabase dashboard → SQL Editor → New Query
2. Open supabase_schema.sql (included in this project)
3. Paste the entire contents → click Run
4. You should see "Success. No rows returned"

### Step 3 — Get your keys
1. Supabase dashboard → Settings → API
2. Copy "Project URL" and "anon public" key
3. Add to .env:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key

### Step 4 — Enable email auth
1. Supabase dashboard → Authentication → Providers
2. Make sure Email is enabled (it is by default)
3. For local dev, go to Authentication → URL Configuration
4. Add http://localhost:8080 to "Redirect URLs"

That's it. Users can now sign in with magic link email.
Stories are tied to each user's account.

---

## File structure (what was added)

src/
  lib/
    supabase.ts      — Supabase client (null if not configured)
    auth.ts          — signIn / signOut / getUser helpers
    useAuth.ts       — React hook for auth state
    storyStore.ts    — Supabase-first, localStorage fallback
  pages/
    Index.tsx        — auth UI, async story loading, delete
    WritePad.tsx     — saves story on finish with userId
    NewStorySetup.tsx — logo fixed
  engine/            — emotion detection engine (6 files)
  api/
    claudeClient.ts  — Groq API (4 calls)
  types/
    emotion.ts       — shared types

supabase_schema.sql  — run this once in Supabase SQL editor
