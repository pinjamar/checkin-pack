export const PLANS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    max_apartments: 1,
    max_bookings_per_month: 3,
  },
  pro: {
    name: 'Pro',
    price_monthly: 10,
    price_annual: 80,
    stripe_price_monthly: import.meta.env.STRIPE_PRICE_PRO_MONTHLY,
    stripe_price_annual: import.meta.env.STRIPE_PRICE_PRO_ANNUAL,
    max_apartments: 999,
    max_bookings_per_month: 999,
  },
} as const
