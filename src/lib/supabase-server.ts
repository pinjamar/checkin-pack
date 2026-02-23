import { createClient } from '@supabase/supabase-js'

// Server-only client — NEVER import this in client-side scripts or React components
// Called as a function so Cloudflare Workers env vars are read inside the request context
export function getSupabaseAdmin() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
