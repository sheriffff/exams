<script setup>
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()

let clickCount = 0
let clickTimer = null

function handlePorClick() {
  clickCount++
  clearTimeout(clickTimer)
  clickTimer = setTimeout(() => { clickCount = 0 }, 800)
  if (clickCount >= 3) {
    clickCount = 0
    router.push('/admin')
  }
}
</script>

<template>
  <div class="min-h-screen relative overflow-hidden">
    <div class="absolute inset-0 -z-10">
      <div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-200/40 blur-3xl" />
      <div class="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-accent-400/20 blur-3xl" />
    </div>

    <div class="max-w-5xl mx-auto px-6 pt-20 pb-12">
      <div class="text-center mb-16">
        <h1 class="text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
          Generador de<br />
          <span class="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">Exámenes de Matemáticas</span>
        </h1>
      </div>

      <div class="flex justify-center mb-20">
        <RouterLink
          to="/create"
          class="group relative inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-500 text-white rounded-2xl text-base font-bold shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/35 hover:from-primary-500 hover:to-accent-400 transition-all duration-200 overflow-hidden"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <svg class="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span class="relative">Crear examen</span>
        </RouterLink>
      </div>

      <div class="text-center mt-16 text-sm text-neutral-500">
        <span @click.prevent="handlePorClick" class="cursor-default select-none">por</span> <a href="https://www.linkedin.com/in/sheriff-data" target="_blank" class="text-primary-600 hover:underline">Manuel López Sheriff</a>
      </div>
    </div>
  </div>
</template>
