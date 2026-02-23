import { createClient } from '@supabase/supabase-js'

// Server-only client — NEVER import this in client-side scripts or React components
// Only use in .astro frontmatter and API routes (server-side only)
export const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
)
