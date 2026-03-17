<script setup>
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { iterateTemplate } from '@/services/gemini'
import { getTemplateById, saveTemplate, updateTemplate } from '@/services/templates'
import { buildTexDocument, compilePdf } from '@/services/latex'
import { extractTextFromPdf, pdfBlobToThumbnail } from '@/services/pdf'

const route = useRoute()
const router = useRouter()

const templateId = ref(route.params.id || null)
const templateName = ref('')
const texTemplate = ref('')
const mode = ref(null)

const fields = reactive({
  title: true,
  course: true,
  className: false,
  date: true,
  teacher: false,
  student: true,
  modelo: false,
  instructions: false,
})

const fieldLabels = [
  { key: 'title', label: 'Título' },
  { key: 'course', label: 'Curso' },
  { key: 'className', label: 'Clase' },
  { key: 'date', label: 'Fecha' },
  { key: 'teacher', label: 'Profesor' },
  { key: 'student', label: 'Nombre alumno' },
  { key: 'modelo', label: 'Modelo' },
  { key: 'instructions', label: 'Instrucciones' },
]

const history = ref([])
const userInput = ref('')
const pdfTextContext = ref('')
const previewUrl = ref(null)
const sending = ref(false)
const compiling = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const chatContainer = ref(null)
const pdfInput = ref(null)

const sampleQuestions = [
  { id: 1, latex: 'Resuelve: $2x + 5 = 17$', points: 5 },
  { id: 2, latex: 'Calcula el área de un triángulo con catetos $3\\,\\text{cm}$ y $4\\,\\text{cm}$.', points: 5 },
]

function buildFromCheckboxes() {
  const f = fields
  let header = ''
  if (f.title) header += '\\begin{center}\n{\\Large \\textbf{%%TITLE%%}}\n\\end{center}\n\n'
  const leftParts = []
  if (f.course) leftParts.push('%%COURSE%%')
  if (f.className) leftParts.push('%%CLASS%%')
  const rightParts = []
  if (f.teacher) rightParts.push('%%TEACHER%%')
  if (f.date) rightParts.push('%%DATE%%')
  if (leftParts.length || rightParts.length) {
    header += '\\noindent ' + leftParts.join(' — ')
    if (rightParts.length) header += ' \\hfill ' + rightParts.join(' \\hfill ')
    header += '\n\n\\vspace{0.5cm}\n\n'
  }
  if (f.modelo) header += '\\noindent %%MODELO%%\n\n'
  if (f.student) header += '\\noindent %%STUDENT%%\n\n\\vspace{0.5cm}\n\n'
  if (f.instructions) header += '\\noindent \\textit{Instrucciones}\n\n\\vspace{0.3cm}\n\n'

  return `\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[spanish]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{enumitem}

\\pagestyle{empty}

\\begin{document}

${header}\\begin{enumerate}
%%QUESTIONS%%
\\end{enumerate}

\\end{document}
`
}

onMounted(() => {
  if (templateId.value) {
    const t = getTemplateById(templateId.value)
    if (t) {
      templateName.value = t.name
      texTemplate.value = t.texTemplate
      mode.value = 'text'
      compilePreview()
    }
  }
})

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

watch(fields, () => {
  if (mode.value !== 'text') return
  texTemplate.value = buildFromCheckboxes()
  compilePreview()
}, { deep: true })

function enterTextMode() {
  mode.value = 'text'
  texTemplate.value = buildFromCheckboxes()
  compilePreview()
}

function scrollChat() {
  nextTick(() => {
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  })
}

async function compilePreview() {
  if (!texTemplate.value) return
  compiling.value = true
  errorMsg.value = ''
  try {
    const tex = buildTexDocument(
      sampleQuestions,
      { title: 'Sistemas de Ecuaciones', teacher: 'Manuel López Sheriff', date: '2026-03-03', className: 'A', modelo: '' },
      '2 ESO',
      {},
      texTemplate.value,
    )
    const blob = await compilePdf(tex)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(blob)
  } catch (e) {
    errorMsg.value = 'Error al compilar la plantilla.'
    console.error('Preview compilation failed:', e)
  } finally {
    compiling.value = false
  }
}

async function handlePdfUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''
  sending.value = true
  mode.value = 'pdf'
  try {
    pdfTextContext.value = await extractTextFromPdf(file)
    texTemplate.value = await iterateTemplate(
      '',
      'Crea una plantilla LaTeX que replique el formato y estructura de este documento.',
      pdfTextContext.value,
      [],
    )
    await compilePreview()
  } catch (err) {
    errorMsg.value = 'Error al procesar el PDF: ' + err.message
  } finally {
    sending.value = false
  }
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || sending.value) return

  history.value.push(text)
  userInput.value = ''
  scrollChat()
  sending.value = true
  errorMsg.value = ''

  try {
    const recent = history.value.slice(-4)
    texTemplate.value = await iterateTemplate(
      texTemplate.value,
      text,
      pdfTextContext.value,
      recent,
    )
    await compilePreview()
  } catch (e) {
    errorMsg.value = 'Error: ' + e.message
  } finally {
    sending.value = false
  }
}

async function save() {
  if (!templateName.value.trim() || !texTemplate.value) return
  saving.value = true
  try {
    let thumbnail = null
    if (previewUrl.value) {
      const res = await fetch(previewUrl.value)
      const blob = await res.blob()
      thumbnail = await pdfBlobToThumbnail(blob)
    }
    if (templateId.value) {
      updateTemplate(templateId.value, {
        name: templateName.value.trim(),
        texTemplate: texTemplate.value,
        thumbnail,
      })
    } else {
      const id = crypto.randomUUID()
      saveTemplate({
        id,
        name: templateName.value.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
        thumbnail,
        texTemplate: texTemplate.value,
      })
      templateId.value = id
    }
    router.push('/')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <header class="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
      <button @click="router.push('/')" class="text-gray-500 hover:text-gray-800 cursor-pointer" title="Volver">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <input
        v-model="templateName"
        type="text"
        placeholder="Nombre de la plantilla"
        class="flex-1 text-lg font-medium border-none bg-transparent focus:outline-none placeholder-gray-300"
      />
      <button
        v-if="texTemplate"
        @click="save"
        :disabled="!templateName.trim() || saving"
        class="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {{ saving ? 'Guardando…' : 'Guardar' }}
      </button>
    </header>

    <div class="flex flex-1 min-h-0">
      <!-- Left column -->
      <div class="w-1/2 flex flex-col border-r border-gray-200 bg-white">

        <!-- Step 1: Choose mode -->
        <div v-if="!mode" class="flex-1 flex items-center justify-center p-6">
          <div class="max-w-xs w-full space-y-4">
            <p class="text-center text-sm text-gray-500 mb-2">Elige cómo empezar</p>
            <button
              @click="mode = 'pdf'"
              class="w-full flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50/40 transition-all cursor-pointer text-left group"
            >
              <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <span class="font-medium text-gray-800 text-sm block">Partir de un PDF</span>
                <span class="text-xs text-gray-400">Extraemos el formato automáticamente</span>
              </div>
            </button>
            <button
              @click="enterTextMode"
              class="w-full flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer text-left group"
            >
              <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div>
                <span class="font-medium text-gray-800 text-sm block">Crear desde cero</span>
                <span class="text-xs text-gray-400">Elige los campos y personaliza con IA</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Step 2a: PDF upload -->
        <div v-else-if="mode === 'pdf' && !texTemplate && !sending" class="flex-1 flex items-center justify-center p-6">
          <div class="text-center">
            <button
              @click="pdfInput?.click()"
              class="inline-flex flex-col items-center gap-3 px-10 py-8 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
            >
              <div class="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <svg class="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <span class="text-sm font-medium text-gray-700 block">Selecciona un PDF</span>
                <span class="text-xs text-gray-400">de un examen existente</span>
              </div>
            </button>
            <button @click="mode = null" class="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600 cursor-pointer">Volver</button>
          </div>
          <input
            ref="pdfInput"
            type="file"
            accept="application/pdf"
            class="hidden"
            @change="handlePdfUpload"
          />
        </div>

        <!-- Loading (PDF processing) -->
        <div v-else-if="sending && !history.length" class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <svg class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p class="text-sm">Analizando PDF…</p>
        </div>

        <!-- Step 2b: Text mode — checkboxes + AI input -->
        <template v-else-if="mode === 'text'">
          <div class="flex-1 overflow-y-auto p-5 space-y-6">
            <div>
              <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Campos de la plantilla</p>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="f in fieldLabels"
                  :key="f.key"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm"
                  :class="fields[f.key] ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
                >
                  <input type="checkbox" v-model="fields[f.key]" class="accent-blue-600 w-3.5 h-3.5" />
                  {{ f.label }}
                </label>
              </div>
            </div>

            <div class="border-t border-gray-100 pt-4">
              <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Personalizar con IA</p>
              <div ref="chatContainer" class="space-y-2 mb-3">
                <div
                  v-for="(msg, i) in history"
                  :key="i"
                  class="ml-auto max-w-[85%] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  {{ msg }}
                </div>
                <div v-if="sending" class="flex items-center gap-2 text-sm text-gray-400">
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Actualizando…
                </div>
                <div v-if="errorMsg" class="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {{ errorMsg }}
                </div>
              </div>
              <div class="flex gap-2">
                <input
                  v-model="userInput"
                  @keyup.enter="sendMessage"
                  type="text"
                  placeholder="Añade un borde doble, centra la cabecera…"
                  class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  :disabled="sending"
                />
                <button
                  @click="sendMessage"
                  :disabled="!userInput.trim() || sending"
                  class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- PDF mode: iteration after processing -->
        <template v-else>
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-2">
            <div
              v-for="(msg, i) in history"
              :key="i"
              class="ml-auto max-w-[85%] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
            >
              {{ msg }}
            </div>
            <div v-if="sending" class="flex items-center gap-2 text-sm text-gray-400">
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Actualizando…
            </div>
            <div v-if="errorMsg" class="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {{ errorMsg }}
            </div>
          </div>
          <div class="border-t border-gray-200 p-3 shrink-0">
            <div class="flex gap-2">
              <input
                v-model="userInput"
                @keyup.enter="sendMessage"
                type="text"
                placeholder="Describe los cambios que quieres…"
                class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                :disabled="sending"
              />
              <button
                @click="sendMessage"
                :disabled="!userInput.trim() || sending"
                class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- Right column: preview -->
      <div class="w-1/2 flex flex-col bg-gray-100 p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-gray-700">Vista previa</h2>
          <div v-if="compiling" class="flex items-center gap-1.5 text-xs text-gray-400">
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Compilando…
          </div>
        </div>
        <div class="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <iframe
            v-if="previewUrl"
            :src="previewUrl"
            class="w-full h-full"
          />
          <div v-else class="flex flex-col items-center justify-center h-full text-gray-300 px-6">
            <svg class="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p v-if="errorMsg" class="text-sm text-red-400 text-center">{{ errorMsg }}</p>
            <p v-else class="text-sm">La vista previa aparecerá aquí</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
