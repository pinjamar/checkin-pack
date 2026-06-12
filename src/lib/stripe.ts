import Stripe from 'stripe'

export function getStripe(secretKey: string) {
  return new Stripe(secretKey, { apiVersion: '2026-01-28.clover' })
}

export const PLANS = {
  free: {
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    max_apartments: 1,
    max_bookings_per_month: 3,
    features: [
      '1 apartman / 1 apartment',
      '3 rezervacije/mj / 3 bookings/mo',
      'Digitalni vodič / Digital guide',
      'QR kod / QR code',
      'CheckinPack branding',
    ],
  },
  pro: {
    name: 'Pro',
    price_monthly: 5,  // €5 billed every 3 months
    price_annual: 20,  // €20/year — lead with this
    max_apartments: 999,
    max_bookings_per_month: 999,
    features: [
      'Neograničeni apartmani / Unlimited apartments',
      'Neograničene rezervacije / Unlimited bookings',
      'eVisitor automatsko ispunjavanje / eVisitor autofill',
      'Automatski emailovi / Automated emails',
      'AI pisanje sadržaja / AI content writing (uskoro)',
      'Prilagođeni branding / Custom branding',
      'Podrška na hrvatskom / Croatian support',
    ],
  },
} as const
