export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
export const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function assertEnv(name: string, value: string | undefined): asserts value is string {
  if (!value) {
    throw new Error(
      `Missing env var ${name}. Copy .env.local.example to .env.local and fill it in.`,
    )
  }
}

assertEnv('VITE_GOOGLE_MAPS_API_KEY', GOOGLE_MAPS_API_KEY)
assertEnv('VITE_GOOGLE_MAPS_MAP_ID', GOOGLE_MAPS_MAP_ID)
assertEnv('VITE_SUPABASE_URL', SUPABASE_URL)
assertEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_PUBLISHABLE_KEY)
