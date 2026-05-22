import { supabase } from './supabase'

export type AdminPin = {
  id: string
  lat: number
  lng: number
  text: string | null
  image_path: string | null
  audio_path: string | null
  audio_duration_ms: number | null
  created_at: string
  hidden: boolean
  pin_reports: Array<{ count: number }>
}

export async function listAdminPins(limit = 100): Promise<AdminPin[]> {
  const { data, error } = await supabase.functions.invoke<{ pins: AdminPin[] }>(
    'admin_actions',
    { body: { action: 'list_reports', limit } },
  )
  if (error) throw error
  return data?.pins ?? []
}

export async function setPinHidden(pinId: string, hidden: boolean): Promise<void> {
  const action = hidden ? 'hide_pin' : 'unhide_pin'
  const { error } = await supabase.functions.invoke('admin_actions', {
    body: { action, pin_id: pinId },
  })
  if (error) throw error
}
