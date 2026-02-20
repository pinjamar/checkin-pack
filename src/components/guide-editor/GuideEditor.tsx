import { useState } from 'react'
import LocalTipsEditor from './LocalTipsEditor'
import ContactsEditor from './ContactsEditor'

interface GuideData {
  wifi_name: string | null
  wifi_password: string | null
  checkin_time: string | null
  checkout_time: string | null
  house_rules: string | null
  local_tips: any[]
  emergency_contacts: any[]
  custom_sections: any[]
}

interface GuideEditorProps {
  apartmentId: string
  initialData: GuideData
}

export default function GuideEditor({ apartmentId, initialData }: GuideEditorProps) {
  const [data, setData] = useState<GuideData>({
    wifi_name: initialData.wifi_name || '',
    wifi_password: initialData.wifi_password || '',
    checkin_time: initialData.checkin_time || '',
    checkout_time: initialData.checkout_time || '',
    house_rules: initialData.house_rules || '',
    local_tips: initialData.local_tips || [],
    emergency_contacts: initialData.emergency_contacts || [],
    custom_sections: initialData.custom_sections || [],
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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
    update(
      'custom_sections',
      data.custom_sections.map((s: any) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const removeCustomSection = (id: string) => {
    update(
      'custom_sections',
      data.custom_sections.filter((s: any) => s.id !== id)
    )
  }

  const save = async () => {
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
      } else {
        const result = await res.json()
        setError(result.error || 'Failed to save')
      }
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
              placeholder="e.g. Villa_Sunce_WiFi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="text"
              value={data.wifi_password || ''}
              onChange={(e) => update('wifi_password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
              placeholder="e.g. 14:00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check-out time</label>
            <input
              type="text"
              value={data.checkout_time || ''}
              onChange={(e) => update('checkout_time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]"
              placeholder="e.g. 10:00"
            />
          </div>
        </div>
      </section>

      {/* House Rules */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span>📋</span> House Rules
        </h2>
        <textarea
          value={data.house_rules || ''}
          onChange={(e) => update('house_rules', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6b4a] resize-y"
          placeholder="e.g. No smoking indoors&#10;Quiet hours: 23:00 - 07:00&#10;Please separate recycling"
        />
      </section>

      {/* Local Tips */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
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
            className="text-sm text-[#1a6b4a] font-medium hover:underline"
          >
            + Add section
          </button>
        </div>

        {data.custom_sections.length === 0 && (
          <p className="text-sm text-gray-400">Add custom sections like parking instructions, pool rules, etc.</p>
        )}

        <div className="space-y-3">
          {data.custom_sections.map((section: any) => (
            <div key={section.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
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
                  onClick={() => removeCustomSection(section.id)}
                  className="px-2 text-gray-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>
              <textarea
                value={section.content}
                onChange={(e) => updateCustomSection(section.id, 'content', e.target.value)}
                placeholder="Section content"
                rows={3}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm resize-y"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="sticky bottom-0 bg-gray-50 -mx-4 px-4 py-4 md:-mx-8 md:px-8 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 bg-[#1a6b4a] text-white rounded-lg font-medium hover:bg-[#145538] disabled:opacity-50 transition-colors text-sm"
          >
            {saving ? 'Saving...' : 'Save Guide'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  )
}
