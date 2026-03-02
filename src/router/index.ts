import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/profile/setup',
    name: 'profile-setup',
    component: () => import('../pages/ProfileSetupPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/room/:id',
    name: 'room',
    component: () => import('../pages/RoomPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard added in step 19
export default router
