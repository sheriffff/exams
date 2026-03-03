import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.5.207/build/pdf.worker.min.mjs'

const MAX_TEXT_LENGTH = 10000

export async function extractTextFromPdf(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n\n'
    if (text.length > MAX_TEXT_LENGTH) break
  }
  return text.slice(0, MAX_TEXT_LENGTH)
}

export async function pdfBlobToThumbnail(blob, width = 200) {
  const buffer = await blob.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.7)
}
