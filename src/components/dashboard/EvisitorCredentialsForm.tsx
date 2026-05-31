import { useState, useEffect } from 'react'

export default function EvisitorCredentialsForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch('/api/owner/evisitor-credentials')
      .then(r => r.json())
      .then(data => {
        setUsername(data.username || '')
        setHasPassword(data.has_password || false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setSaving(true)
    setStatus('idle')
    try {
      const res = await fetch('/api/owner/evisitor-credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErrorMsg(d.error || 'Save failed')
        setStatus('error')
      } else {
        setStatus('saved')
        setHasPassword(true)
        setPassword('')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setErrorMsg('Network error')
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400">Učitavanje...</div>
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          eVisitor korisničko ime
        </label>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="npr. 25938444047"
          autoComplete="off"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          eVisitor lozinka
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={hasPassword ? 'Unesite novu lozinku da je promijenite' : 'Lozinka'}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        {hasPassword && !password && (
          <p className="text-xs text-gray-400 mt-1">Lozinka je pohranjena. Ostavite prazno da zadržite trenutnu.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !username || (!password && !hasPassword)}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Sprema...' : 'Spremi'}
        </button>

        {status === 'saved' && (
          <span className="text-sm text-green-600 font-medium">Spremljeno</span>
        )}
        {status === 'error' && (
          <span className="text-sm text-red-600">{errorMsg}</span>
        )}
      </div>
    </form>
  )
}
