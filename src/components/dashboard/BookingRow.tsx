import { useState } from 'react'

interface BookingRowProps {
  id: string
  guest_name: string | null
  guest_email: string | null
  arrival_date: string
  departure_date: string
  registration_status: string
  pre_arrival_link_sent: boolean
}

export default function BookingRow({
  id,
  guest_name,
  guest_email,
  arrival_date,
  departure_date,
  registration_status,
  pre_arrival_link_sent,
}: BookingRowProps) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(pre_arrival_link_sent)

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    sent: 'bg-amber-50 text-amber-700',
    completed: 'bg-green-50 text-green-700',
  }

  const sendLink = async () => {
    setSending(true)
    try {
      const res = await fetch(`/api/bookings/${id}/send-link`, { method: 'POST' })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send link')
      }
    } catch {
      alert('Failed to send link')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {guest_name || 'Guest'}
        </p>
        <p className="text-sm text-gray-500">
          {arrival_date} → {departure_date}
        </p>
        {guest_email && (
          <p className="text-xs text-gray-400 truncate">{guest_email}</p>
        )}
      </div>

      <div className="flex items-center gap-3 ml-4">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[registration_status] || statusColors.pending}`}>
          {registration_status}
        </span>

        {guest_email && !sent && registration_status !== 'completed' && (
          <button
            onClick={sendLink}
            disabled={sending}
            className="px-3 py-1.5 text-xs font-medium bg-[#1a6b4a] text-white rounded-lg hover:bg-[#145538] disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Link'}
          </button>
        )}
        {sent && registration_status !== 'completed' && (
          <span className="text-xs text-gray-400">Link sent</span>
        )}
      </div>
    </div>
  )
}
