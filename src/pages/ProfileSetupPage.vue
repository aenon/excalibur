<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCurrentUser } from 'vuefire'
import { useUserProfile } from '../composables/useUserProfile'

const router = useRouter()
const currentUser = useCurrentUser()
const { createOrUpdateProfile } = useUserProfile()

const displayName = ref(currentUser.value?.displayName ?? '')
const loading = ref(false)
const error = ref('')

async function handleSubmit(): Promise<void> {
  const name = displayName.value.trim()
  if (!name) {
    error.value = 'Display name is required'
    return
  }
  if (name.length > 30) {
    error.value = 'Display name must be 30 characters or less'
    return
  }

  loading.value = true
  error.value = ''
  try {
    await createOrUpdateProfile(name)
    router.replace({ name: 'home' })
  } catch (e) {
    error.value = 'Failed to save profile. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center gap-6">
    <div class="text-center">
      <h1 class="text-3xl font-bold">Welcome, adventurer!</h1>
      <p class="mt-1 text-base-content/60">Choose a display name for your quests</p>
    </div>

    <form class="w-full max-w-xs" @submit.prevent="handleSubmit">
      <div class="form-control">
        <label class="label" for="displayName">
          <span class="label-text">Display Name</span>
        </label>
        <input
          id="displayName"
          v-model="displayName"
          type="text"
          placeholder="Sir Lancelot"
          class="input input-bordered w-full"
          maxlength="30"
          autofocus
        />
      </div>

      <div v-if="error" class="mt-2 text-sm text-error">{{ error }}</div>

      <button
        type="submit"
        class="btn btn-primary mt-4 w-full"
        :disabled="loading"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm" />
        {{ loading ? 'Saving...' : 'Continue' }}
      </button>
    </form>
  </div>
</template>
