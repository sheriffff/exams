<script setup>
import { ref, watch, onMounted } from 'vue'
import katex from 'katex'

const props = defineProps({
  latex: { type: String, default: '' },
})

const container = ref(null)

function render() {
  if (!container.value) return
  if (!props.latex.trim()) {
    container.value.innerHTML = '<span class="text-gray-400 italic">Sin contenido</span>'
    return
  }

  try {
    const html = props.latex.replace(
      /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$|\$([\s\S]*?)\$/g,
      (match, block1, inline1, block2, inline2) => {
        const tex = block1 ?? block2 ?? inline1 ?? inline2 ?? ''
        const displayMode = !!(block1 ?? block2)
        return katex.renderToString(tex, { displayMode, throwOnError: false })
      }
    )

    const parts = props.latex.split(
      /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/g
    )
    const maths = props.latex.match(
      /\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[\s\S]*?\$/g
    ) || []

    let result = ''
    for (let i = 0; i < parts.length; i++) {
      result += parts[i].replace(/\n/g, '<br>')
      if (i < maths.length) {
        const m = maths[i]
        const tex = m.replace(/^\\\[|\\\]$|^\\\(|\\\)$|^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '')
        const displayMode = m.startsWith('\\[') || m.startsWith('$$')
        result += katex.renderToString(tex, { displayMode, throwOnError: false })
      }
    }

    container.value.innerHTML = result
  } catch {
    container.value.innerHTML = `<span class="text-red-500">Error al renderizar LaTeX</span>`
  }
}

onMounted(render)
watch(() => props.latex, render)
</script>

<template>
  <div ref="container" class="latex-preview leading-relaxed" />
</template>
