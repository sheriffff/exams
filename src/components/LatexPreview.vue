<script setup>
import { ref, watch, onMounted } from 'vue'
import katex from 'katex'

const props = defineProps({
  latex: { type: String, default: '' },
})

const container = ref(null)

function renderMath(s) {
  return s.replace(
    /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\\\(([\s\S]*?)\\\)|\$([\s\S]*?)\$/g,
    (match, block1, block2, inline1, inline2) => {
      const tex = block1 ?? block2 ?? inline1 ?? inline2 ?? ''
      const displayMode = !!(block1 ?? block2)
      return katex.renderToString(tex, { displayMode, throwOnError: false })
    }
  )
}

function listStyleFromOpts(opts) {
  if (!opts) return null
  if (/\\Alph\*/.test(opts)) return 'upper-alpha'
  if (/\\alph\*/.test(opts)) return 'lower-alpha'
  if (/\\Roman\*/.test(opts)) return 'upper-roman'
  if (/\\roman\*/.test(opts)) return 'lower-roman'
  if (/\\arabic\*/.test(opts)) return 'decimal'
  return null
}

function convertEnvironments(s) {
  const re = /\\begin\{(enumerate|itemize)\}(\[[^\]]*\])?([\s\S]*?)\\end\{\1\}/g
  return s.replace(re, (m, env, opts, body) => {
    const tag = env === 'enumerate' ? 'ol' : 'ul'
    const items = body.split(/\\item\b/).slice(1)
    const lis = items
      .map((it) => `<li>${convertEnvironments(it).trim()}</li>`)
      .join('')
    let style = ''
    if (env === 'enumerate') {
      const st = listStyleFromOpts(opts)
      if (st) style = ` style="list-style-type:${st}"`
    }
    return `<${tag} class="latex-list"${style}>${lis}</${tag}>`
  })
}

function render() {
  if (!container.value) return
  if (!props.latex.trim()) {
    container.value.innerHTML = ''
    return
  }

  try {
    let result = renderMath(props.latex)
    result = convertEnvironments(result)
    result = result.replace(/\n/g, '<br>')
    result = result.replace(/<br>\s*(<\/?(?:ol|ul|li)[^>]*>)/g, '$1')
    result = result.replace(/(<\/?(?:ol|ul|li)[^>]*>)\s*<br>/g, '$1')

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

<style scoped>
.latex-preview :deep(.latex-list) {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  list-style-position: outside;
}
.latex-preview :deep(ol.latex-list) {
  list-style-type: decimal;
}
.latex-preview :deep(ul.latex-list) {
  list-style-type: disc;
}
.latex-preview :deep(.latex-list li) {
  margin: 0.25rem 0;
}
</style>
