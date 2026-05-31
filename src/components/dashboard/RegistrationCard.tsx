import { useState } from 'react'
import { formatForEvisitor, formatDateHR, type GuestData } from '../../lib/evisitor-format'

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Bolivia','Bosnia and Herzegovina','Brazil',
  'Bulgaria','Cambodia','Canada','Chile','China','Colombia','Croatia','Cyprus','Czech Republic',
  'Denmark','Egypt','Estonia','Finland','France','Georgia','Germany','Ghana','Greece','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Japan','Jordan',
  'Kazakhstan','Kenya','Kosovo','Kuwait','Latvia','Lebanon','Libya','Liechtenstein','Lithuania',
  'Luxembourg','Malaysia','Malta','Mexico','Moldova','Monaco','Montenegro','Morocco','Netherlands',
  'New Zealand','Nigeria','North Macedonia','Norway','Pakistan','Philippines','Poland','Portugal',
  'Qatar','Romania','Russia','Saudi Arabia','Serbia','Singapore','Slovakia','Slovenia',
  'South Africa','South Korea','Spain','Sweden','Switzerland','Syria','Thailand','Tunisia',
  'Turkey','Ukraine','United Arab Emirates','United Kingdom','United States','Vietnam',
].sort()

const sel = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"

interface RegistrationCardProps {
  registrationId: string
  bookingId: string
  registrationStatus: string
  guest: GuestData
  booking: {
    arrival_date: string
    departure_date: string
    guest_name: string | null
  }
}

export default function RegistrationCard({ registrationId, bookingId, registrationStatus, guest, booking }: RegistrationCardProps) {
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set())
  const [marking, setMarking] = useState(false)
  const [registered, setRegistered] = useState(registrationStatus === 'registered')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localGuest, setLocalGuest] = useState<GuestData>(guest)
  const nameParts = guest.full_name.split(' ')
  const [editData, setEditData] = useState({
    last_name: nameParts[0] || '',
    first_name: nameParts.slice(1).join(' ') || '',
    document_type: guest.document_type,
    document_number: guest.document_number,
    nationality: guest.nationality,
    date_of_birth: guest.date_of_birth,
    gender: guest.gender || '',
    country_of_birth: guest.country_of_birth || '',
    country_of_residence: guest.country_of_residence || '',
    city_of_residence: guest.city_of_residence || '',
  })

  const formatted = formatForEvisitor(localGuest, booking)

  const copyValue = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedFields(prev => new Set(prev).add(field))
    setTimeout(() => setCopiedFields(prev => { const n = new Set(prev); n.delete(field); return n }), 2000)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const full_name = `${editData.last_name.toUpperCase()} ${editData.first_name}`
      const res = await fetch(`/api/guest-registrations/${registrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editData, full_name }),
      })
      if (res.ok) {
        setLocalGuest({
          full_name,
          document_type: editData.document_type,
          document_number: editData.document_number,
          nationality: editData.nationality,
          date_of_birth: editData.date_of_birth,
          gender: editData.gender || undefined,
          country_of_birth: editData.country_of_birth || undefined,
          country_of_residence: editData.country_of_residence || undefined,
          city_of_residence: editData.city_of_residence || undefined,
        })
        setEditing(false)
      } else {
        alert('Greška pri spremanju / Save failed')
      }
    } catch {
      alert('Mrežna greška / Network error')
    } finally {
      setSaving(false)
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

  const set = (k: keyof typeof editData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditData(prev => ({ ...prev, [k]: e.target.value }))



  return (
    <div className={`rounded-xl border p-5 ${registered ? 'border-green-300 bg-green-50' : 'bg-white border-gray-200'}`}>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-0.5">
            {registered ? '✅ ' : '📋 '}eVisitor — {booking.guest_name || localGuest.full_name}
          </h3>
          <p className="text-xs text-gray-500">
            {formatDateHR(booking.arrival_date)} → {formatDateHR(booking.departure_date)}
          </p>
          <p className="text-xs mt-0.5">
            {registered
              ? <span className="text-green-700">🟢 Prijavljeno / Registered</span>
              : <span className="text-amber-600">🟡 Čeka prijavu / Pending registration</span>
            }
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-500 border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 shrink-0"
          >
            Uredi
          </button>
        )}
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="space-y-3">
          <datalist id={`cl-${registrationId}`}>
            {COUNTRIES.map(c => <option key={c} value={c} />)}
          </datalist>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vrsta isprave</label>
              <select className={sel} value={editData.document_type} onChange={set('document_type')}>
                <option value="id_card">Osobna iskaznica</option>
                <option value="passport">Putovnica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Broj isprave</label>
              <input className={inp} value={editData.document_number} onChange={set('document_number')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prezime</label>
              <input className={inp} value={editData.last_name} onChange={set('last_name')} placeholder="ROSSI" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ime</label>
              <input className={inp} value={editData.first_name} onChange={set('first_name')} placeholder="Marco" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Spol</label>
              <select className={sel} value={editData.gender} onChange={set('gender')}>
                <option value="">—</option>
                <option value="male">Muški</option>
                <option value="female">Ženski</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Datum rođenja (YYYY-MM-DD)</label>
              <input className={inp} value={editData.date_of_birth} onChange={set('date_of_birth')} placeholder="1985-03-15" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Država prebivališta</label>
            <input className={inp} list={`cl-${registrationId}`} value={editData.country_of_residence} onChange={set('country_of_residence')} placeholder="Npr. Germany" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Grad prebivališta</label>
            <input className={inp} value={editData.city_of_residence} onChange={set('city_of_residence')} placeholder="Npr. Berlin" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Država rođenja</label>
            <input className={inp} list={`cl-${registrationId}`} value={editData.country_of_birth} onChange={set('country_of_birth')} placeholder="Npr. Germany" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Državljanstvo</label>
            <input className={inp} list={`cl-${registrationId}`} value={editData.nationality} onChange={set('nationality')} placeholder="Npr. Germany" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} disabled={saving}
              className="flex-1 py-2 text-sm font-medium bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors">
              {saving ? 'Sprema...' : 'Spremi'}
            </button>
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Odustani
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Fields */}
          <div className="space-y-2">
            {formatted.map((item) => (
              <div key={item.field} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 bg-gray-50 rounded-lg">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{item.field}</p>
                  <p className={`text-sm font-medium mt-0.5 break-all ${item.value === '—' ? 'text-gray-400' : 'text-gray-900'}`}>{item.value}</p>
                </div>
                {item.inputType === 'select' ? (
                  <span className="shrink-0 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg whitespace-nowrap">
                    odaberi ručno
                  </span>
                ) : (
                  <button
                    onClick={() => copyValue(item.field, item.value)}
                    disabled={item.value === '—'}
                    className="w-full sm:w-auto shrink-0 min-h-11 px-3 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 disabled:opacity-40"
                  >
                    {copiedFields.has(item.field) ? '✓ Kopirano' : 'Kopiraj'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <a href="https://www.evisitor.hr" target="_blank" rel="noopener noreferrer"
              className="flex-1 py-2.5 text-sm font-medium text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              🌐 Otvori eVisitor
            </a>
            {!registered ? (
              <button onClick={markRegistered} disabled={marking}
                className="flex-1 py-2.5 text-sm font-medium bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors">
                {marking ? 'Označi...' : '✅ Označi kao prijavljeno'}
              </button>
            ) : (
              <div className="flex-1 py-2.5 text-sm font-medium text-center text-green-700 bg-green-100 rounded-lg">
                ✅ Prijavljeno
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
