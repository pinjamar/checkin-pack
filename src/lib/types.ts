export interface Owner {
  id: string
  full_name: string | null
  phone: string | null
  plan: 'free' | 'pro'
  created_at: string
}

export interface Apartment {
  id: string
  owner_id: string
  name: string
  slug: string
  address: string | null
  cover_image_url: string | null
  is_active: boolean
  created_at: string
}

export interface GuideContent {
  id: string
  apartment_id: string
  wifi_name: string | null
  wifi_password: string | null
  checkin_time: string | null
  checkout_time: string | null
  house_rules: string | null
  local_tips: LocalTip[]
  emergency_contacts: EmergencyContact[]
  custom_sections: CustomSection[]
  updated_at: string
}

export interface LocalTip {
  id: string
  category: string
  name: string
  description: string
  address?: string
}

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  label: string
}

export interface CustomSection {
  id: string
  title: string
  content: string
}

export interface Booking {
  id: string
  apartment_id: string
  guest_name: string | null
  guest_email: string | null
  arrival_date: string
  departure_date: string
  pre_arrival_token: string
  pre_arrival_link_sent: boolean
  registration_status: 'pending' | 'sent' | 'completed'
  created_at: string
}

export interface GuestRegistration {
  id: string
  booking_id: string
  full_name: string
  document_type: string
  document_number_encrypted: string | null
  nationality: string
  date_of_birth: string
  gdpr_consent: boolean
  gdpr_consent_at: string | null
  submitted_at: string
  auto_delete_at: string | null
}

export interface ScanEvent {
  id: string
  apartment_id: string
  scanned_at: string
  device_type: string | null
}
