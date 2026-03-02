<script setup lang="ts">
import { useCurrentUser } from 'vuefire'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

const user = useCurrentUser()

async function handleSignOut(): Promise<void> {
  await signOut(auth)
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-base-200">
    <header class="navbar bg-base-100 shadow-sm">
      <div class="flex-1">
        <router-link to="/" class="btn btn-ghost text-xl">⚔️ Excalibur</router-link>
      </div>
      <div v-if="user" class="flex-none">
        <span class="mr-2 text-sm">{{ user.displayName ?? user.email }}</span>
        <button class="btn btn-ghost btn-sm" @click="handleSignOut">Sign Out</button>
      </div>
    </header>
    <main class="flex flex-1 flex-col p-4">
      <slot />
    </main>
  </div>
</template>
