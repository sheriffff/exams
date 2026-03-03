<script setup>
const model = defineModel({ type: String, default: '1 ESO' })

const courses = [
  '1 ESO',
  '2 ESO',
  '3 ESO',
  '4 ESO',
  '1 Bachillerato',
  '2 Bachillerato',
]
</script>

<template>
  <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
    Curso:
    <select
      v-model="model"
      class="border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option v-for="c in courses" :key="c" :value="c">{{ c }}</option>
    </select>
  </label>
</template>
