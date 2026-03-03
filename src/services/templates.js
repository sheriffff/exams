const KEY = 'exam-templates'

export function getTemplates() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export function saveTemplate(template) {
  const all = getTemplates()
  all.push(template)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function getTemplateById(id) {
  return getTemplates().find(t => t.id === id) || null
}

export function updateTemplate(id, updates) {
  const all = getTemplates()
  const idx = all.findIndex(t => t.id === id)
  if (idx === -1) return
  all[idx] = { ...all[idx], ...updates }
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function deleteTemplate(id) {
  const all = getTemplates().filter(t => t.id !== id)
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function createThumbnail(file) {
  return new Promise(resolve => {
    if (!file.type.startsWith('image/')) {
      resolve(null)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 200 / img.width
      canvas.width = 200
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
