import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { GOOGLE_MAPS_API_KEY } from '../../config'

let configured = false

function ensureConfigured() {
  if (configured) return
  setOptions({ key: GOOGLE_MAPS_API_KEY, v: 'weekly' })
  configured = true
}

export async function loadMaps(): Promise<google.maps.MapsLibrary> {
  ensureConfigured()
  return importLibrary('maps')
}

export async function loadMarker(): Promise<google.maps.MarkerLibrary> {
  ensureConfigured()
  return importLibrary('marker')
}

export async function loadGeometry(): Promise<google.maps.GeometryLibrary> {
  ensureConfigured()
  return importLibrary('geometry')
}
