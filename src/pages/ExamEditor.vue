<script setup>
import { ref, computed } from 'vue'
import QuestionRow from '@/components/QuestionRow.vue'
import LatexPreview from '@/components/LatexPreview.vue'
import { buildTexDocument, compilePdf, downloadBlob } from '@/services/latex'
import { getTemplates } from '@/services/templates'

const courses = ['1 ESO', '2 ESO', '3 ESO', '4 ESO', '1 Bachillerato', '2 Bachillerato']
const course = ref('1 ESO')
const questions = ref([])
const generating = ref(false)
const templates = ref(getTemplates())
const selectedTemplateId = ref(null)

const examMeta = ref({
  title: '',
  teacher: '',
  date: new Date().toISOString().slice(0, 10),
  className: '',
  modelo: '',
})

const examOptions = ref({
  answerSpace: false,
  answerSpaceCm: 5,
  perQuestionSpace: false,
  instructions: '',
})

const hasQuestions = computed(() => questions.value.some(q => q.latex))
const totalPoints = computed(() => questions.value.reduce((sum, q) => sum + (q.points || 0), 0))
const pointsWarning = computed(() => {
  const validQs = questions.value.filter(q => q.latex)
  return validQs.length > 0 && totalPoints.value !== 10
})
const previewQuestions = computed(() => questions.value.filter(q => q.latex))

function answerSpaceForPreview(q) {
  if (examOptions.value.perQuestionSpace) return q.answerSpace || 0
  if (examOptions.value.answerSpace) return examOptions.value.answerSpaceCm
  return 0
}

async function generateExam() {
  generating.value = true
  try {
    const tpl = selectedTemplateId.value ? templates.value.find(t => t.id === selectedTemplateId.value)?.texTemplate : null
    const tex = buildTexDocument(questions.value, examMeta.value, course.value, examOptions.value, tpl)
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
    answerSpace: 5,
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
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Crear Examen</h1>

      <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
        <h2 class="text-sm font-semibold text-gray-800 mb-3">Datos del examen</h2>
        <div class="flex flex-wrap gap-3 items-end">
          <div v-if="templates.length" class="w-36">
            <label class="block text-xs text-gray-500 mb-0.5">Plantilla</label>
            <select v-model="selectedTemplateId" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option :value="null">Por defecto</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="w-36">
            <label class="block text-xs text-gray-500 mb-0.5">Curso</label>
            <select v-model="course" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option v-for="c in courses" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="w-16">
            <label class="block text-xs text-gray-500 mb-0.5">Clase</label>
            <input v-model="examMeta.className" type="text" placeholder="A" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div class="w-16">
            <label class="block text-xs text-gray-500 mb-0.5">Modelo</label>
            <input v-model="examMeta.modelo" type="text" placeholder="A" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div class="w-36">
            <label class="block text-xs text-gray-500 mb-0.5">Profesor</label>
            <input v-model="examMeta.teacher" type="text" placeholder="Juan García" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div class="w-36">
            <label class="block text-xs text-gray-500 mb-0.5">Fecha</label>
            <input v-model="examMeta.date" type="date" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div class="flex-1 min-w-40">
            <label class="block text-xs text-gray-500 mb-0.5">Título <span class="text-gray-300">(opcional)</span></label>
            <input v-model="examMeta.title" type="text" placeholder="Examen Tema 5 — Ecuaciones" class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h2 class="text-sm font-semibold text-gray-800 mb-3">Opciones</h2>
          <div class="space-y-3">
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" v-model="examOptions.answerSpace" class="accent-blue-600 w-4 h-4" />
                <span class="text-sm text-gray-700">Espacio para respuestas</span>
              </label>
              <div v-if="examOptions.answerSpace && !examOptions.perQuestionSpace" class="mt-2 ml-6 flex items-center gap-2">
                <input type="range" v-model.number="examOptions.answerSpaceCm" min="1" max="15" step="0.5" class="flex-1 accent-blue-600" />
                <span class="text-xs text-gray-500 w-10 text-right">{{ examOptions.answerSpaceCm }} cm</span>
              </div>
              <label v-if="examOptions.answerSpace" class="flex items-center gap-2 cursor-pointer mt-2 ml-6">
                <input type="checkbox" v-model="examOptions.perQuestionSpace" class="accent-blue-600 w-3.5 h-3.5" />
                <span class="text-xs text-gray-500">Personalizar por pregunta</span>
              </label>
            </div>

            <div>
              <label class="block text-sm text-gray-700 mb-1">Instrucciones <span class="text-gray-300">(opcional)</span></label>
              <textarea
                v-model="examOptions.instructions"
                rows="2"
                placeholder="No se permite el uso de calculadora"
                class="w-full border border-gray-200 rounded px-2 py-1.5 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            <div v-if="pointsWarning" class="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              La puntuación suma {{ totalPoints }} puntos (debería ser 10)
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col">
          <h2 class="text-sm font-semibold text-gray-800 mb-3">Vista previa</h2>
          <div class="flex-1 border border-gray-100 rounded bg-white shadow-inner p-5 overflow-y-auto" style="max-height: 420px">
            <div class="text-center font-bold text-sm mb-2">{{ examMeta.title || 'Examen de Matemáticas' }}</div>
            <div class="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>{{ course }}{{ examMeta.className ? ' — ' + examMeta.className : '' }}</span>
              <span v-if="examMeta.teacher">{{ examMeta.teacher }}</span>
              <span>{{ examMeta.date }}</span>
            </div>
            <div v-if="examMeta.modelo" class="text-[10px] text-gray-500 mb-1">Modelo: {{ examMeta.modelo }}</div>
            <div class="text-[10px] border-b border-gray-300 pb-1 mb-2">
              Nombre del alumno/a: <span class="inline-block w-40 border-b border-gray-400" />
            </div>
            <div v-if="examOptions.instructions" class="text-[10px] italic text-gray-400 mb-3">{{ examOptions.instructions }}</div>

            <div v-if="!previewQuestions.length" class="text-[10px] text-gray-300 italic text-center mt-6">Las preguntas aparecerán aquí</div>

            <div v-for="(q, i) in previewQuestions" :key="q.id" class="mb-3">
              <div class="flex items-baseline gap-1 text-[11px]">
                <span class="font-bold">{{ i + 1 }}.</span>
                <span v-if="q.points" class="text-gray-400">({{ q.points }} pts)</span>
              </div>
              <div class="ml-4 mt-0.5" style="font-size: 10px">
                <LatexPreview :latex="q.latex" />
              </div>
              <div
                v-if="answerSpaceForPreview(q) > 0"
                class="ml-4 mt-1 border border-dashed border-gray-200 rounded"
                :style="{ height: Math.round(answerSpaceForPreview(q) * 15) + 'px' }"
              />
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
          v-model:question-answer-space="q.answerSpace"
          :show-answer-space-slider="examOptions.answerSpace && examOptions.perQuestionSpace"
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

      <div class="mt-6 mb-8">
        <button @click="addQuestion" class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer">
          + Añadir pregunta
        </button>
      </div>

      <button
        :disabled="!hasQuestions || generating"
        @click="generateExam"
        class="w-full py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {{ generating ? 'Generando PDF…' : 'Generar Examen' }}
      </button>
    </div>
  </div>
</template>
