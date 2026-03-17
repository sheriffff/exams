<script setup>
import { ref } from 'vue'
import LatexPreview from './LatexPreview.vue'
import { generateQuestion, adjustDifficulty, iterateQuestion } from '@/services/gemini.js'

const props = defineProps({
  course: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  canMoveUp: { type: Boolean, default: false },
  canMoveDown: { type: Boolean, default: false },
})

const prompt = defineModel('prompt', { type: String, default: '' })
const latex = defineModel('latex', { type: String, default: '' })
const title = defineModel('title', { type: String, default: '' })
const points = defineModel('points', { type: Number, default: 0 })

const emit = defineEmits(['remove', 'move-up', 'move-down', 'toggle-collapse'])

const loading = ref(false)
const iterationText = ref('')

const DIFFICULTIES = [
  { value: 'FACIL', label: 'Fácil', color: 'bg-emerald-500' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-primary-500' },
  { value: 'DIFICIL', label: 'Difícil', color: 'bg-orange-500' },
  { value: 'GRAN_DESAFIO', label: 'Gran desafío', color: 'bg-red-500' },
]

const difficulty = defineModel('difficulty', { type: String, default: 'NORMAL' })
const questionType = defineModel('questionType', { type: String, default: 'analitico' })

async function generate() {
  if (!prompt.value.trim()) return
  loading.value = true
  try {
    const result = await generateQuestion(prompt.value, props.course, difficulty.value, questionType.value)
    latex.value = result.latex
    title.value = result.title
  } catch (e) {
    console.error('Error generating question:', e)
  } finally {
    loading.value = false
  }
}

async function adjust(direction) {
  if (!latex.value.trim()) return
  loading.value = true
  try {
    const result = await adjustDifficulty(latex.value, props.course, direction)
    latex.value = result.latex
    title.value = result.title
  } catch (e) {
    console.error('Error adjusting difficulty:', e)
  } finally {
    loading.value = false
  }
}

async function iterate() {
  if (!latex.value.trim() || !iterationText.value.trim()) return
  loading.value = true
  try {
    const result = await iterateQuestion(latex.value, props.course, iterationText.value)
    latex.value = result.latex
    title.value = result.title
    iterationText.value = ''
  } catch (e) {
    console.error('Error iterating question:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm hover:shadow-md transition-shadow">
    <div
      class="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
      :class="{ 'border-b border-gray-100': !collapsed }"
      @click="emit('toggle-collapse')"
    >
      <div class="flex items-center gap-2.5 flex-1 min-w-0">
        <div class="w-1.5 h-1.5 rounded-full shrink-0" :class="latex ? 'bg-accent-500' : 'bg-gray-300'" />
        <span class="text-sm font-semibold text-gray-700 truncate">
          {{ title || 'Nueva pregunta' }}
        </span>
      </div>
      <div class="flex items-center gap-1.5" @click.stop>
        <input
          type="number"
          v-model.number="points"
          min="0"
          max="10"
          step="0.5"
          placeholder="pts"
          class="w-14 text-xs text-center border border-gray-200/80 rounded-lg px-1 py-1 bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 placeholder-gray-300"
        />
        <button
          :disabled="!canMoveUp"
          @click="emit('move-up')"
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-all"
          title="Mover arriba"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" /></svg>
        </button>
        <button
          :disabled="!canMoveDown"
          @click="emit('move-down')"
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-all"
          title="Mover abajo"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" /></svg>
        </button>
        <button
          @click="emit('remove')"
          class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition-all"
          title="Eliminar"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>

    <div v-show="!collapsed" class="p-5">
      <div class="grid grid-cols-3 gap-5" :class="{ 'opacity-50 pointer-events-none': loading }">
        <div class="flex flex-col gap-2.5">
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Prompt IA</label>
          <textarea
            v-model="prompt"
            rows="5"
            placeholder="Describe la pregunta que quieres generar..."
            class="w-full border border-gray-200/80 rounded-xl p-3 text-sm resize-y bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 placeholder-gray-300 transition-all"
          />
          <div class="flex items-center gap-3">
            <div class="flex rounded-xl overflow-hidden border border-gray-200/80">
              <button
                v-for="d in DIFFICULTIES"
                :key="d.value"
                @click="difficulty = d.value"
                :class="[
                  difficulty === d.value ? d.color + ' text-white shadow-sm' : 'bg-white/80 text-gray-500 hover:bg-gray-50',
                  'px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer'
                ]"
              >{{ d.label }}</button>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 cursor-pointer text-xs" :class="questionType === 'analitico' ? 'text-primary-600 font-semibold' : 'text-gray-400'">
              <input type="radio" v-model="questionType" value="analitico" class="accent-primary-600" />
              Analítico
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer text-xs" :class="questionType === 'problema' ? 'text-primary-600 font-semibold' : 'text-gray-400'">
              <input type="radio" v-model="questionType" value="problema" class="accent-primary-600" />
              Problema
            </label>
          </div>
          <button
            @click="generate"
            :disabled="!prompt.trim() || loading"
            class="self-start inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-500 disabled:bg-gray-300 disabled:text-gray-500 transition-all cursor-pointer disabled:cursor-default shadow-sm hover:shadow-md font-medium"
          >
            <svg v-if="!loading" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
            <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {{ loading ? 'Generando...' : 'Generar con IA' }}
          </button>
        </div>

        <div class="flex flex-col gap-2.5">
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">LaTeX</label>
          <textarea
            v-model="latex"
            rows="15"
            placeholder="El LaTeX aparecerá aquí..."
            class="w-full border border-gray-200/80 rounded-xl p-3 text-sm font-mono resize-y bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 placeholder-gray-300 transition-all"
          />
          <div class="flex gap-2">
            <button
              @click="adjust('más fácil')"
              :disabled="!latex.trim() || loading"
              class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm rounded-xl disabled:bg-gray-300 disabled:text-gray-500 transition-all cursor-pointer disabled:cursor-default font-medium shadow-sm"
            >Más fácil</button>
            <button
              @click="adjust('más difícil')"
              :disabled="!latex.trim() || loading"
              class="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white text-sm rounded-xl disabled:bg-gray-300 disabled:text-gray-500 transition-all cursor-pointer disabled:cursor-default font-medium shadow-sm"
            >Más difícil</button>
          </div>
          <div v-if="latex.trim()" class="flex gap-2">
            <input
              v-model="iterationText"
              type="text"
              placeholder="Ej: que use fracciones, añade un apartado c..."
              class="flex-1 border border-gray-200/80 rounded-xl px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 placeholder-gray-300 transition-all"
              @keydown.enter="iterate"
            />
            <button
              @click="iterate"
              :disabled="!iterationText.trim() || loading"
              class="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white text-sm rounded-xl disabled:bg-gray-300 disabled:text-gray-500 transition-all cursor-pointer disabled:cursor-default font-medium whitespace-nowrap shadow-sm"
            >Modificar</button>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</label>
          <div class="border border-gray-100 rounded-xl p-4 min-h-[120px] bg-white overflow-auto">
            <LatexPreview :latex="latex" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
