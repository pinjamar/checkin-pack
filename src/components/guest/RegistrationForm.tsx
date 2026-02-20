import { useState } from 'react'

interface RegistrationFormProps {
  token: string
  apartmentName: string
  arrivalDate: string
}

export default function RegistrationForm({ token, apartmentName, arrivalDate }: RegistrationFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const data = new FormData(form)

    const body = {
      token,
      full_name: data.get('full_name'),
      document_type: data.get('document_type'),
      document_number: data.get('document_number'),
      nationality: data.get('nationality'),
      date_of_birth: data.get('date_of_birth'),
      gdpr_consent: data.get('gdpr_consent') === 'on',
    }

    try {
      const res = await fetch('/api/guest/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
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
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Registration complete</h2>
        <p className="text-gray-500">
          Thank you! Your host has been notified. Enjoy your stay at {apartmentName}.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-5 py-8">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900">Pre-arrival Registration</h1>
        <p className="text-sm text-gray-500 mt-1">
          {apartmentName} — arriving {arrivalDate}
        </p>
      </div>

      <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg">
        Croatian law requires all tourist guests to register within 48 hours of arrival. Please fill out this form before you arrive.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name (as on passport) *</label>
          <input
            type="text"
            name="full_name"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
            placeholder="SURNAME Name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document type *</label>
          <select
            name="document_type"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a] bg-white"
          >
            <option value="passport">Passport</option>
            <option value="id_card">ID Card</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Document number *</label>
          <input
            type="text"
            name="document_number"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality *</label>
          <input
            type="text"
            name="nationality"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
            placeholder="e.g. German, British, Italian"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth *</label>
          <input
            type="date"
            name="date_of_birth"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
          />
        </div>

        {/* GDPR Consent */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="gdpr_consent"
              required
              className="mt-1 w-4 h-4 text-[#1a6b4a] border-gray-300 rounded focus:ring-[#1a6b4a]"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I consent to the processing of my personal data for the purpose of tourist registration as required by Croatian law. My data will be shared with the accommodation owner for eVisitor registration and automatically deleted 30 days after my departure.
            </span>
          </label>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#1a6b4a] text-white rounded-lg font-medium hover:bg-[#145538] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Submitting...' : 'Submit Registration'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Powered by <a href="https://checkinpack.hr" className="text-[#1a6b4a]">CheckinPack.hr</a>
      </p>
    </div>
  )
}
