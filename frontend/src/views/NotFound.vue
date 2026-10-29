<!-- 404 page for unknown URLs (S3). -->
<template>
  <main class="px-4 py-20 text-center">
    <p class="text-6xl font-bold text-red-700">404</p>
    <h1 class="mt-4 text-3xl font-bold">Page not found</h1>
    <p class="mt-2 text-gray-600">
      We couldn't find <code class="rounded bg-gray-100 px-1">{{ route.fullPath }}</code>.
    </p>
    <router-link
      to="/"
      class="mt-8 inline-block rounded bg-red-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
    >
      Back to the dashboard
    </router-link>
  </main>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>
