import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import ExamEditor from '@/pages/ExamEditor.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/create', component: ExamEditor },
    { path: '/admin', component: () => import('@/pages/AdminPanel.vue') },
  ],
})

export default router
