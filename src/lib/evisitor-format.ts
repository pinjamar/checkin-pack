export interface GuestData {
  full_name: string
  document_type: string
  document_number: string
  nationality: string
  date_of_birth: string
}

// Convert ISO date "YYYY-MM-DD" → Croatian format "DD.MM.YYYY"
function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

export function formatForEvisitor(
  guest: GuestData,
  booking: { arrival_date: string; departure_date: string }
) {
  return [
    { field: 'Prezime i ime (Surname and name)', value: guest.full_name.toUpperCase() },
    {
      field: 'Vrsta isprave (Document type)',
      value:
        guest.document_type === 'passport'
          ? 'Putovnica / Passport'
          : 'Osobna iskaznica / ID Card',
    },
    { field: 'Broj isprave (Document number)', value: guest.document_number },
    { field: 'Državljanstvo (Nationality)', value: guest.nationality },
    { field: 'Datum rođenja (Date of birth)', value: formatDate(guest.date_of_birth) },
    { field: 'Datum dolaska (Arrival date)', value: formatDate(booking.arrival_date) },
    { field: 'Datum odlaska (Departure date)', value: formatDate(booking.departure_date) },
  ]
}
