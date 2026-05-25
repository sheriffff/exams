const INK = '#1D2530'
const BRAND = '#2F5A72'
const IA_SCALE = 0.979
const GAP_EM = 0.11

export async function generateEscueliaLogoPNG({ scale = 4, baseFontPx = 80 } = {}) {
  if (document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`400 ${baseFontPx}px "Dancing Script"`),
      document.fonts.load(`800 ${baseFontPx}px "Familjen Grotesk"`),
    ])
  }
  if (document.fonts?.ready) await document.fonts.ready

  const fontSize = baseFontPx * scale
  const iaSize = fontSize * IA_SCALE
  const gap = fontSize * GAP_EM
  const padX = fontSize * 0.1
  const padY = fontSize * 0.15

  const measure = document.createElement('canvas').getContext('2d')

  measure.font = `400 ${fontSize}px "Dancing Script", cursive`
  const escuel = measure.measureText('escuel')

  measure.font = `800 ${iaSize}px "Familjen Grotesk", "Inter", sans-serif`
  const ia = measure.measureText('IA')

  const ascent = Math.max(
    escuel.actualBoundingBoxAscent || fontSize * 0.8,
    ia.actualBoundingBoxAscent || iaSize * 0.8,
  )
  const descent = Math.max(
    escuel.actualBoundingBoxDescent || fontSize * 0.3,
    ia.actualBoundingBoxDescent || iaSize * 0.2,
  )

  const width = Math.ceil(escuel.width + gap + ia.width + padX * 2)
  const height = Math.ceil(ascent + descent + padY * 2)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.textBaseline = 'alphabetic'
  const baseline = padY + ascent

  ctx.font = `400 ${fontSize}px "Dancing Script", cursive`
  ctx.fillStyle = INK
  ctx.fillText('escuel', padX, baseline)

  ctx.font = `800 ${iaSize}px "Familjen Grotesk", "Inter", sans-serif`
  ctx.fillStyle = BRAND
  ctx.fillText('IA', padX + escuel.width + gap, baseline)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('canvas.toBlob devolvió null'))
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = String(reader.result).split(',')[1]
        resolve({ blob, base64, width, height })
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    }, 'image/png')
  })
}
