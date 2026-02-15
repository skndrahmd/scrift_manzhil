/**
 * @module supabase/client
 * Creates and exports Supabase client instances: a public client (respects RLS)
 * and an admin client (bypasses RLS) for server-side operations.
 */
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
      fetch(url, { ...options, cache: 'no-store' }),
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Service role client for admin operations (bypasses RLS)
// Only create if service key is available (runtime only)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      fetch: (url: RequestInfo | URL, options: RequestInit = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  : supabase // Fallback to regular client if service key not available
