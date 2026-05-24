<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import QuestionRow from '@/components/QuestionRow.vue'
import { buildTexDocument, buildSolutionTexDocument, compilePdf, downloadBlob } from '@/services/latex'
import { solveQuestion } from '@/services/llm'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const courses = ['1 ESO', '2 ESO', '3 ESO', '4 ESO', '1 Bachillerato', '2 Bachillerato']
const course = ref('1 ESO')
const questions = ref([])
const generating = ref(false)
const generatingSolution = ref(false)
const fontSize = ref(12)
const FONT_SIZES = [12, 14]
const headerCollapsed = ref(true)
const questionsCollapsed = ref(false)

const examMeta = ref({
  title: '',
  teacher: '',
  date: new Date().toISOString().slice(0, 10),
  className: '',
  modelo: '',
})

const formattedDate = computed(() => formatDate(examMeta.value.date))
const displayDate = computed(() => {
  if (!examMeta.value.date) return ''
  const [y, m, d] = examMeta.value.date.split('-')
  return `${d}/${m}/${y}`
})

const instructions = ref([''])

function addInstruction() {
  instructions.value.push('')
}

function removeInstruction(index) {
  instructions.value.splice(index, 1)
  if (instructions.value.length === 0) instructions.value = ['']
}

const examOptions = computed(() => ({
  instructions: instructions.value.filter(i => i.trim()).join('\n'),
}))

const headerCanvasRef = ref(null)
const headerRendered = ref(false)
const compilingHeader = ref(false)
let headerDebounce = null
let headerRenderTask = null

const PREVIEW_SAMPLE_QUESTIONS = [
  { latex: 'Este será el enunciado del ejercicio 1.', points: 2 },
]

function headerTex() {
  const meta = { ...examMeta.value, date: formattedDate.value }
  return buildTexDocument(PREVIEW_SAMPLE_QUESTIONS, meta, course.value, examOptions.value, fontSize.value)
}

async function compileHeaderPreview() {
  compilingHeader.value = true
  try {
    const blob = await compilePdf(headerTex())
    const data = await blob.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data }).promise
    const page = await pdf.getPage(1)
    const canvas = headerCanvasRef.value
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const baseViewport = page.getViewport({ scale: 1 })
    const targetWidth = canvas.clientWidth || 600
    const scale = (targetWidth / baseViewport.width) * dpr * 1.5
    const viewport = page.getViewport({ scale })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (headerRenderTask) headerRenderTask.cancel()
    headerRenderTask = page.render({ canvasContext: ctx, viewport })
    await headerRenderTask.promise
    headerRendered.value = true
  } catch {
  } finally {
    compilingHeader.value = false
  }
}

function scheduleHeaderPreview() {
  clearTimeout(headerDebounce)
  headerDebounce = setTimeout(compileHeaderPreview, 1200)
}

watch(
  [() => examMeta.value.title, () => examMeta.value.teacher, () => examMeta.value.date,
   () => examMeta.value.className, () => examMeta.value.modelo, course, fontSize, examOptions],
  scheduleHeaderPreview,
  { immediate: true }
)

const showField = ref({
  title: false,
  teacher: false,
  instructions: false,
})

const optionalFields = [
  { key: 'title', label: 'Título' },
  { key: 'teacher', label: 'Profesor' },
  { key: 'instructions', label: 'Instrucciones' },
]

const hiddenFields = computed(() => optionalFields.filter(f => !showField.value[f.key]))

function enableField(key) {
  showField.value[key] = true
}

function disableField(key) {
  showField.value[key] = false
  if (key === 'instructions') instructions.value = ['']
  else examMeta.value[key] = ''
}

const hasQuestions = computed(() => questions.value.some(q => q.latex))
const totalPoints = computed(() => questions.value.reduce((sum, q) => sum + (q.points || 0), 0))
const canGenerate = computed(() => hasQuestions.value && totalPoints.value === 10)

const showDetailPicker = ref(false)
const DETAIL_LEVELS = [
  { key: 'bajo', label: 'Bajo', desc: 'Solo el resultado final' },
  { key: 'normal', label: 'Normal', desc: 'Pasos clave sin explicar con texto' },
  { key: 'largo', label: 'Largo', desc: 'Cada paso explicado con detalle' },
]

async function generateExam() {
  generating.value = true
  try {
    const meta = { ...examMeta.value, date: formattedDate.value }
    const tex = buildTexDocument(questions.value, meta, course.value, examOptions.value, fontSize.value)
    const blob = await compilePdf(tex)
    const filename = (examMeta.value.title || 'examen').replace(/\s+/g, '_') + '.pdf'
    downloadBlob(blob, filename)
  } catch (e) {
    alert('Error al generar el PDF: ' + e.message)
  } finally {
    generating.value = false
  }
}

async function generateSolution(detailLevel = 'normal') {
  showDetailPicker.value = false
  generatingSolution.value = true
  try {
    const valid = questions.value.filter(q => q.latex)
    const solutions = await Promise.all(
      valid.map(q => solveQuestion(q.latex, course.value, detailLevel))
    )
    const meta = { ...examMeta.value, date: formattedDate.value }
    const tex = buildSolutionTexDocument(valid, solutions, meta, course.value, fontSize.value)
    const blob = await compilePdf(tex)
    const filename = (examMeta.value.title || 'examen').replace(/\s+/g, '_') + '_soluciones.pdf'
    downloadBlob(blob, filename)
  } catch (e) {
    alert('Error al generar las soluciones: ' + e.message)
  } finally {
    generatingSolution.value = false
  }
}

let nextId = 1

function addQuestion() {
  questions.value.forEach(q => q.collapsed = true)
  questions.value.push({
    id: nextId++,
    prompt: '',
    latex: '',
    title: '',
    collapsed: false,
    points: 0,
    difficulty: 'NORMAL',
    questionType: 'analitico',
  })
}

function removeQuestion(id) {
  questions.value = questions.value.filter(q => q.id !== id)
}

function moveQuestion(id, direction) {
  const idx = questions.value.findIndex(q => q.id === id)
  const target = idx + direction
  if (target < 0 || target >= questions.value.length) return
  const temp = questions.value[idx]
  questions.value[idx] = questions.value[target]
  questions.value[target] = temp
}

function toggleCollapse(id) {
  const q = questions.value.find(q => q.id === id)
  if (q) q.collapsed = !q.collapsed
}

onUnmounted(() => {
  if (headerRenderTask) headerRenderTask.cancel()
  clearTimeout(headerDebounce)
})
</script>

<template>
  <div class="min-h-screen relative">
    <div class="absolute inset-0 -z-10">
      <div class="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary-200/30 blur-3xl" />
      <div class="absolute bottom-[10%] left-[-8%] w-[350px] h-[350px] rounded-full bg-accent-400/15 blur-3xl" />
    </div>

    <div class="max-w-6xl mx-auto px-6 py-6">
      <div class="flex items-center gap-4 mb-6 pb-5 border-b border-gray-200/70">
        <a href="https://escuelia.es" class="wordmark" style="--wm-size: 1.75rem; --wm-ia-dy: 0em;">
          <span class="escuel">escuel</span><span class="ia">IA</span>
        </a>
        <div class="h-7 w-px bg-gray-300"></div>
        <span class="text-sm font-semibold text-gray-600">
          Generador de Exámenes de Matemáticas
        </span>
      </div>

      <div class="flex items-center gap-3 mb-8">
        <RouterLink to="/" class="p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <h1 class="text-2xl font-extrabold tracking-tight text-gray-900">Crear Examen</h1>
      </div>

      <div class="flex items-center gap-1 mb-4">
        <span class="text-xs text-gray-400 font-medium mr-2">Tamaño de texto</span>
        <div class="flex items-center rounded-lg border border-gray-200/80 overflow-hidden">
          <button
            v-for="s in FONT_SIZES"
            :key="s"
            @click="fontSize = s"
            :class="[
              fontSize === s ? 'bg-primary-100 text-primary-700' : 'bg-white/80 text-gray-400 hover:bg-gray-50',
              'px-2.5 py-1.5 font-bold transition-all cursor-pointer'
            ]"
            :style="{ fontSize: (s - 2) + 'px' }"
          >A</button>
        </div>
      </div>

      <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm mb-8">
        <div
          class="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
          :class="{ 'border-b border-gray-100': !headerCollapsed }"
          @click="headerCollapsed = !headerCollapsed"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400 transition-transform" :class="{ '-rotate-90': headerCollapsed }" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            <span class="text-sm font-semibold text-gray-500">Cabecera</span>
          </div>
          <div v-if="compilingHeader && !headerCollapsed" class="flex items-center gap-1.5 text-xs text-gray-400">
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            Compilando…
          </div>
        </div>

        <div v-show="!headerCollapsed" class="flex gap-5 p-5">
          <div class="flex-1 space-y-3">
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-xs text-gray-500 mb-1 font-medium">Curso</label>
                <select v-model="course" class="w-full border border-gray-200/80 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all">
                  <option v-for="c in courses" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1 font-medium">Clase</label>
                <input v-model="examMeta.className" type="text" placeholder="A" class="w-16 border border-gray-200/80 rounded-lg px-2 py-2 text-sm placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1 font-medium">Modelo</label>
                <input v-model="examMeta.modelo" type="text" placeholder="A" class="w-16 border border-gray-200/80 rounded-lg px-2 py-2 text-sm placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
              </div>
              <div class="flex-1 relative">
                <label class="block text-xs text-gray-500 mb-1 font-medium">Fecha</label>
                <div class="relative">
                  <input
                    :value="displayDate"
                    readonly
                    @click="$refs.datePicker.showPicker()"
                    class="w-full border border-gray-200/80 rounded-lg px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all cursor-pointer"
                  />
                  <input
                    ref="datePicker"
                    v-model="examMeta.date"
                    type="date"
                    class="absolute inset-0 opacity-0 pointer-events-none"
                    @input="examMeta.date = $event.target.value"
                  />
                </div>
              </div>
            </div>

            <div v-if="showField.title">
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs text-gray-500 font-medium">Título</label>
                <button @click="disableField('title')" class="text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <input v-model="examMeta.title" type="text" placeholder="Examen Tema 5 — Ecuaciones" class="w-full border border-gray-200/80 rounded-lg px-3 py-2 text-sm placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
            </div>

            <div v-if="showField.teacher">
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs text-gray-500 font-medium">Profesor</label>
                <button @click="disableField('teacher')" class="text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <input v-model="examMeta.teacher" type="text" placeholder="Juan García" class="w-full border border-gray-200/80 rounded-lg px-3 py-2 text-sm placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
            </div>

            <div v-if="showField.instructions">
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs text-gray-500 font-medium">Instrucciones</label>
                <button @click="disableField('instructions')" class="text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(_, i) in instructions" :key="i" class="flex items-center gap-2">
                  <input
                    v-model="instructions[i]"
                    type="text"
                    placeholder="No se permite el uso de calculadora"
                    class="flex-1 border border-gray-200/80 rounded-lg px-3 py-2 text-sm placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                  />
                  <button v-if="instructions.length > 1" @click="removeInstruction(i)" class="p-1 text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <button @click="addInstruction" class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-all cursor-pointer">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                  Añadir instrucción
                </button>
              </div>
            </div>

            <div v-if="hiddenFields.length" class="flex flex-wrap gap-1.5 pt-1">
              <button
                v-for="f in hiddenFields"
                :key="f.key"
                @click.stop="enableField(f.key)"
                class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all cursor-pointer"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                {{ f.label }}
              </button>
            </div>
          </div>

          <div class="w-1/2 shrink-0 rounded-lg border border-gray-200 overflow-hidden relative bg-white" style="aspect-ratio: 210 / 99;">
            <canvas ref="headerCanvasRef" class="block w-full h-auto" />
            <div v-if="compilingHeader" class="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center gap-2">
              <svg class="w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            </div>
            <div v-if="!headerRendered && !compilingHeader" class="absolute inset-0 flex items-center justify-center text-gray-300 text-xs">
              Cargando vista previa…
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm mb-8">
        <div
          class="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
          :class="{ 'border-b border-gray-100': !questionsCollapsed }"
          @click="questionsCollapsed = !questionsCollapsed"
        >
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-400 transition-transform" :class="{ '-rotate-90': questionsCollapsed }" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            <span class="text-sm font-semibold text-gray-500">Preguntas</span>
            <span v-if="questions.length" class="text-xs text-gray-400">({{ questions.length }})</span>
          </div>
        </div>

        <div v-show="!questionsCollapsed" class="p-5">
          <div class="space-y-4">
            <QuestionRow
              v-for="(q, index) in questions"
              :key="q.id"
              v-model:prompt="q.prompt"
              v-model:latex="q.latex"
              v-model:title="q.title"
              v-model:points="q.points"
              v-model:difficulty="q.difficulty"
              v-model:question-type="q.questionType"
              :course="course"
              :index="index + 1"
              :collapsed="q.collapsed"
              :can-move-up="index > 0"
              :can-move-down="index < questions.length - 1"
              @remove="removeQuestion(q.id)"
              @move-up="moveQuestion(q.id, -1)"
              @move-down="moveQuestion(q.id, 1)"
              @toggle-collapse="toggleCollapse(q.id)"
            />
          </div>

          <div :class="['flex items-center gap-4', questions.length ? 'mt-6' : '']">
            <button @click="addQuestion" class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm text-primary-600 rounded-xl font-semibold border border-primary-200 hover:bg-primary-50 hover:border-primary-300 shadow-sm hover:shadow transition-all cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Añadir pregunta
            </button>
          </div>
        </div>
      </div>

      <div v-if="questions.length" class="max-w-xs bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-4 mb-6">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Puntos</span>
          <span
            class="text-sm font-bold"
            :class="totalPoints === 10 ? 'text-accent-500' : 'text-red-500'"
          >{{ totalPoints }} / 10</span>
        </div>
        <div class="space-y-1">
          <div v-for="(q, i) in questions" :key="q.id" class="flex items-center gap-2 group">
            <div class="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
              <button :disabled="i === 0" @click="moveQuestion(q.id, -1)" class="text-gray-300 hover:text-gray-600 disabled:opacity-0 cursor-pointer disabled:cursor-default">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 15l7-7 7 7" /></svg>
              </button>
              <button :disabled="i === questions.length - 1" @click="moveQuestion(q.id, 1)" class="text-gray-300 hover:text-gray-600 disabled:opacity-0 cursor-pointer disabled:cursor-default">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            <span class="text-xs font-bold text-gray-300 w-4 text-right">{{ i + 1 }}</span>
            <span class="text-sm text-gray-600 flex-1 truncate">{{ q.title || 'Sin nombre' }}</span>
            <div class="flex items-center gap-1">
              <input
                type="number"
                v-model.number="q.points"
                min="0"
                max="10"
                step="0.5"
                class="w-12 text-sm text-right border border-gray-200/80 rounded-lg px-1.5 py-1 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span class="text-xs text-gray-400">pts</span>
            </div>
          </div>
        </div>
        <p v-if="totalPoints !== 10" class="mt-2.5 text-xs text-red-500 font-medium">
          Los puntos deben sumar 10 para generar el examen.
        </p>

        <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            :disabled="!canGenerate || generating"
            @click="generateExam"
            class="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-primary-600 to-accent-500 text-white text-sm font-bold rounded-xl hover:from-primary-500 hover:to-accent-400 shadow-sm hover:shadow disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <svg v-if="!generating" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" /></svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {{ generating ? 'Generando…' : 'Examen' }}
          </button>
          <button
            :disabled="!canGenerate || generatingSolution"
            @click="showDetailPicker = true"
            class="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 shadow-sm hover:shadow disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <svg v-if="!generatingSolution" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" /></svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {{ generatingSolution ? 'Resolviendo…' : 'Solución' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showDetailPicker"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4"
      @click.self="showDetailPicker = false"
    >
      <div class="bg-white rounded-2xl shadow-xl border border-white/50 max-w-sm w-full p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-gray-800">Nivel de detalle</h3>
          <button @click="showDetailPicker = false" class="text-gray-300 hover:text-gray-500 cursor-pointer">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="space-y-2">
          <button
            v-for="level in DETAIL_LEVELS"
            :key="level.key"
            @click="generateSolution(level.key)"
            class="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer group"
          >
            <div class="text-sm font-bold text-gray-800 group-hover:text-amber-600">{{ level.label }}</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ level.desc }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
