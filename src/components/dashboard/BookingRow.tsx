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

const fmt = (d: string) => d.split('-').reverse().join('.')

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
  const [deleted, setDeleted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ guest_name: guest_name || '', guest_email: guest_email || '', arrival_date, departure_date })

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    sent: 'bg-amber-50 text-amber-700',
    completed: 'bg-green-50 text-green-700',
    registered: 'bg-blue-50 text-blue-700',
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

  const deleteBooking = async () => {
    if (!confirm('Delete this booking?')) return
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    if (res.ok) setDeleted(true)
    else alert('Failed to delete booking')
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setEditing(false)
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  if (deleted) return null

  if (editing) {
    return (
      <div className="p-4 bg-white rounded-lg border border-brand">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Guest name</label>
            <input
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.guest_name}
              onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Guest email</label>
            <input
              type="email"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.guest_email}
              onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Arrival</label>
            <input
              type="date"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.arrival_date}
              onChange={e => setForm(f => ({ ...f, arrival_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Departure</label>
            <input
              type="date"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.departure_date}
              onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveEdit}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {guest_name || 'Guest'}
        </p>
        <p className="text-sm text-gray-500">
          {fmt(arrival_date)} → {fmt(departure_date)}
        </p>
        {guest_email && (
          <p className="text-xs text-gray-400 truncate">{guest_email}</p>
        )}
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[registration_status] || statusColors.pending}`}>
          {registration_status}
        </span>

        {guest_email && !sent && registration_status !== 'completed' && (
          <button
            onClick={sendLink}
            disabled={sending}
            className="px-3 py-1.5 text-xs font-medium bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send now'}
          </button>
        )}
        {sent && registration_status !== 'completed' && (
          <span className="text-xs text-gray-400">Link sent</span>
        )}

        <button
          onClick={() => setEditing(true)}
          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit booking"
        >
          Edit
        </button>
        <button
          onClick={deleteBooking}
          className="px-2 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete booking"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
