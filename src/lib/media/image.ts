// Client-side image processing:
//   - downscale to MAX_DIMENSION on the longest side
//   - re-encode as WebP (or JPEG fallback) at QUALITY
//   - drawing through canvas strips EXIF (including GPS) — good for anonymity
const MAX_DIMENSION = 1600
const QUALITY = 0.82

export async function processImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = scaleToMax(bitmap.width, bitmap.height, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await canvasToBlob(canvas, 'image/webp', QUALITY)
  if (blob) return blob
  const fallback = await canvasToBlob(canvas, 'image/jpeg', QUALITY)
  if (fallback) return fallback
  throw new Error('Image encoding failed')
}

function scaleToMax(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w > h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
