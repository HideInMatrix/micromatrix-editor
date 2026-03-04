<script setup lang="ts">
definePageMeta({
  layout: "pure",
});

useHead({
  title: "论文编写页面",
});
</script>

<template>
  <ClientOnly>
    <PaperWritingStudio />
    <template #fallback>
      <div class="grid min-h-screen place-items-center text-sm text-muted-foreground">
        正在初始化编辑器...
      </div>
    </template>
  </ClientOnly>
</template>
