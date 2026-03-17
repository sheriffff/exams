<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getTemplates, deleteTemplate } from '@/services/templates'

const router = useRouter()
const templates = ref(getTemplates())

function removeTemplate(id) {
  deleteTemplate(id)
  templates.value = getTemplates()
}

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

      <div class="flex justify-center gap-4 mb-20">
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
        <RouterLink
          to="/templates"
          class="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white text-gray-700 rounded-xl text-base font-semibold border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
        >
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
          </svg>
          Nueva plantilla
        </RouterLink>
      </div>

      <div v-if="templates.length">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Tus plantillas</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="t in templates"
            :key="t.id"
            class="group relative bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-primary-200 transition-all duration-200 overflow-hidden"
          >
            <RouterLink :to="`/templates/${t.id}`" class="block p-4">
              <div v-if="t.thumbnail" class="mb-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                <img :src="t.thumbnail" class="w-full h-32 object-cover object-top" />
              </div>
              <div v-else class="mb-3 h-32 rounded-lg bg-gradient-to-br from-primary-50 to-accent-400/10 flex items-center justify-center">
                <svg class="w-10 h-10 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 class="font-semibold text-gray-800 text-sm">{{ t.name }}</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ t.createdAt }}</p>
            </RouterLink>
            <button
              @click="removeTemplate(t.id)"
              class="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="text-center mt-16 text-sm text-neutral-500">
        <span @click.prevent="handlePorClick" class="cursor-default select-none">por</span> <a href="https://www.linkedin.com/in/sheriff-data" target="_blank" class="text-primary-600 hover:underline">Manuel López Sheriff</a>
      </div>
    </div>
  </div>
</template>
