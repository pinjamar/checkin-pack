import { getSupabaseAdmin } from './supabase-server'
import { PLANS } from './stripe'

export interface PlanLimits {
  can_add_apartment: boolean
  can_add_booking: boolean
  is_pro: boolean
  apartments_count: number
  bookings_this_month: number
}

export async function checkPlanLimits(ownerId: string, serviceKey: string): Promise<PlanLimits> {
  const supabase = getSupabaseAdmin(serviceKey)

  const { data: owner } = await supabase
    .from('owners')
    .select('plan')
    .eq('id', ownerId)
    .single()

  const isPro = owner?.plan === 'pro'

  if (isPro) {
    return { can_add_apartment: true, can_add_booking: true, is_pro: true, apartments_count: 0, bookings_this_month: 0 }
  }

  const { count: aptCount } = await supabase
    .from('apartments')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: bookingCount } = await supabase
    .from('bookings')
    .select('*, apartments!inner(owner_id)', { count: 'exact', head: true })
    .eq('apartments.owner_id', ownerId)
    .gte('created_at', startOfMonth.toISOString())

  const apartments_count = aptCount ?? 0
  const bookings_this_month = bookingCount ?? 0

  return {
    can_add_apartment: apartments_count < PLANS.free.max_apartments,
    can_add_booking: bookings_this_month < PLANS.free.max_bookings_per_month,
    is_pro: false,
    apartments_count,
    bookings_this_month,
  }
}

export async function requireProPlan(ownerId: string, serviceKey: string): Promise<boolean> {
  const supabase = getSupabaseAdmin(serviceKey)
  const { data } = await supabase
    .from('owners')
    .select('plan')
    .eq('id', ownerId)
    .single()
  return data?.plan === 'pro'
}
