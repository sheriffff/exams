<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import QuestionRow from '@/components/QuestionRow.vue'
import { buildTexDocument, compilePdf, downloadBlob } from '@/services/latex'

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
const fontSize = ref(12)

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

const headerPreviewUrl = ref(null)
const compilingHeader = ref(false)
let headerDebounce = null
let headerBlobUrl = null

function headerTex() {
  const meta = { ...examMeta.value, date: formattedDate.value }
  return buildTexDocument([], meta, course.value, examOptions.value, fontSize.value)
    .replace('[a4paper]', '')
    .replace('[margin=2.5cm]', '[paperwidth=19cm,paperheight=14.85cm,margin=1.5cm]')
}

async function compileHeaderPreview() {
  compilingHeader.value = true
  try {
    const blob = await compilePdf(headerTex())
    if (headerBlobUrl) URL.revokeObjectURL(headerBlobUrl)
    headerBlobUrl = URL.createObjectURL(blob)
    headerPreviewUrl.value = headerBlobUrl + '#toolbar=0&view=FitPage'
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
  if (headerBlobUrl) URL.revokeObjectURL(headerBlobUrl)
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
      <div class="flex items-center gap-3 mb-8">
        <RouterLink to="/" class="p-2 rounded-xl text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </RouterLink>
        <h1 class="text-2xl font-extrabold tracking-tight text-gray-900">Crear Examen</h1>
      </div>

      <div class="grid grid-cols-2 gap-8 mb-8">
        <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-6">
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Cabecera</h2>

          <div class="space-y-4">
            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-sm text-gray-500 mb-1.5 font-medium">Curso</label>
                <select v-model="course" class="w-full border border-gray-200/80 rounded-lg px-3 py-2.5 text-base bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all">
                  <option v-for="c in courses" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-1.5 font-medium">Clase</label>
                <input v-model="examMeta.className" type="text" placeholder="A" class="w-20 border border-gray-200/80 rounded-lg px-3 py-2.5 text-base placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-1.5 font-medium">Modelo</label>
                <input v-model="examMeta.modelo" type="text" placeholder="A" class="w-20 border border-gray-200/80 rounded-lg px-3 py-2.5 text-base placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
              </div>
              <div class="flex-1 relative">
                <label class="block text-sm text-gray-500 mb-1.5 font-medium">Fecha</label>
                <div class="relative">
                  <input
                    :value="displayDate"
                    readonly
                    @click="$refs.datePicker.showPicker()"
                    class="w-full border border-gray-200/80 rounded-lg px-3 py-2.5 text-base bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all cursor-pointer"
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
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm text-gray-500 font-medium">Título</label>
                <button @click="disableField('title')" class="text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <input v-model="examMeta.title" type="text" placeholder="Examen Tema 5 — Ecuaciones" class="w-full border border-gray-200/80 rounded-lg px-3 py-2.5 text-base placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
            </div>

            <div v-if="showField.teacher">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm text-gray-500 font-medium">Profesor</label>
                <button @click="disableField('teacher')" class="text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <input v-model="examMeta.teacher" type="text" placeholder="Juan García" class="w-full border border-gray-200/80 rounded-lg px-3 py-2.5 text-base placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all" />
            </div>

            <div v-if="showField.instructions">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm text-gray-500 font-medium">Instrucciones</label>
                <button @click="disableField('instructions')" class="text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div class="space-y-2">
                <div v-for="(_, i) in instructions" :key="i" class="flex items-center gap-2">
                  <input
                    v-model="instructions[i]"
                    type="text"
                    placeholder="No se permite el uso de calculadora"
                    class="flex-1 border border-gray-200/80 rounded-lg px-3 py-2.5 text-base placeholder-gray-300 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                  />
                  <button v-if="instructions.length > 1" @click="removeInstruction(i)" class="p-1.5 text-gray-300 hover:text-red-400 cursor-pointer transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <button @click="addInstruction" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-all cursor-pointer">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                  Añadir instrucción
                </button>
              </div>
            </div>

            <div v-if="hiddenFields.length" class="flex flex-wrap gap-2 pt-1">
              <button
                v-for="f in hiddenFields"
                :key="f.key"
                @click="enableField(f.key)"
                class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                {{ f.label }}
              </button>
            </div>

          </div>

          <div class="flex items-center gap-3 mt-4">
            <span class="text-[10px] text-gray-400 font-bold">A</span>
            <input type="range" v-model.number="fontSize" min="8" max="20" step="2" class="flex-1 accent-primary-600" />
            <span class="text-lg text-gray-400 font-bold">A</span>
          </div>
        </div>

        <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-5 flex flex-col">
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Vista previa cabecera</h2>
          <div class="flex-1 rounded-t-lg border border-b-0 border-gray-200 overflow-hidden relative">
            <iframe v-if="headerPreviewUrl" :src="headerPreviewUrl" class="w-full border-0" style="height: 280px" />
            <div v-if="compilingHeader" class="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <svg class="w-6 h-6 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <span class="text-sm text-gray-400 font-medium">Generando…</span>
            </div>
            <div v-if="!headerPreviewUrl && !compilingHeader" class="flex items-center justify-center h-[280px] text-gray-300 text-sm">
              Cargando vista previa…
            </div>
          </div>
        </div>
      </div>

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
          :collapsed="q.collapsed"
          :can-move-up="index > 0"
          :can-move-down="index < questions.length - 1"
          @remove="removeQuestion(q.id)"
          @move-up="moveQuestion(q.id, -1)"
          @move-down="moveQuestion(q.id, 1)"
          @toggle-collapse="toggleCollapse(q.id)"
        />
      </div>

      <div class="mt-8 mb-10 flex items-center gap-4">
        <button @click="addQuestion" class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-sm text-primary-600 rounded-xl font-semibold border border-primary-200 hover:bg-primary-50 hover:border-primary-300 shadow-sm hover:shadow transition-all cursor-pointer">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Añadir pregunta
        </button>
      </div>

      <button
        :disabled="!hasQuestions || generating"
        @click="generateExam"
        class="group w-full py-4 bg-gradient-to-r from-primary-600 to-accent-500 text-white text-lg font-bold rounded-2xl hover:from-primary-500 hover:to-accent-400 shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
      >
        {{ generating ? 'Generando PDF…' : 'Generar Examen' }}
      </button>
    </div>
  </div>
</template>
