interface LocalTip {
  id: string
  category: string
  name: string
  description: string
  address?: string
}

const CATEGORIES = [
  'restaurants',
  'beaches',
  'transport',
  'shopping',
  'activities',
  'nightlife',
  'culture',
  'nature',
]

interface LocalTipsEditorProps {
  tips: LocalTip[]
  onChange: (tips: LocalTip[]) => void
}

export default function LocalTipsEditor({ tips, onChange }: LocalTipsEditorProps) {
  const addTip = () => {
    onChange([
      ...tips,
      {
        id: crypto.randomUUID(),
        category: 'restaurants',
        name: '',
        description: '',
        address: '',
      },
    ])
  }

  const updateTip = (id: string, field: keyof LocalTip, value: string) => {
    onChange(tips.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const removeTip = (id: string) => {
    onChange(tips.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800">Local Tips</h3>
        <button
          type="button"
          onClick={addTip}
          className="text-sm text-[#1a6b4a] font-medium hover:underline"
        >
          + Add tip
        </button>
      </div>

      {tips.length === 0 && (
        <p className="text-sm text-gray-400">No tips yet. Add restaurants, beaches, and other recommendations for your guests.</p>
      )}

      <div className="space-y-3">
        {tips.map((tip) => (
          <div key={tip.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <select
                value={tip.category}
                onChange={(e) => updateTip(tip.id, 'category', e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={tip.name}
                onChange={(e) => updateTip(tip.id, 'name', e.target.value)}
                placeholder="Name"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={() => removeTip(tip.id)}
                className="px-2 text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={tip.description}
              onChange={(e) => updateTip(tip.id, 'description', e.target.value)}
              placeholder="Short description"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              value={tip.address || ''}
              onChange={(e) => updateTip(tip.id, 'address', e.target.value)}
              placeholder="Address (optional)"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
