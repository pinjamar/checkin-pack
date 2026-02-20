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
  id,
  name,
  address,
  slug,
  cover_image_url,
  is_active,
  bookingsThisMonth,
  pendingRegistrations,
}: ApartmentCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Cover */}
      <div className="h-36 bg-gray-100 relative">
        {cover_image_url ? (
          <img src={cover_image_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#e8f5ee] to-[#d0e8da]">
            <span className="text-4xl">🏠</span>
          </div>
        )}
        {!is_active && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-gray-800/70 text-white text-xs rounded-full">
            Inactive
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">{name}</h3>
        {address && <p className="text-sm text-gray-500 mt-0.5">{address}</p>}

        {/* Stats */}
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span>{bookingsThisMonth} bookings this month</span>
          {pendingRegistrations > 0 && (
            <span className="text-amber-600 font-medium">
              {pendingRegistrations} pending
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <a
            href={`/dashboard/apartment/${id}/guide`}
            className="flex-1 text-center px-3 py-2 text-sm font-medium bg-[#e8f5ee] text-[#1a6b4a] rounded-lg hover:bg-[#d0e8da] transition-colors"
          >
            Edit Guide
          </a>
          <a
            href={`/dashboard/apartment/${id}/bookings`}
            className="flex-1 text-center px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Bookings
          </a>
          <a
            href={`/dashboard/apartment/${id}/qr`}
            className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="QR Code"
          >
            QR
          </a>
        </div>
      </div>
    </div>
  )
}
