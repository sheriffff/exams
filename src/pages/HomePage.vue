<script setup>
import { RouterLink, useRouter } from 'vue-router'
import EscueliaWordmark from '@/components/EscueliaWordmark.vue'

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
      <div class="text-center mb-12">
        <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
          Generador de<br />
          <span class="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">Exámenes de Matemáticas</span>
        </h1>
        <p class="text-lg text-neutral-600 max-w-2xl mx-auto">
          Monta un examen en minutos: enunciados a medida, soluciones desarrolladas y PDF listo para imprimir.
        </p>
      </div>

      <div class="flex justify-center mb-16">
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

      <div class="grid md:grid-cols-2 gap-5 mb-16 max-w-3xl mx-auto">
        <div class="glass rounded-2xl p-6">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center mb-3 text-lg font-bold">1</div>
          <h3 class="font-bold text-neutral-900 mb-1">Escribe o pide enunciados</h3>
          <p class="text-sm text-neutral-600">Tú dictas el tema y el curso; te proponemos ejercicios que puedes editar al vuelo.</p>
        </div>
        <div class="glass rounded-2xl p-6">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white flex items-center justify-center mb-3 text-lg font-bold">2</div>
          <h3 class="font-bold text-neutral-900 mb-1">Descarga el examen y las soluciones</h3>
          <p class="text-sm text-neutral-600">Dos PDFs listos para imprimir: el de los alumnos y el resuelto para ti.</p>
          <a href="/ejemplo.pdf" target="_blank" class="inline-block mt-2 text-xs text-primary-600 hover:text-primary-700 underline underline-offset-2">Descargar ejemplo</a>
        </div>
      </div>

      <div class="flex items-baseline justify-center gap-2 mt-16 text-xl text-neutral-500 whitespace-nowrap">
        <span @click.prevent="handlePorClick" class="cursor-default select-none">creado por</span>
        <EscueliaWordmark size="2rem" />
      </div>
    </div>
  </div>
</template>
