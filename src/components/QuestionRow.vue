<script setup>
import { ref } from 'vue'
import LatexPreview from './LatexPreview.vue'
import { generateQuestion, adjustDifficulty } from '@/services/gemini.js'

const props = defineProps({
  course: { type: String, required: true },
  collapsed: { type: Boolean, default: false },
  canMoveUp: { type: Boolean, default: false },
  canMoveDown: { type: Boolean, default: false },
  showAnswerSpaceSlider: { type: Boolean, default: false },
})

const prompt = defineModel('prompt', { type: String, default: '' })
const latex = defineModel('latex', { type: String, default: '' })
const title = defineModel('title', { type: String, default: '' })
const points = defineModel('points', { type: Number, default: 0 })
const questionAnswerSpace = defineModel('questionAnswerSpace', { type: Number, default: 5 })

const emit = defineEmits(['remove', 'move-up', 'move-down', 'toggle-collapse'])

const loading = ref(false)

const difficultyButtons = [
  { label: '- -', direction: 'más fácil', color: 'bg-green-700 hover:bg-green-800' },
  { label: '-', direction: 'un poquito más fácil', color: 'bg-green-500 hover:bg-green-600' },
  { label: '+', direction: 'un poquito más difícil', color: 'bg-orange-500 hover:bg-orange-600' },
  { label: '+ +', direction: 'más difícil', color: 'bg-orange-700 hover:bg-orange-800' },
]

async function generate() {
  if (!prompt.value.trim()) return
  loading.value = true
  try {
    const result = await generateQuestion(prompt.value, props.course)
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
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
    <div
      class="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
      :class="{ 'border-b border-gray-200': !collapsed }"
      @click="emit('toggle-collapse')"
    >
      <span class="text-sm font-medium text-gray-700 truncate flex-1">
        {{ title || 'Nueva pregunta' }}
      </span>
      <div class="flex items-center gap-1.5" @click.stop>
        <input
          type="number"
          v-model.number="points"
          min="0"
          max="10"
          step="0.5"
          placeholder="pts"
          class="w-14 text-xs text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300"
        />
        <button
          :disabled="!canMoveUp"
          @click="emit('move-up')"
          class="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          title="Mover arriba"
        >↑</button>
        <button
          :disabled="!canMoveDown"
          @click="emit('move-down')"
          class="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          title="Mover abajo"
        >↓</button>
        <button
          @click="emit('remove')"
          class="p-1 text-red-400 hover:text-red-600 cursor-pointer"
          title="Eliminar"
        >✕</button>
      </div>
    </div>

    <div v-show="!collapsed" class="p-4">
      <div class="grid grid-cols-3 gap-4" :class="{ 'opacity-50 pointer-events-none': loading }">
        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold text-gray-500 uppercase">Prompt IA</label>
          <textarea
            v-model="prompt"
            rows="5"
            placeholder="Describe la pregunta que quieres generar..."
            class="w-full border border-gray-300 rounded-md p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            @click="generate"
            :disabled="!prompt.trim() || loading"
            class="self-start px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors cursor-pointer disabled:cursor-default"
          >
            {{ loading ? 'Generando...' : 'Generar con IA' }}
          </button>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold text-gray-500 uppercase">LaTeX</label>
          <textarea
            v-model="latex"
            rows="15"
            placeholder="El LaTeX aparecerá aquí..."
            class="w-full border border-gray-300 rounded-md p-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div class="flex gap-1.5">
            <button
              v-for="btn in difficultyButtons"
              :key="btn.direction"
              @click="adjust(btn.direction)"
              :disabled="!latex.trim() || loading"
              :title="btn.direction"
              :class="btn.color"
              class="px-2.5 py-1.5 text-white text-sm rounded-md disabled:bg-gray-300 disabled:text-gray-500 transition-colors cursor-pointer disabled:cursor-default"
            >{{ btn.label }}</button>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold text-gray-500 uppercase">Preview</label>
          <div class="border border-gray-200 rounded-md p-3 min-h-[120px] bg-gray-50 overflow-auto">
            <LatexPreview :latex="latex" />
          </div>
        </div>
      </div>
      <div v-if="showAnswerSpaceSlider" class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
        <span class="text-xs text-gray-500 whitespace-nowrap">Espacio:</span>
        <input type="range" v-model.number="questionAnswerSpace" min="0" max="15" step="0.5" class="flex-1 accent-blue-600" />
        <span class="text-xs text-gray-400 w-12 text-right">{{ questionAnswerSpace }} cm</span>
      </div>
    </div>
  </div>
</template>
