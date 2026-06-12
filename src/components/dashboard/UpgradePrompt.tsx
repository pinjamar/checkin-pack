import { useState } from 'react'

interface Props {
  reason?: string
}

export default function UpgradePrompt({ reason }: Props) {
  const [loading, setLoading] = useState<'annual' | '3month' | null>(null)

  async function checkout(interval: 'annual' | '3month') {
    setLoading(interval)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="bg-brand-light border border-brand/20 rounded-xl p-5">
      <h3 className="font-semibold text-brand mb-1">Nadogradite na Pro / Upgrade to Pro</h3>
      {reason && <p className="text-sm text-gray-600 mb-3">{reason}</p>}
      <ul className="text-sm text-gray-600 space-y-1 mb-4">
        <li>✓ Neograničeni apartmani / Unlimited apartments</li>
        <li>✓ Neograničene rezervacije / Unlimited bookings</li>
        <li>✓ eVisitor automatsko ispunjavanje / eVisitor autofill</li>
        <li>✓ Automatski emailovi / Automated emails</li>
        <li>✓ Prilagođeni branding / Custom branding</li>
      </ul>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => checkout('annual')}
          disabled={loading !== null}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {loading === 'annual' ? '...' : '€20/godina — plati prije sezone'}
        </button>
        <button
          onClick={() => checkout('3month')}
          disabled={loading !== null}
          className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          {loading === '3month' ? '...' : 'ili €5 / 3 mj'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Platite jednom prije sezone, pokriveni ste do listopada.</p>
    </div>
  )
}
