interface EmergencyContact {
  id: string
  name: string
  phone: string
  label: string
}

interface ContactsEditorProps {
  contacts: EmergencyContact[]
  onChange: (contacts: EmergencyContact[]) => void
}

export default function ContactsEditor({ contacts, onChange }: ContactsEditorProps) {
  const addContact = () => {
    onChange([
      ...contacts,
      {
        id: crypto.randomUUID(),
        name: '',
        phone: '',
        label: '',
      },
    ])
  }

  const updateContact = (id: string, field: keyof EmergencyContact, value: string) => {
    onChange(contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const removeContact = (id: string) => {
    onChange(contacts.filter((c) => c.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800">Emergency Contacts</h3>
        <button
          type="button"
          onClick={addContact}
          className="text-sm text-[#1a6b4a] font-medium hover:underline"
        >
          + Add contact
        </button>
      </div>

      {contacts.length === 0 && (
        <p className="text-sm text-gray-400">Add emergency contacts like your phone number, property manager, local hospital, etc.</p>
      )}

      <div className="space-y-3">
        {contacts.map((contact) => (
          <div key={contact.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={contact.name}
                onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                placeholder="Name (e.g. Host, Hospital)"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={() => removeContact(contact.id)}
                className="px-2 text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={contact.phone}
                onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                placeholder="Phone number"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={contact.label}
                onChange={(e) => updateContact(contact.id, 'label', e.target.value)}
                placeholder="Label (e.g. Owner, Emergency)"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
