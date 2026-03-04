<script lang="ts" setup>
const i18nHead = useLocaleHead({ seo: { canonicalQueries: ['keyword'] } })
useHead(() => ({
  htmlAttrs: {
    lang: i18nHead.value.htmlAttrs.lang
  },
  link: [...(i18nHead.value.link || [])],
  meta: [...(i18nHead.value.meta || [])]
}))
</script>


<template>
  <NuxtPage />
</template>
