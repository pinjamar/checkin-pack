import { useState } from 'react'
import { formatForEvisitor, type GuestData } from '../../lib/evisitor-format'

interface RegistrationCardProps {
  bookingId: string
  registrationStatus: string
  guest: GuestData
  booking: {
    arrival_date: string
    departure_date: string
    guest_name: string | null
  }
}

export default function RegistrationCard({ bookingId, registrationStatus, guest, booking }: RegistrationCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const [registered, setRegistered] = useState(registrationStatus === 'registered')
  const formatted = formatForEvisitor(guest, booking)

  const copyAll = async () => {
    const text = formatted.map((f) => `${f.field}: ${f.value}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopiedField('all')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const copyValue = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const markRegistered = async () => {
    setMarking(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/mark-registered`, { method: 'POST' })
      if (res.ok) {
        setRegistered(true)
      } else {
        alert('Failed to update status')
      }
    } catch {
      alert('Network error')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className={`rounded-xl border p-5 ${registered ? 'border-green-300 bg-green-50' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          {registered ? '✅ ' : '📋 '}eVisitor — {booking.guest_name || guest.full_name}
        </h3>
        <button
          onClick={copyAll}
          className="px-3 py-1.5 text-xs font-medium bg-[#1a6b4a] text-white rounded-lg hover:bg-[#145538] transition-colors"
        >
          {copiedField === 'all' ? 'Copied!' : 'Copy All'}
        </button>
      </div>

      <div className="space-y-2">
        {formatted.map((item) => (
          <div
            key={item.field}
            className="flex items-start justify-between p-2.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => copyValue(item.field, item.value)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">{item.field}</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{item.value}</p>
            </div>
            <span className="text-xs text-gray-400 ml-2 shrink-0">
              {copiedField === item.field ? 'Copied!' : 'Click to copy'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <a
          href="https://www.evisitor.hr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 text-sm font-medium text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Open eVisitor ↗
        </a>
        {!registered ? (
          <button
            onClick={markRegistered}
            disabled={marking}
            className="flex-1 py-2.5 text-sm font-medium bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {marking ? 'Saving...' : '✅ Mark as Registered'}
          </button>
        ) : (
          <div className="flex-1 py-2.5 text-sm font-medium text-center text-green-700 bg-green-100 rounded-lg">
            Registered in eVisitor
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Copy fields into eVisitor top to bottom. Data auto-deletes 30 days after departure.
      </p>
    </div>
  )
}
