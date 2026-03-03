<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getTemplates, saveTemplate, deleteTemplate, createThumbnail } from '@/services/templates'
import { analyzeTemplate } from '@/services/gemini'

const templates = ref(getTemplates())
const uploading = ref(false)
const pendingTex = ref(null)
const pendingThumb = ref(null)
const templateName = ref('')
const fileInput = ref(null)
const dragOver = ref(false)

function triggerUpload() {
  fileInput.value?.click()
}

function fileToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  })
}

async function processFile(file) {
  if (!file) return
  const valid = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!valid.includes(file.type)) {
    alert('Formato no soportado. Usa JPG, PNG o PDF.')
    return
  }
  uploading.value = true
  try {
    const [base64, thumbnail] = await Promise.all([
      fileToBase64(file),
      createThumbnail(file),
    ])
    const tex = await analyzeTemplate(base64, file.type)
    pendingTex.value = tex
    pendingThumb.value = thumbnail
    templateName.value = ''
  } catch (e) {
    alert('Error al analizar el documento: ' + e.message)
  } finally {
    uploading.value = false
  }
}

function onFileSelect(e) {
  processFile(e.target.files[0])
  e.target.value = ''
}

function onDrop(e) {
  dragOver.value = false
  processFile(e.dataTransfer.files[0])
}

function savePending() {
  if (!pendingTex.value || !templateName.value.trim()) return
  saveTemplate({
    id: crypto.randomUUID(),
    name: templateName.value.trim(),
    createdAt: new Date().toISOString().slice(0, 10),
    thumbnail: pendingThumb.value,
    texTemplate: pendingTex.value,
  })
  templates.value = getTemplates()
  pendingTex.value = null
  pendingThumb.value = null
  templateName.value = ''
}

function cancelPending() {
  pendingTex.value = null
  pendingThumb.value = null
  templateName.value = ''
}

function removeTemplate(id) {
  deleteTemplate(id)
  templates.value = getTemplates()
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <div class="text-center py-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Generador de Exámenes</h1>
        <p class="text-lg text-gray-600 mb-8">Crea exámenes de matemáticas con ayuda de IA</p>
        <RouterLink
          to="/crear"
          class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Crear Examen
        </RouterLink>
      </div>

      <div class="mt-4">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">Mis Plantillas</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div
            v-for="t in templates"
            :key="t.id"
            class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden group"
          >
            <div class="aspect-[3/4] bg-gray-100 flex items-center justify-center">
              <img v-if="t.thumbnail" :src="t.thumbnail" class="w-full h-full object-cover" />
              <svg v-else class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div class="p-3">
              <p class="text-sm font-medium text-gray-800 truncate">{{ t.name }}</p>
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs text-gray-400">{{ t.createdAt }}</span>
                <button
                  @click="removeTemplate(t.id)"
                  class="text-gray-400 hover:text-red-500 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                  title="Eliminar"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div v-if="pendingTex" class="bg-white rounded-lg border-2 border-blue-400 shadow-sm overflow-hidden">
            <div class="aspect-[3/4] bg-blue-50 flex items-center justify-center">
              <img v-if="pendingThumb" :src="pendingThumb" class="w-full h-full object-cover opacity-75" />
              <svg v-else class="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="p-3">
              <input
                v-model="templateName"
                type="text"
                placeholder="Nombre de la plantilla"
                class="w-full text-sm border border-gray-300 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keyup.enter="savePending"
                autofocus
              />
              <div class="flex gap-2">
                <button
                  @click="savePending"
                  :disabled="!templateName.trim()"
                  class="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  Guardar
                </button>
                <button
                  @click="cancelPending"
                  class="text-xs px-2 py-1 text-gray-600 hover:text-gray-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="!pendingTex"
            @click="triggerUpload"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onDrop"
            class="rounded-lg border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center aspect-[3/4] min-h-[200px]"
            :class="dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'"
          >
            <template v-if="uploading">
              <svg class="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span class="text-sm text-blue-500 mt-2">Analizando...</span>
            </template>
            <template v-else>
              <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span class="text-sm text-gray-500 text-center px-4">Subir PDF o imagen de un examen</span>
            </template>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              class="hidden"
              @change="onFileSelect"
            />
          </div>
        </div>

        <p v-if="!templates.length && !pendingTex && !uploading" class="text-sm text-gray-400 mt-4">
          Sube una foto o PDF de un examen existente y la IA creará una plantilla con su formato.
        </p>
      </div>
    </div>
  </div>
</template>
