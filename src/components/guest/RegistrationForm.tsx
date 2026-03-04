import { useState } from 'react'

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium', 'Bolivia', 'Bosnia and Herzegovina',
  'Brazil', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia',
  'Cyprus', 'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Finland', 'France', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
  'Iraq', 'Ireland', 'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kosovo', 'Kuwait', 'Latvia', 'Lebanon', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Malta', 'Mexico', 'Moldova', 'Monaco', 'Montenegro', 'Morocco', 'Netherlands',
  'New Zealand', 'Nigeria', 'North Macedonia', 'Norway', 'Pakistan', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Syria', 'Thailand', 'Tunisia',
  'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
].sort()

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const YEARS = (() => { const y = new Date().getFullYear(); return Array.from({ length: y - 1919 }, (_, i) => y - i) })()

const sel = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
const inp = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"

interface Guest {
  first_name: string
  last_name: string
  document_type: string
  document_number: string
  nationality: string
  dob_day: string
  dob_month: string
  dob_year: string
}

interface Props {
  token: string
  apartmentName: string
  arrivalDate: string
}

const empty = (): Guest => ({
  first_name: '', last_name: '', document_type: 'id_card', document_number: '',
  nationality: '', dob_day: '', dob_month: '', dob_year: '',
})

export default function RegistrationForm({ token, apartmentName, arrivalDate }: Props) {
  const [guests, setGuests] = useState<Guest[]>([empty()])
  const [submitted, setSubmitted] = useState(false)
  const [guideUrl, setGuideUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (i: number, field: keyof Guest, value: string) =>
    setGuests(gs => gs.map((g, idx) => idx === i ? { ...g, [field]: value } : g))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    for (const g of guests) {
      if (!g.dob_day || !g.dob_month || !g.dob_year) {
        setError('Please fill in date of birth for all guests.')
        return
      }
    }

    setLoading(true)

    const payload = guests.map(g => ({
      full_name: `${g.last_name.toUpperCase()} ${g.first_name}`,
      document_type: g.document_type,
      document_number: g.document_number,
      nationality: g.nationality,
      date_of_birth: `${g.dob_year}-${String(g.dob_month).padStart(2, '0')}-${String(g.dob_day).padStart(2, '0')}`,
    }))

    try {
      const res = await fetch('/api/guest/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, guests: payload, gdpr_consent: true }),
      })
      if (res.ok) {
        const result = await res.json()
        setGuideUrl(result.guide_url || null)
        setSubmitted(true)
      } else {
        const result = await res.json()
        setError(result.error || 'Something went wrong')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12 px-6">
        <span className="text-5xl mb-4 block">✅</span>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Hvala! / Registration complete</h2>
        <p className="text-gray-500 mb-6">Your host has been notified. Enjoy your stay at {apartmentName}!</p>
        {guideUrl && (
          <a href={guideUrl} className="inline-block px-6 py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors">
            View your welcome guide →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900">Pre-arrival Registration</h1>
        <p className="text-sm text-gray-500 mt-1">{apartmentName} — arriving {arrivalDate}</p>
      </div>

      <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg">
        Croatian law requires all tourist guests to register within 24 hours of arrival. Please fill out this form for <strong>each guest</strong> before (or soon after) you arrive.
      </p>

      <datalist id="countries-list">
        {COUNTRIES.map(c => <option key={c} value={c} />)}
      </datalist>

      <form onSubmit={handleSubmit} className="space-y-6">
        {guests.map((guest, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Guest {i + 1}</h3>
              {guests.length > 1 && (
                <button type="button" onClick={() => setGuests(gs => gs.filter((_, idx) => idx !== i))}
                  className="text-xs text-red-400 hover:text-red-600">Remove</button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name / Ime *</label>
                <input type="text" required value={guest.first_name}
                  onChange={e => update(i, 'first_name', e.target.value)}
                  className={inp} placeholder="First Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name / Prezime *</label>
                <input type="text" required value={guest.last_name}
                  onChange={e => update(i, 'last_name', e.target.value)}
                  className={inp} placeholder="Last Name" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document type / Vrsta isprave *</label>
              <select required value={guest.document_type}
                onChange={e => update(i, 'document_type', e.target.value)} className={sel}>
                <option value="id_card">ID Card / Osobna iskaznica</option>
                <option value="passport">Passport / Putovnica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document number / Broj isprave *</label>
              <input type="text" required value={guest.document_number}
                onChange={e => update(i, 'document_number', e.target.value)} className={inp} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality / Državljanstvo *</label>
              <input
                type="text"
                list="countries-list"
                required
                value={guest.nationality}
                onChange={e => update(i, 'nationality', e.target.value)}
                className={inp}
                placeholder="Type to search..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth / Datum rođenja *</label>
              <div className="grid grid-cols-3 gap-2">
                <select required value={guest.dob_day} onChange={e => update(i, 'dob_day', e.target.value)} className={sel}>
                  <option value="">Day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select required value={guest.dob_month} onChange={e => update(i, 'dob_month', e.target.value)} className={sel}>
                  <option value="">Month</option>
                  {MONTHS.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
                </select>
                <select required value={guest.dob_year} onChange={e => update(i, 'dob_year', e.target.value)} className={sel}>
                  <option value="">Year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={() => setGuests(gs => [...gs, empty()])}
          className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-sm hover:border-brand hover:text-brand transition-colors">
          + Add another guest
        </button>

        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" required className="mt-1 w-4 h-4 text-brand border-gray-300 rounded focus:ring-brand" />
            <span className="text-xs text-gray-600 leading-relaxed">
              I consent to the processing of personal data for all guests listed above for the purpose of tourist registration as required by Croatian law. Data will be shared with the accommodation owner for eVisitor registration and deleted 30 days after departure.
            </span>
          </label>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors">
          {loading ? 'Submitting...' : `Submit Registration (${guests.length} guest${guests.length > 1 ? 's' : ''})`}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Powered by <a href="https://checkinpack.hr" className="text-brand">CheckinPack.hr</a>
      </p>
    </div>
  )
}
