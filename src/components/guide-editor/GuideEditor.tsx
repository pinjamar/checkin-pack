import { useState } from 'react'
import LocalTipsEditor from './LocalTipsEditor'
import ContactsEditor from './ContactsEditor'
import UpgradePrompt from '../dashboard/UpgradePrompt'
import WelcomeMessageGenerator from './WelcomeMessageGenerator'

async function generateSection(apartmentId: string, section: 'house_rules' | 'local_tips') {
  const res = await fetch(`/api/guide/${apartmentId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section }),
  })
  if (!res.ok) {
    const d = await res.json()
    throw new Error(d.error || 'Generation failed')
  }
  return res.json()
}

interface GuideData {
  wifi_name: string | null
  wifi_password: string | null
  checkin_time: string | null
  checkout_time: string | null
  house_rules: string | null
  local_tips: any[]
  emergency_contacts: any[]
  custom_sections: any[]
  ai_welcome_message: string | null
  ai_welcome_tone: string | null
}

interface GuideEditorProps {
  apartmentId: string
  apartmentName: string
  apartmentAddress?: string | null
  initialData: GuideData
  isPro?: boolean
}

export default function GuideEditor({ apartmentId, apartmentName, apartmentAddress, initialData, isPro }: GuideEditorProps) {
  const [data, setData] = useState<GuideData>({
    wifi_name: initialData.wifi_name || '',
    wifi_password: initialData.wifi_password || '',
    checkin_time: initialData.checkin_time || '',
    checkout_time: initialData.checkout_time || '',
    house_rules: initialData.house_rules || '',
    local_tips: initialData.local_tips || [],
    emergency_contacts: initialData.emergency_contacts || [],
    custom_sections: initialData.custom_sections || [],
    ai_welcome_message: initialData.ai_welcome_message || null,
    ai_welcome_tone: initialData.ai_welcome_tone || 'warm',
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState<'house_rules' | 'local_tips' | null>(null)
  const [genError, setGenError] = useState('')
  const [formatting, setFormatting] = useState(false)
  const [formatPreview, setFormatPreview] = useState<string | null>(null)
  const [formatError, setFormatError] = useState('')
  const [showFormatUpgrade, setShowFormatUpgrade] = useState(false)
  const [savedSectionIds, setSavedSectionIds] = useState<Set<string>>(
    new Set((initialData.custom_sections || []).map((s: any) => s.id))
  )
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyApartments, setCopyApartments] = useState<{ id: string; name: string }[]>([])
  const [copyLoading, setCopyLoading] = useState(false)

  const update = (field: keyof GuideData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const addCustomSection = () => {
    update('custom_sections', [
      ...data.custom_sections,
      { id: crypto.randomUUID(), title: '', content: '' },
    ])
  }

  const updateCustomSection = (id: string, field: string, value: string) => {
    setSavedSectionIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    update(
      'custom_sections',
      data.custom_sections.map((s: any) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const removeCustomSection = (id: string) => {
    setSavedSectionIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    update(
      'custom_sections',
      data.custom_sections.filter((s: any) => s.id !== id)
    )
    setConfirmDeleteId(null)
  }

  const save = async (): Promise<boolean> => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/guide/${apartmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        setSaved(true)
        return true
      } else {
        const result = await res.json()
        setError(result.error || 'Failed to save')
        return false
      }
    } catch {
      setError('Network error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const openCopyModal = async () => {
    setCopyLoading(true)
    setShowCopyModal(true)
    try {
      const res = await fetch('/api/apartments')
      if (res.ok) {
        const all = await res.json()
        setCopyApartments(all.filter((a: any) => a.id !== apartmentId))
      }
    } finally {
      setCopyLoading(false)
    }
  }

  const copyFromApartment = async (sourceId: string, sourceName: string) => {
    setCopyLoading(true)
    try {
      const res = await fetch(`/api/guide/${sourceId}`)
      if (res.ok) {
        const g = await res.json()
        setData({
          wifi_name: g.wifi_name || '',
          wifi_password: g.wifi_password || '',
          checkin_time: g.checkin_time || '',
          checkout_time: g.checkout_time || '',
          house_rules: g.house_rules || '',
          local_tips: g.local_tips || [],
          emergency_contacts: g.emergency_contacts || [],
          custom_sections: g.custom_sections || [],
          ai_welcome_message: g.ai_welcome_message || null,
          ai_welcome_tone: g.ai_welcome_tone || 'warm',
        })
        setSavedSectionIds(new Set())
        setSaved(false)
        setShowCopyModal(false)
      }
    } finally {
      setCopyLoading(false)
    }
  }

  const generate = async (section: 'house_rules' | 'local_tips') => {
    setGenerating(section)
    setGenError('')
    try {
      const data = await generateSection(apartmentId, section)
      if (section === 'house_rules') update('house_rules', data.content)
      if (section === 'local_tips') update('local_tips', data.tips)
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(null)
    }
  }

  const formatHouseRules = async () => {
    if (!data.house_rules?.trim()) return
    setFormatting(true)
    setFormatError('')
    setFormatPreview(null)
    setShowFormatUpgrade(false)
    try {
      const res = await fetch('/api/ai/format-house-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_rules: data.house_rules }),
      })
      if (res.status === 403) {
        setShowFormatUpgrade(true)
        return
      }
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Formatting failed')
      }
      const d = await res.json()
      setFormatPreview(d.formatted_rules)
    } catch (e: any) {
      setFormatError(e.message)
    } finally {
      setFormatting(false)
    }
  }

  const saveSectionConfirm = async (id: string) => {
    const ok = await save()
    if (ok) {
      setSavedSectionIds((prev) => new Set(prev).add(id))
    }
  }

  return (
    <div className="space-y-6">
      {/* WiFi */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>📶</span> WiFi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Network name</label>
            <input
              type="text"
              value={data.wifi_name || ''}
              onChange={(e) => update('wifi_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="e.g. Villa_Sunce_WiFi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="text"
              value={data.wifi_password || ''}
              onChange={(e) => update('wifi_password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="WiFi password"
            />
          </div>
        </div>
      </section>

      {/* Check-in / Check-out */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>🕐</span> Check-in / Check-out
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-in time</label>
            <input
              type="text"
              value={data.checkin_time || ''}
              onChange={(e) => update('checkin_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="e.g. 14:00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-out time</label>
            <input
              type="text"
              value={data.checkout_time || ''}
              onChange={(e) => update('checkout_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="e.g. 10:00"
            />
          </div>
        </div>
      </section>

      {/* House Rules */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <span>📋</span> House Rules
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generate('house_rules')}
              disabled={generating === 'house_rules' || formatting}
              className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {generating === 'house_rules' ? 'Generating...' : '✨ Generate with AI'}
            </button>
            <button
              type="button"
              onClick={formatHouseRules}
              disabled={formatting || generating === 'house_rules' || !data.house_rules?.trim()}
              className="text-xs px-2.5 py-1 bg-linear-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-40 transition-all"
            >
              {formatting ? 'AI piše... / AI writing...' : '✨ Poboljšaj s AI / Format with AI'}
            </button>
          </div>
        </div>
        <textarea
          value={data.house_rules || ''}
          onChange={(e) => { update('house_rules', e.target.value); setFormatPreview(null); setShowFormatUpgrade(false) }}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-y"
          placeholder="e.g. No smoking indoors&#10;Quiet hours: 23:00 - 07:00&#10;Please separate recycling"
        />
        {formatError && (
          <p className="mt-2 text-xs text-red-600">{formatError}</p>
        )}
        {showFormatUpgrade && (
          <div className="mt-3">
            <UpgradePrompt feature="ai_house_rules" />
          </div>
        )}
        {formatPreview && (
          <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
            <p className="text-xs font-medium text-violet-700 mb-2">AI Preview</p>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{formatPreview}</pre>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => { update('house_rules', formatPreview); setFormatPreview(null) }}
                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
              >
                Koristi ovo / Use this
              </button>
              <button
                type="button"
                onClick={() => setFormatPreview(null)}
                className="px-3 py-1.5 bg-white text-gray-600 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Odbaci / Discard
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Local Tips */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <span />
          <button
            type="button"
            onClick={() => generate('local_tips')}
            disabled={generating === 'local_tips'}
            className="text-xs px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            {generating === 'local_tips' ? 'Generating...' : '✨ Generate with AI'}
          </button>
        </div>
        <LocalTipsEditor
          tips={data.local_tips}
          onChange={(tips) => update('local_tips', tips)}
        />
      </section>

      {/* Emergency Contacts */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <ContactsEditor
          contacts={data.emergency_contacts}
          onChange={(contacts) => update('emergency_contacts', contacts)}
        />
      </section>

      {/* Custom Sections */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-800">Custom Sections</h3>
          <button
            type="button"
            onClick={addCustomSection}
            className="text-sm text-brand font-medium hover:underline"
          >
            + Add section
          </button>
        </div>

        {data.custom_sections.length === 0 && (
          <p className="text-sm text-gray-400">Add custom sections like parking instructions, pool rules, etc.</p>
        )}

        <div className="space-y-3">
          {data.custom_sections.map((section: any) => (
            <div key={section.id} className={`rounded-lg p-3 space-y-2 transition-colors duration-500 ${savedSectionIds.has(section.id) ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateCustomSection(section.id, 'title', e.target.value)}
                  placeholder="Section title"
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(section.id)}
                  className="px-2 text-xs text-gray-400 hover:text-red-500"
                >
                  Delete
                </button>
              </div>
              <textarea
                value={section.content}
                onChange={(e) => updateCustomSection(section.id, 'content', e.target.value)}
                placeholder="Section content"
                rows={3}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm resize-y"
              />
              {!savedSectionIds.has(section.id) && (
                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => saveSectionConfirm(section.id)}
                    disabled={saving}
                    className="px-3 py-1 bg-brand text-white rounded-lg text-xs font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* AI Welcome Message */}
      <WelcomeMessageGenerator
        apartmentName={apartmentName}
        apartmentAddress={apartmentAddress}
        houseRules={data.house_rules}
        initialMessage={data.ai_welcome_message}
        initialTone={data.ai_welcome_tone}
        onChange={(message, tone) => {
          update('ai_welcome_message', message)
          update('ai_welcome_tone', tone)
        }}
      />

      {/* Copy from apartment modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-96 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">Copy guide from...</p>
              <button type="button" onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-500">All fields (WiFi, rules, tips, sections) will be replaced with the selected apartment's guide. You can still edit before saving.</p>
            {copyLoading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
            ) : copyApartments.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No other apartments found.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {copyApartments.map((apt) => (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => copyFromApartment(apt.id, apt.name)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-brand hover:bg-green-50 transition-colors text-sm font-medium text-gray-800"
                  >
                    {apt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-80 space-y-4">
            <p className="font-semibold text-gray-800">Delete this section?</p>
            <p className="text-sm text-gray-500">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeCustomSection(confirmDeleteId)}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="sticky bottom-0 bg-gray-50 -mx-4 px-4 py-4 md:-mx-8 md:px-8 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Save Guide'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
          {genError && <span className="text-sm text-red-600">AI: {genError}</span>}
        </div>
      </div>
    </div>
  )
}
