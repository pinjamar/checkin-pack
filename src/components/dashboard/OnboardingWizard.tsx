import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

interface Step2Data {
  name: string
  address: string
}

interface Step3Data {
  wifi_name: string
  wifi_password: string
  checkin_time: string
  checkout_time: string
  house_rules: string
}

export default function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [step2, setStep2] = useState<Step2Data>({ name: '', address: '' })
  const [step3, setStep3] = useState<Step3Data>({
    wifi_name: '',
    wifi_password: '',
    checkin_time: '',
    checkout_time: '',
    house_rules: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apartment, setApartment] = useState<{ id: string; slug: string; name: string } | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (step === 4 && apartment) {
      const guideUrl = `${window.location.origin}/m/${apartment.slug}`
      QRCode.toDataURL(guideUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#1a6b4a', light: '#ffffff' },
      }).then(setQrDataUrl)
    }
  }, [step, apartment])

  const createApartment = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/apartments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: step2.name, address: step2.address || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Greška pri kreiranju')
      setApartment(data)
      setStep(3)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const saveGuide = async () => {
    if (!apartment) return
    setLoading(true)
    setError('')
    try {
      const payload: Record<string, string | null> = {}
      if (step3.wifi_name) payload.wifi_name = step3.wifi_name
      if (step3.wifi_password) payload.wifi_password = step3.wifi_password
      if (step3.checkin_time) payload.checkin_time = step3.checkin_time
      if (step3.checkout_time) payload.checkout_time = step3.checkout_time
      if (step3.house_rules) payload.house_rules = step3.house_rules

      if (Object.keys(payload).length > 0) {
        const res = await fetch(`/api/guide/${apartment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Greška pri spremanju')
        }
      }
      setStep(4)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadQR = () => {
    if (!qrDataUrl || !apartment) return
    const link = document.createElement('a')
    link.download = `${apartment.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    link.href = qrDataUrl
    link.click()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md">

        {/* Progress bar */}
        {step < 4 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Korak {step} od 3</span>
              <span className="text-xs text-gray-400">{step === 1 ? '33%' : step === 2 ? '66%' : '100%'}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300"
                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
              />
            </div>
          </div>
        )}

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-5xl mb-4">🏠</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Dobrodošli u CheckinPack!</h1>
            <p className="text-sm text-gray-400 mb-1">Welcome to CheckinPack!</p>
            <p className="text-gray-600 mt-4 mb-8">
              Postavimo vaš prvi apartman u 3 koraka.
              <span className="block text-sm text-gray-400">Let's set up your first apartment in 3 steps.</span>
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-brand text-white rounded-xl font-semibold hover:bg-brand-dark transition-colors"
            >
              Započni / Get started
            </button>
          </div>
        )}

        {/* Step 2 — Apartment basics */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Osnovne informacije</h2>
            <p className="text-sm text-gray-400 mb-6">Apartment basics</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Naziv apartmana <span className="text-red-400">*</span>
                  <span className="text-gray-400 font-normal ml-1">/ Apartment name</span>
                </label>
                <input
                  type="text"
                  value={step2.name}
                  onChange={e => setStep2(p => ({ ...p, name: e.target.value }))}
                  placeholder="npr. Villa Sunce, Apartman Marina"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresa <span className="text-gray-400 font-normal">/ Address</span>
                  <span className="text-gray-400 font-normal ml-1">(neobavezno / optional)</span>
                </label>
                <input
                  type="text"
                  value={step2.address}
                  onChange={e => setStep2(p => ({ ...p, address: e.target.value }))}
                  placeholder="npr. Ul. kralja Tomislava 12, Hvar"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                ← Natrag
              </button>
              <button
                onClick={createApartment}
                disabled={!step2.name.trim() || loading}
                className="flex-[2] py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {loading ? 'Kreiranje...' : 'Dalje →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Guide essentials */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Vodič za goste</h2>
            <p className="text-sm text-gray-400 mb-1">Welcome guide essentials</p>
            <p className="text-xs text-gray-400 mb-6">Sve je neobavezno — možete dodati kasnije. / All optional — add more later.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WiFi naziv</label>
                  <input
                    type="text"
                    value={step3.wifi_name}
                    onChange={e => setStep3(p => ({ ...p, wifi_name: e.target.value }))}
                    placeholder="Naziv mreže"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WiFi lozinka</label>
                  <input
                    type="text"
                    value={step3.wifi_password}
                    onChange={e => setStep3(p => ({ ...p, wifi_password: e.target.value }))}
                    placeholder="Lozinka"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                  <input
                    type="text"
                    value={step3.checkin_time}
                    onChange={e => setStep3(p => ({ ...p, checkin_time: e.target.value }))}
                    placeholder="npr. 15:00"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                  <input
                    type="text"
                    value={step3.checkout_time}
                    onChange={e => setStep3(p => ({ ...p, checkout_time: e.target.value }))}
                    placeholder="npr. 11:00"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jedno pravilo kuće <span className="text-gray-400 font-normal">/ One house rule</span>
                </label>
                <input
                  type="text"
                  value={step3.house_rules}
                  onChange={e => setStep3(p => ({ ...p, house_rules: e.target.value }))}
                  placeholder="npr. Zabranjen boravak kućnih ljubimaca."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                ← Natrag
              </button>
              <button
                onClick={saveGuide}
                disabled={loading}
                className="flex-[2] py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {loading ? 'Spremanje...' : 'Dalje →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && apartment && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Spremno!</h2>
            <p className="text-sm text-gray-400 mb-6">All set!</p>

            <div className="flex justify-center mb-4">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-xl" />
              ) : (
                <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-xs text-gray-400">Generiranje...</span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Preuzmite QR kod i postavite ga u apartmanu.
              <span className="block text-xs text-gray-400 mt-0.5">Download the QR code and place it in your apartment.</span>
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={downloadQR}
                disabled={!qrDataUrl}
                className="w-full py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                Preuzmi QR / Download QR
              </button>
              <a
                href="/dashboard"
                className="w-full py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors text-center block"
              >
                Idi na dashboard / Go to dashboard
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
