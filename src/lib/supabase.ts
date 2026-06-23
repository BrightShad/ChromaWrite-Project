import { createClient } from '@supabase/supabase-js'

// ─── Supabase Client ──────────────────────────────────────────────────────────
// These come from your .env file.
// Get them from: supabase.com → your project → Settings → API

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  console.warn(
    '[ChromaWrite] Supabase env vars missing. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env. ' +
    'Falling back to localStorage.'
  )
}

export const supabase = (supabaseUrl && supabaseAnon)
  ? createClient(supabaseUrl, supabaseAnon)
  : null

export const isSupabaseReady = !!supabase
