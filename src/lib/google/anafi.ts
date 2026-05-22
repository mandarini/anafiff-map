export const ANAFI_CENTER = { lat: 36.355, lng: 25.77 } as const

export const ANAFI_BOUNDS = {
  north: 36.39,
  south: 36.33,
  west: 25.71,
  east: 25.84,
} as const

export function isInsideAnafi(lat: number, lng: number): boolean {
  return (
    lat >= ANAFI_BOUNDS.south &&
    lat <= ANAFI_BOUNDS.north &&
    lng >= ANAFI_BOUNDS.west &&
    lng <= ANAFI_BOUNDS.east
  )
}
