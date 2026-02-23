import { defineMiddleware } from 'astro:middleware'
import { supabaseAdmin } from '../lib/supabase-server'

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url

  // Only protect /dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return next()
  }

  // Check for auth token in cookies
  const accessToken = context.cookies.get('sb-access-token')?.value
  const refreshToken = context.cookies.get('sb-refresh-token')?.value

  if (!accessToken || !refreshToken) {
    return context.redirect('/login')
  }

  // Verify the session
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)

  if (error || !user) {
    // Try refreshing the token
    const { data: refreshData, error: refreshError } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    })

    if (refreshError || !refreshData.session) {
      context.cookies.delete('sb-access-token', { path: '/' })
      context.cookies.delete('sb-refresh-token', { path: '/' })
      return context.redirect('/login')
    }

    // Set new tokens
    context.cookies.set('sb-access-token', refreshData.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
    })
    context.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    context.locals.user = refreshData.session.user
  } else {
    context.locals.user = user
  }

  return next()
})
