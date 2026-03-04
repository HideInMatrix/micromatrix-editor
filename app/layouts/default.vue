<script lang="ts" setup>
import { useRoute } from "vue-router";

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col h-screen">
    <div class="w-full sticky top-0 z-50 backdrop-blur border-b dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 shadow-sm">
      <div class="max-w-7xl mx-auto my-2 text-center md:text-left flex justify-between items-center">
        <NuxtLinkLocale :to="localePath('/')">
          <h1 class="text-xl md:text-2xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <NuxtImg src="/favicon.ico" class="w-8 h-8" />
            {{ t("home") }}
          </h1>
        </NuxtLinkLocale>
        <div class="flex items-center gap-2">
          <TranslateController />
          <ElButton v-if="route.path !== localePath('/')">
            <NuxtLinkLocale :to="localePath('/')">{{ t("back") }}</NuxtLinkLocale>
          </ElButton>
        </div>
      </div>
    </div>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
