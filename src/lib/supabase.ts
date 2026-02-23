import { createClient } from '@supabase/supabase-js'

// Browser client — safe to import in React components and client-side scripts
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)
