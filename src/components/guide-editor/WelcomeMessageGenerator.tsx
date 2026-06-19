import { useState } from 'react'
import UpgradePrompt from '../dashboard/UpgradePrompt'

type Tone = 'warm' | 'professional' | 'minimal'

const TONES: { value: Tone; hr: string; en: string }[] = [
  { value: 'warm', hr: 'Topla', en: 'Warm' },
  { value: 'professional', hr: 'Profesionalna', en: 'Professional' },
  { value: 'minimal', hr: 'Minimalna', en: 'Minimal' },
]

interface Props {
  apartmentName: string
  apartmentAddress?: string | null
  houseRules?: string | null
  initialMessage?: string | null
  initialTone?: string | null
  onChange: (message: string, tone: Tone) => void
}

export default function WelcomeMessageGenerator({
  apartmentName,
  apartmentAddress,
  houseRules,
  initialMessage,
  initialTone,
  onChange,
}: Props) {
  const [open, setOpen] = useState(!!initialMessage)
  const [tone, setTone] = useState<Tone>((initialTone as Tone) || 'warm')
  const [preview, setPreview] = useState<string>(initialMessage || '')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [saved, setSaved] = useState(!!initialMessage)

  const generate = async () => {
    setGenerating(true)
    setGenError('')
    setShowUpgrade(false)
    try {
      const res = await fetch('/api/ai/generate-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apartment_name: apartmentName,
          location: apartmentAddress,
          tone,
          house_rules_summary: houseRules?.slice(0, 300) || '',
          local_tips_summary: '',
        }),
      })
      if (res.status === 403) {
        setShowUpgrade(true)
        return
      }
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Generation failed')
      }
      const d = await res.json()
      setPreview(d.welcome_message)
      setSaved(false)
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const save = () => {
    onChange(preview, tone)
    setSaved(true)
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>💬</span>
          <span>AI Dobrodošlica / AI Welcome Message</span>
          {saved && <span className="text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Saved</span>}
        </h2>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {showUpgrade ? (
            <UpgradePrompt feature="ai_welcome" />
          ) : (
            <>
              {/* Tone selector */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Ton / Tone</p>
                <div className="flex gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { setTone(t.value); setSaved(false) }}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        tone === t.value
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'
                      }`}
                    >
                      {t.hr} / {t.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="text-sm px-4 py-2 bg-linear-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                {generating
                  ? 'AI piše... / AI writing...'
                  : preview
                  ? '↺ Regeneriraj / Regenerate'
                  : '✨ Generiraj / Generate'}
              </button>

              {genError && <p className="text-xs text-red-600">{genError}</p>}

              {/* Preview / edit */}
              {preview && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Pregled / Preview — možete urediti / you can edit</p>
                  <textarea
                    value={preview}
                    onChange={(e) => { setPreview(e.target.value); setSaved(false) }}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-y font-sans"
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={save}
                      className="px-4 py-1.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
                    >
                      Spremi / Save
                    </button>
                    {saved && <span className="text-sm text-green-600">Saved! Click "Save Guide" to persist.</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
