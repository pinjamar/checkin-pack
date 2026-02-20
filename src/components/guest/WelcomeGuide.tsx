import { useState } from 'react'

interface LocalTip {
  id: string
  category: string
  name: string
  description: string
  address?: string
}

interface EmergencyContact {
  id: string
  name: string
  phone: string
  label: string
}

interface CustomSection {
  id: string
  title: string
  content: string
}

interface GuideData {
  apartment: {
    name: string
    address: string | null
    cover_image_url: string | null
  }
  guide: {
    wifi_name: string | null
    wifi_password: string | null
    checkin_time: string | null
    checkout_time: string | null
    house_rules: string | null
    local_tips: LocalTip[]
    emergency_contacts: EmergencyContact[]
    custom_sections: CustomSection[]
  }
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string
  icon: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-gray-800">{title}</span>
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  )
}

const CATEGORY_ICONS: Record<string, string> = {
  restaurants: '🍽️',
  beaches: '🏖️',
  transport: '🚌',
  shopping: '🛒',
  activities: '🎯',
  nightlife: '🍷',
  culture: '🏛️',
  nature: '🌿',
}

export default function WelcomeGuide({ data }: { data: GuideData }) {
  const { apartment, guide } = data
  const [copied, setCopied] = useState(false)

  const copyPassword = async () => {
    if (!guide.wifi_password) return
    try {
      await navigator.clipboard.writeText(guide.wifi_password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = guide.wifi_password
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Group local tips by category
  const tipsByCategory = (guide.local_tips || []).reduce<Record<string, LocalTip[]>>(
    (acc, tip) => {
      const cat = tip.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(tip)
      return acc
    },
    {}
  )

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      {/* Hero */}
      {apartment.cover_image_url ? (
        <div className="relative h-56 bg-gray-200">
          <img
            src={apartment.cover_image_url}
            alt={apartment.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h1 className="text-2xl font-bold text-white">{apartment.name}</h1>
            {apartment.address && (
              <p className="text-white/80 text-sm mt-1">{apartment.address}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#1a6b4a] p-6 pt-10 pb-8">
          <h1 className="text-2xl font-bold text-white">{apartment.name}</h1>
          {apartment.address && (
            <p className="text-white/80 text-sm mt-1">{apartment.address}</p>
          )}
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Welcome message */}
        <p className="text-gray-600 text-sm leading-relaxed">
          Welcome! Here's everything you need for a comfortable stay. Tap any section below for details.
        </p>

        {/* WiFi — most important, always visible */}
        {(guide.wifi_name || guide.wifi_password) && (
          <div className="bg-[#e8f5ee] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">📶</span>
              <h2 className="text-lg font-semibold text-[#1a6b4a]">WiFi</h2>
            </div>
            {guide.wifi_name && (
              <div className="mb-2">
                <span className="text-sm text-gray-500">Network</span>
                <p className="font-medium text-gray-800">{guide.wifi_name}</p>
              </div>
            )}
            {guide.wifi_password && (
              <div>
                <span className="text-sm text-gray-500">Password</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-mono text-lg font-medium text-gray-800">
                    {guide.wifi_password}
                  </p>
                  <button
                    onClick={copyPassword}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1a6b4a] text-white hover:bg-[#145538] transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Check-in / Check-out times */}
        {(guide.checkin_time || guide.checkout_time) && (
          <div className="grid grid-cols-2 gap-3">
            {guide.checkin_time && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <span className="text-sm text-gray-500">Check-in</span>
                <p className="text-xl font-semibold text-gray-800 mt-1">{guide.checkin_time}</p>
              </div>
            )}
            {guide.checkout_time && (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <span className="text-sm text-gray-500">Check-out</span>
                <p className="text-xl font-semibold text-gray-800 mt-1">{guide.checkout_time}</p>
              </div>
            )}
          </div>
        )}

        {/* House Rules */}
        {guide.house_rules && (
          <CollapsibleSection title="House Rules" icon="📋">
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {guide.house_rules}
            </div>
          </CollapsibleSection>
        )}

        {/* Local Tips */}
        {Object.keys(tipsByCategory).length > 0 && (
          <CollapsibleSection title="Local Tips" icon="📍">
            <div className="space-y-4">
              {Object.entries(tipsByCategory).map(([category, tips]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <span>{CATEGORY_ICONS[category] || '📌'}</span>
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {tips.map((tip) => (
                      <div key={tip.id} className="bg-gray-50 rounded-lg p-3">
                        <p className="font-medium text-gray-800 text-sm">{tip.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{tip.description}</p>
                        {tip.address && (
                          <p className="text-[#1a6b4a] text-xs mt-1">{tip.address}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Emergency Contacts */}
        {guide.emergency_contacts && guide.emergency_contacts.length > 0 && (
          <CollapsibleSection title="Emergency Contacts" icon="🆘">
            <div className="space-y-2">
              {guide.emergency_contacts.map((contact) => (
                <a
                  key={contact.id}
                  href={`tel:${contact.phone}`}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{contact.name}</p>
                    <p className="text-gray-500 text-xs">{contact.label}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[#1a6b4a]">
                    <span className="text-sm font-medium">{contact.phone}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Custom Sections */}
        {guide.custom_sections &&
          guide.custom_sections.map((section) => (
            <CollapsibleSection key={section.id} title={section.title} icon="📄">
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {section.content}
              </div>
            </CollapsibleSection>
          ))}

        {/* Footer */}
        <div className="pt-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a href="https://checkinpack.hr" className="text-[#1a6b4a] font-medium">
              CheckinPack.hr
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
