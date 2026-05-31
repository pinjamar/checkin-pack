export interface GuestData {
  full_name: string
  document_type: string
  document_number: string
  nationality: string
  date_of_birth: string
  gender?: string
  country_of_birth?: string
  country_of_residence?: string
  city_of_residence?: string
}

// Maps English country names (as stored by the guest registration form)
// to "Croatian / English" format for the eVisitor data card
const NATIONALITY_MAP: Record<string, string> = {
  'Afghanistan': 'Afganistan / Afghanistan',
  'Albania': 'Albanija / Albania',
  'Algeria': 'Alžir / Algeria',
  'Andorra': 'Andora / Andorra',
  'Angola': 'Angola / Angola',
  'Argentina': 'Argentina / Argentina',
  'Armenia': 'Armenija / Armenia',
  'Australia': 'Australija / Australia',
  'Austria': 'Austrija / Austria',
  'Azerbaijan': 'Azerbajdžan / Azerbaijan',
  'Bahrain': 'Bahrein / Bahrain',
  'Bangladesh': 'Bangladeš / Bangladesh',
  'Belarus': 'Bjelorusija / Belarus',
  'Belgium': 'Belgija / Belgium',
  'Bolivia': 'Bolivija / Bolivia',
  'Bosnia and Herzegovina': 'Bosna i Hercegovina / Bosnia and Herzegovina',
  'Brazil': 'Brazil / Brazil',
  'Bulgaria': 'Bugarska / Bulgaria',
  'Cambodia': 'Kambodža / Cambodia',
  'Canada': 'Kanada / Canada',
  'Chile': 'Čile / Chile',
  'China': 'Kina / China',
  'Colombia': 'Kolumbija / Colombia',
  'Croatia': 'Hrvatska / Croatia',
  'Cyprus': 'Cipar / Cyprus',
  'Czech Republic': 'Češka / Czech Republic',
  'Denmark': 'Danska / Denmark',
  'Egypt': 'Egipat / Egypt',
  'Estonia': 'Estonija / Estonia',
  'Finland': 'Finska / Finland',
  'France': 'Francuska / France',
  'Georgia': 'Gruzija / Georgia',
  'Germany': 'Njemačka / Germany',
  'Ghana': 'Gana / Ghana',
  'Greece': 'Grčka / Greece',
  'Hungary': 'Mađarska / Hungary',
  'Iceland': 'Island / Iceland',
  'India': 'Indija / India',
  'Indonesia': 'Indonezija / Indonesia',
  'Iran': 'Iran / Iran',
  'Iraq': 'Irak / Iraq',
  'Ireland': 'Irska / Ireland',
  'Israel': 'Izrael / Israel',
  'Italy': 'Italija / Italy',
  'Japan': 'Japan / Japan',
  'Jordan': 'Jordan / Jordan',
  'Kazakhstan': 'Kazahstan / Kazakhstan',
  'Kenya': 'Kenija / Kenya',
  'Kosovo': 'Kosovo / Kosovo',
  'Kuwait': 'Kuvajt / Kuwait',
  'Latvia': 'Latvija / Latvia',
  'Lebanon': 'Libanon / Lebanon',
  'Libya': 'Libija / Libya',
  'Liechtenstein': 'Lihtenštajn / Liechtenstein',
  'Lithuania': 'Litva / Lithuania',
  'Luxembourg': 'Luksemburg / Luxembourg',
  'Malaysia': 'Malezija / Malaysia',
  'Malta': 'Malta / Malta',
  'Mexico': 'Meksiko / Mexico',
  'Moldova': 'Moldavija / Moldova',
  'Monaco': 'Monako / Monaco',
  'Montenegro': 'Crna Gora / Montenegro',
  'Morocco': 'Maroko / Morocco',
  'Netherlands': 'Nizozemska / Netherlands',
  'New Zealand': 'Novi Zeland / New Zealand',
  'Nigeria': 'Nigerija / Nigeria',
  'North Macedonia': 'Sjeverna Makedonija / North Macedonia',
  'Norway': 'Norveška / Norway',
  'Pakistan': 'Pakistan / Pakistan',
  'Philippines': 'Filipini / Philippines',
  'Poland': 'Poljska / Poland',
  'Portugal': 'Portugal / Portugal',
  'Qatar': 'Katar / Qatar',
  'Romania': 'Rumunjska / Romania',
  'Russia': 'Rusija / Russia',
  'Saudi Arabia': 'Saudijska Arabija / Saudi Arabia',
  'Serbia': 'Srbija / Serbia',
  'Singapore': 'Singapur / Singapore',
  'Slovakia': 'Slovačka / Slovakia',
  'Slovenia': 'Slovenija / Slovenia',
  'South Africa': 'Južna Afrika / South Africa',
  'South Korea': 'Južna Koreja / South Korea',
  'Spain': 'Španjolska / Spain',
  'Sweden': 'Švedska / Sweden',
  'Switzerland': 'Švicarska / Switzerland',
  'Syria': 'Sirija / Syria',
  'Thailand': 'Tajland / Thailand',
  'Tunisia': 'Tunis / Tunisia',
  'Turkey': 'Turska / Turkey',
  'Ukraine': 'Ukrajina / Ukraine',
  'United Arab Emirates': 'Ujedinjeni Arapski Emirati / United Arab Emirates',
  'United Kingdom': 'Ujedinjeno Kraljevstvo / United Kingdom',
  'United States': 'Sjedinjene Države / United States',
  'Vietnam': 'Vijetnam / Vietnam',
}

export function formatNationality(name: string): string {
  return NATIONALITY_MAP[name] ?? name
}

// Convert ISO date "YYYY-MM-DD" → Croatian format "DD.MM.YYYY"
export function formatDateHR(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

export type FieldInputType = 'text' | 'select' | 'autocomplete'

export function formatForEvisitor(
  guest: GuestData,
  booking: { arrival_date: string; departure_date: string }
): { field: string; value: string; inputType: FieldInputType }[] {
  // Split "LASTNAME Firstname" → separate fields matching eVisitor's form order
  const nameParts = guest.full_name.split(' ')
  const surname = (nameParts[0] || '').toUpperCase()
  const firstName = nameParts.slice(1).join(' ') || ''

  const genderDisplay = guest.gender === 'male' ? 'Muški / Male' : guest.gender === 'female' ? 'Ženski / Female' : ''

  const rows: { field: string; value: string; inputType: FieldInputType }[] = [
    { field: 'Vrsta isprave (Document type)', value: guest.document_type === 'passport' ? 'Putovnica / Passport' : 'Osobna iskaznica / ID Card', inputType: 'select' },
    { field: 'Broj isprave (Document number)', value: guest.document_number, inputType: 'text' },
    { field: 'Prezime (Surname)', value: surname, inputType: 'text' },
    { field: 'Ime (First name)', value: firstName, inputType: 'text' },
  ]

  rows.push(
    { field: 'Spol (Gender)', value: genderDisplay || '—', inputType: 'select' },
    { field: 'Država prebivališta (Country of residence)', value: guest.country_of_residence ? formatNationality(guest.country_of_residence) : '—', inputType: 'autocomplete' },
    { field: 'Grad prebivališta (City of residence)', value: guest.city_of_residence || '—', inputType: 'text' },
    { field: 'Država rođenja (Country of birth)', value: guest.country_of_birth ? formatNationality(guest.country_of_birth) : '—', inputType: 'autocomplete' },
    { field: 'Datum rođenja (Date of birth)', value: formatDateHR(guest.date_of_birth), inputType: 'text' },
    { field: 'Državljanstvo (Nationality)', value: formatNationality(guest.nationality), inputType: 'autocomplete' },
    { field: 'Datum dolaska (Arrival date)', value: formatDateHR(booking.arrival_date), inputType: 'text' },
    { field: 'Datum odlaska (Departure date)', value: formatDateHR(booking.departure_date), inputType: 'text' },
  )

  return rows
}
