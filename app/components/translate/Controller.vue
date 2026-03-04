<script setup lang="ts">
// Nuxt i18n 提供的组合式 API
const { locale, locales, setLocale } = useI18n()

// 导入图标
import { Languages, ChevronDown } from 'lucide-vue-next'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { LanguageCode } from '~~/shared/types/language'

const currentLocaleName = computed(() => {
  return locales.value.find(l => l.code === locale.value)?.name || 'Language'
})

// 执行切换逻辑
const onLocaleChange = (code: LanguageCode) => {
  setLocale(code) // 更新语言并自动更新 Cookie
}
</script>

<template>
  <div class="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="sm" class="h-8 gap-2 px-2 text-zinc-500 hover:text-blue-600 transition-colors">
          <Languages :size="16" />
          <span class="text-xs font-medium">{{ currentLocaleName }}</span>
          <ChevronDown :size="14" class="opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" class="w-32 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DropdownMenuItem 
          v-for="item in locales" 
          :key="item.code"
          @click="onLocaleChange(item.code)"
          :class="[
            'text-xs cursor-pointer px-3 py-2',
            locale === item.code ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-500/10' : 'text-zinc-600 dark:text-zinc-400'
          ]"
        >
          {{ item.name }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>