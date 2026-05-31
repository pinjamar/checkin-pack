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
  const [marking, setMarking] = useState(false)
  const [registered, setRegistered] = useState(registrationStatus === 'registered')
  const [seqIndex, setSeqIndex] = useState<number | null>(null)

  const formatted = formatForEvisitor(guest, booking)

  const copyValue = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedFields(prev => new Set(prev).add(field))
    setTimeout(() => setCopiedFields(prev => { const n = new Set(prev); n.delete(field); return n }), 2000)
  }

  const startSequential = async () => {
    setSeqIndex(0)
    await navigator.clipboard.writeText(formatted[0].value)
  }

  const nextField = async () => {
    const next = (seqIndex ?? 0) + 1
    if (next >= formatted.length) {
      setSeqIndex(null)
    } else {
      setSeqIndex(next)
      await navigator.clipboard.writeText(formatted[next].value)
    }
  }

  const markRegistered = async () => {
    setMarking(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/mark-registered`, { method: 'POST' })
      if (res.ok) setRegistered(true)
      else alert('Greška pri ažuriranju statusa / Failed to update status')
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

      {/* Sequential mode banner */}
      {seqIndex !== null && (() => {
        const current = formatted[seqIndex]
        const hint =
          current.inputType === 'select'
            ? '⚠️ Padajući izbornik — odaberite ručno'
            : current.inputType === 'autocomplete'
            ? '🔍 Upišite u polje za pretraživanje'
            : '📋 Zalijepite u eVisitor (Ctrl+V / Cmd+V)'
        return (
          <div className="bg-brand rounded-lg p-3 mb-3 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium opacity-75">Polje {seqIndex + 1} od {formatted.length}</span>
              <button onClick={() => setSeqIndex(null)} className="text-xs opacity-60 hover:opacity-100">✕ Zatvori</button>
            </div>
            <p className="text-sm font-semibold">{current.field}</p>
            <p className="text-xs opacity-75 mt-0.5">{hint}</p>
            <button
              onClick={nextField}
              className="mt-2.5 w-full py-2 bg-white text-brand rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
            >
              {seqIndex < formatted.length - 1 ? 'Dalje →' : '✓ Gotovo'}
            </button>
          </div>
        )
      })()}

      {/* Fields */}
      <div className="space-y-2">
        {formatted.map((item, idx) => (
          <div
            key={item.field}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-lg transition-colors ${
              seqIndex === idx ? 'bg-brand-light border border-brand' : 'bg-gray-50'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{item.field}</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5 break-all">{item.value}</p>
            </div>
            {seqIndex === null && (
              <button
                onClick={() => copyValue(item.field, item.value)}
                className="w-full sm:w-auto shrink-0 min-h-11 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600"
              >
                {copiedFields.has(item.field) ? '✓ Kopirano' : 'Kopiraj'}
              </button>
            )}
          </div>
        ))}

        {seqIndex === null && (
          <button
            onClick={startSequential}
            className="w-full min-h-11 px-3 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors mt-1"
          >
            ▶ Kopiraj polje po polje
          </button>
        )}
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
    </div>
  )
}
