<script setup>
defineProps({
  size: { type: String, default: '2rem' },
  iaDy: { type: String, default: '0em' },
  asLink: { type: Boolean, default: true },
})
</script>

<template>
  <a
    v-if="asLink"
    href="https://escuelia.es"
    class="wordmark"
    :style="{ '--wm-size': size, '--wm-ia-dy': iaDy }"
  >
    <span class="escuel">escuel</span><span class="ia">IA</span>
  </a>
  <span
    v-else
    class="wordmark"
    :style="{ '--wm-size': size, '--wm-ia-dy': iaDy }"
  >
    <span class="escuel">escuel</span><span class="ia">IA</span>
  </span>
</template>
