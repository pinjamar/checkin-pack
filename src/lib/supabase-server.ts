import { createClient } from '@supabase/supabase-js'

// Server-only client — NEVER import this in client-side scripts or React components
// serviceKey must be passed from context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY
export function getSupabaseAdmin(serviceKey: string) {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    serviceKey
  )
}
