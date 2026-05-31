import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../lib/supabase-server'

async function getUser(context: Parameters<APIRoute>[0]) {
  const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
  const accessToken = context.cookies.get('sb-access-token')?.value
  if (!accessToken) return { supabaseAdmin, user: null }
  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  return { supabaseAdmin, user }
}

export const GET: APIRoute = async (context) => {
  const { supabaseAdmin, user } = await getUser(context)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { data: owner } = await supabaseAdmin
    .from('owners')
    .select('evisitor_username, evisitor_password')
    .eq('id', user.id)
    .single()

  return new Response(JSON.stringify({
    username: owner?.evisitor_username || '',
    password: owner?.evisitor_password ? '••••••••' : '',
    has_password: !!owner?.evisitor_password,
  }), { status: 200 })
}

export const PUT: APIRoute = async (context) => {
  const { supabaseAdmin, user } = await getUser(context)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const body = await context.request.json()
  const { username, password } = body

  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Username and password are required' }), { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('owners')
    .update({ evisitor_username: username, evisitor_password: password })
    .eq('id', user.id)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}
