import { useState, useRef } from 'react'

interface ApartmentCardProps {
  id: string
  name: string
  slug: string
  address: string | null
  cover_image_url: string | null
  is_active: boolean
  bookingsThisMonth: number
  pendingRegistrations: number
}

export default function ApartmentCard({
  id, name, address, slug, cover_image_url, is_active, bookingsThisMonth, pendingRegistrations,
}: ApartmentCardProps) {
  const [imageUrl, setImageUrl] = useState(cover_image_url)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB')
      return
    }
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch(`/api/apartments/${id}/upload-image`, { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) setImageUrl(data.url)
      else setError(data.error || 'Upload failed')
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Cover */}
      <div
        className="h-36 bg-gray-100 relative group cursor-pointer"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e8f5ee] to-[#d0e8da]">
            <span className="text-4xl">🏠</span>
          </div>
        )}

        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-white text-sm font-medium">
            {uploading ? 'Uploading...' : '📷 Change photo'}
          </span>
        </div>

        {!is_active && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-800/70 text-white text-xs rounded-full">
            Inactive
          </span>
        )}

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {error && <p className="text-xs text-red-600 px-4 pt-2">{error}</p>}

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        {address && <p className="text-sm text-gray-500 mt-0.5">{address}</p>}

        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span>{bookingsThisMonth} bookings this month</span>
          {pendingRegistrations > 0 && (
            <span className="text-amber-600 font-medium">{pendingRegistrations} pending</span>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <a href={`/dashboard/apartment/${id}/guide`}
            className="flex-1 text-center px-3 py-2 text-sm font-medium bg-[#e8f5ee] text-[#1a6b4a] rounded-lg hover:bg-[#d0e8da] transition-colors">
            Edit Guide
          </a>
          <a href={`/dashboard/apartment/${id}/bookings`}
            className="flex-1 text-center px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Bookings
          </a>
          <a href={`/dashboard/apartment/${id}/qr`}
            className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="QR Code">
            QR
          </a>
          <a href={`/dashboard/apartment/${id}/settings`}
            className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Postavke">
            ⚙️
          </a>
        </div>
      </div>
    </div>
  )
}
