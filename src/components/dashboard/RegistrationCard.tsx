import { useState } from 'react'
import { formatForEvisitor, formatDateHR, type GuestData } from '../../lib/evisitor-format'

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
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set())
  const [copiedAll, setCopiedAll] = useState(false)
  const [marking, setMarking] = useState(false)
  const [registered, setRegistered] = useState(registrationStatus === 'registered')
  const formatted = formatForEvisitor(guest, booking)

  const copyValue = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedFields(prev => new Set(prev).add(field))
    setTimeout(() => setCopiedFields(prev => { const n = new Set(prev); n.delete(field); return n }), 2000)
  }

  const copyAll = async () => {
    const text = formatted.map(f => f.value).join('\n')
    await navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setCopiedFields(new Set(formatted.map(f => f.field)))
    setTimeout(() => { setCopiedAll(false); setCopiedFields(new Set()) }, 2000)
  }

  const markRegistered = async () => {
    setMarking(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/mark-registered`, { method: 'POST' })
      if (res.ok) {
        setRegistered(true)
      } else {
        alert('Greška pri ažuriranju statusa / Failed to update status')
      }
    } catch {
      alert('Mrežna greška / Network error')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className={`rounded-xl border p-5 ${registered ? 'border-green-300 bg-green-50' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 mb-0.5">
          {registered ? '✅ ' : '📋 '}eVisitor — {booking.guest_name || guest.full_name}
        </h3>
        <p className="text-xs text-gray-500">
          Dolazak/Arrival: {formatDateHR(booking.arrival_date)} → {formatDateHR(booking.departure_date)}
        </p>
        <p className="text-xs mt-0.5">
          {registered
            ? <span className="text-green-700">🟢 Prijavljeno / Registered</span>
            : <span className="text-amber-600">🟡 Čeka prijavu / Pending registration</span>
          }
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-2">
        {formatted.map((item) => (
          <div
            key={item.field}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 bg-gray-50 rounded-lg"
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{item.field}</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5 break-all">{item.value}</p>
            </div>
            <button
              onClick={() => copyValue(item.field, item.value)}
              className="w-full sm:w-auto shrink-0 min-h-11 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600"
            >
              {copiedFields.has(item.field) ? '✓ Kopirano' : 'Kopiraj'}
            </button>
          </div>
        ))}
        <button
          onClick={copyAll}
          className="w-full min-h-11 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 mt-1"
        >
          {copiedAll ? '✓ Sve kopirano' : '📋 Kopiraj sve'}
        </button>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <a
          href="https://www.evisitor.hr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 text-sm font-medium text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          🌐 Otvori eVisitor
        </a>
        {!registered ? (
          <button
            onClick={markRegistered}
            disabled={marking}
            className="flex-1 py-2.5 text-sm font-medium bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {marking ? 'Označi...' : '✅ Označi kao prijavljeno'}
          </button>
        ) : (
          <div className="flex-1 py-2.5 text-sm font-medium text-center text-green-700 bg-green-100 rounded-lg">
            ✅ Prijavljeno
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Kopirajte polja redom od gore prema dolje. / Copy fields top to bottom into eVisitor. Podaci se automatski brišu 30 dana nakon odjave.
      </p>
    </div>
  )
}
