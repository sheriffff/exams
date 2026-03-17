<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const password = ref('')
const error = ref(false)
const authenticated = ref(false)
const checking = ref(false)

const ADMIN_PASSWORD_HASH = 'a06cd80a62f31eeee3da744d28e7071227e6e5faeda82b91659ff4705949cde8'

async function hashPassword(pw) {
  const encoded = new TextEncoder().encode(pw)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function login() {
  if (!password.value.trim()) return
  checking.value = true
  error.value = false
  const hash = await hashPassword(password.value)
  if (hash === ADMIN_PASSWORD_HASH) {
    authenticated.value = true
  } else {
    error.value = true
    password.value = ''
  }
  checking.value = false
}
</script>

<template>
  <div class="min-h-screen relative flex items-center justify-center">
    <div class="absolute inset-0 -z-10">
      <div class="absolute top-[-15%] left-[20%] w-[400px] h-[400px] rounded-full bg-primary-200/30 blur-3xl" />
      <div class="absolute bottom-[-10%] right-[10%] w-[350px] h-[350px] rounded-full bg-accent-400/15 blur-3xl" />
    </div>

    <div v-if="!authenticated" class="w-full max-w-sm">
      <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg p-8">
        <div class="text-center mb-6">
          <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-xl font-extrabold text-gray-900 tracking-tight">Admin</h1>
        </div>

        <form @submit.prevent="login" class="space-y-4">
          <div>
            <input
              v-model="password"
              type="password"
              placeholder="Contraseña"
              autofocus
              class="w-full border border-gray-200/80 rounded-xl px-4 py-3 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 placeholder-gray-300 transition-all"
              :class="{ 'border-red-300 focus:ring-red-500/30 focus:border-red-400': error }"
            />
            <p v-if="error" class="mt-2 text-xs text-red-500 font-medium">Contraseña incorrecta</p>
          </div>
          <button
            type="submit"
            :disabled="!password.trim() || checking"
            class="w-full py-3 bg-gradient-to-r from-primary-600 to-accent-500 text-white font-bold rounded-xl hover:from-primary-500 hover:to-accent-400 shadow-md shadow-primary-500/20 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Entrar
          </button>
        </form>

        <button @click="router.push('/')" class="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
          Volver
        </button>
      </div>
    </div>

    <div v-else class="w-full max-w-4xl mx-auto px-6 py-12">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-extrabold tracking-tight text-gray-900">Panel de Admin</h1>
        <button @click="router.push('/')" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl hover:bg-white/60 transition-all cursor-pointer">
          Salir
        </button>
      </div>

      <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-8">
        <p class="text-gray-500 text-sm text-center">Panel vacío — aquí irán las opciones de administración.</p>
      </div>
    </div>
  </div>
</template>
