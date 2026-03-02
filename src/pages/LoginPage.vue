<script setup lang="ts">
import { useRouter } from 'vue-router'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase'

const router = useRouter()

async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  await signInWithPopup(auth, provider)
  router.replace({ name: 'home' })
}
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-8">
    <div class="text-center">
      <h1 class="text-5xl font-bold text-primary">⚔️ Excalibur</h1>
      <p class="mt-2 text-base-content/60">Avalon role assignment</p>
    </div>
    <button class="btn btn-primary btn-lg" @click="signInWithGoogle">
      Sign in with Google
    </button>
  </div>
</template>
