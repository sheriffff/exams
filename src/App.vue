<template>
  <RouterView />
  <Analytics />
  <SpeedInsights />
</template>

<script setup>
import { Analytics } from '@vercel/analytics/vue'
import { SpeedInsights } from '@vercel/speed-insights/vue'
</script>
