import type { APIRoute } from 'astro'
import { getSupabaseAdmin } from '../../../../lib/supabase-server'

export const POST: APIRoute = async (context) => {
  const supabaseAdmin = getSupabaseAdmin(context.locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY)
  const accessToken = context.cookies.get('sb-access-token')?.value
  if (!accessToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken)
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  // Verify ownership
  const { data: apartment } = await supabaseAdmin
    .from('apartments')
    .select('id')
    .eq('id', context.params.id)
    .eq('owner_id', user.id)
    .single()

  if (!apartment) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

  const formData = await context.request.formData()
  const file = formData.get('image') as File | null

  if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 })
  if (!file.type.startsWith('image/')) return new Response(JSON.stringify({ error: 'File must be an image' }), { status: 400 })
  if (file.size > 2 * 1024 * 1024) return new Response(JSON.stringify({ error: 'Image must be under 2MB' }), { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${context.params.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('apartment-images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('apartment-images')
    .getPublicUrl(path)

  await supabaseAdmin
    .from('apartments')
    .update({ cover_image_url: publicUrl })
    .eq('id', context.params.id)

  return new Response(JSON.stringify({ url: publicUrl }), { status: 200 })
}
