/// <reference path="../.astro/types.d.ts" />

interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string
  RESEND_API_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>

declare namespace App {
  interface Locals extends Runtime {
    user?: import('@supabase/supabase-js').User
  }
}
