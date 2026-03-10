<script lang="ts" setup>
import type { CSSProperties } from "vue";
import { Button } from "@/components/ui/button";
import { useWritingStudioMathEditor } from "~/composables/writing-studio/math/useMathEditor";

const { t } = useI18n();
const { isMathEditorOpen, mathEditorKind, mathEditorLatex, mathEditorRect, closeMathEditor, saveMathEditor, refreshMathEditorRect } = useWritingStudioMathEditor();

const panelRef = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const draftLatex = ref("");
const viewportWidth = ref(0);
const viewportHeight = ref(0);

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const syncViewport = () => {
  if (!import.meta.client) {
    return;
  }

  viewportWidth.value = window.innerWidth;
  viewportHeight.value = window.innerHeight;
};

const panelStyle = computed<CSSProperties>(() => {
  const rect = mathEditorRect.value;

  if (!rect || !viewportWidth.value || !viewportHeight.value) {
    return {
      visibility: "hidden",
    };
  }

  const panelWidth = Math.min(820, Math.max(viewportWidth.value - 32, 320));
  const left = clamp(rect.left, 16, Math.max(16, viewportWidth.value - panelWidth - 16));
  const preferredTop = rect.top + rect.height + 14;
  const top = clamp(preferredTop, 16, Math.max(16, viewportHeight.value - 320));

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${panelWidth}px`,
  };
});

const headingLabel = computed(() => {
  return mathEditorKind.value === "block" ? t("writingStudio.toolbar.mathEditor.editBlock") : t("writingStudio.toolbar.mathEditor.editInline");
});

const doneLabel = computed(() => {
  return `${t("writingStudio.toolbar.mathEditor.done")} ↵`;
});

const saveCurrentMath = () => {
  saveMathEditor(draftLatex.value);
};

const handlePointerDown = (event: PointerEvent) => {
  if (!isMathEditorOpen.value) {
    return;
  }

  const target = event.target as Node | null;

  if (panelRef.value?.contains(target)) {
    return;
  }

  closeMathEditor();
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (!isMathEditorOpen.value) {
    return;
  }

  if (event.key === "Escape") {
    closeMathEditor();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    saveCurrentMath();
  }
};

const handleViewportChange = () => {
  syncViewport();
  refreshMathEditorRect();
};

watch(
  isMathEditorOpen,
  (isOpen) => {
    if (!isOpen) {
      return;
    }

    draftLatex.value = mathEditorLatex.value;
    syncViewport();

    nextTick(() => {
      textareaRef.value?.focus();
      textareaRef.value?.select();
    });
  },
  {
    immediate: true,
  },
);

watch(mathEditorLatex, (nextLatex) => {
  if (!isMathEditorOpen.value) {
    return;
  }

  draftLatex.value = nextLatex;
});

onMounted(() => {
  if (!import.meta.client) {
    return;
  }

  syncViewport();

  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("scroll", handleViewportChange, true);
});

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return;
  }

  document.removeEventListener("pointerdown", handlePointerDown);
  document.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("resize", handleViewportChange);
  window.removeEventListener("scroll", handleViewportChange, true);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isMathEditorOpen" class="fixed inset-0 z-[80] pointer-events-none">
      <section ref="panelRef" class="pointer-events-auto fixed flex flex-col gap-[0.4375rem]" :style="panelStyle">
        <div class="relative rounded-[0.7rem] border border-border/92 bg-background/98 px-[0.625rem] pb-[0.55rem] pt-[0.625rem] [box-shadow:0_28px_70px_-38px_oklch(0_0_0/0.32)] max-md:px-[0.5rem] max-md:pb-[0.475rem] max-md:pt-[0.5rem]">
          <textarea
            ref="textareaRef"
            v-model="draftLatex"
            class="min-h-[5.25rem] w-full resize-y border-0 bg-transparent pr-[4.25rem] text-[0.75rem] leading-[1.7] text-foreground/70 outline-none placeholder:text-muted-foreground/90 max-md:min-h-[4.25rem] max-md:pt-[1.7rem] max-md:pr-0 max-md:text-[0.7125rem] [font-family:JetBrains_Mono,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation_Mono,Courier_New,monospace]"
            spellcheck="false"
            :placeholder="t('writingStudio.toolbar.mathEditor.placeholder')" />

          <Button
            type="button"
            size="sm"
            class="absolute right-[0.5rem] top-[0.5rem] h-[1.85rem] rounded-[0.425rem] bg-[linear-gradient(180deg,oklch(0.64_0.2_255),oklch(0.58_0.19_258))] px-[0.5rem] text-[0.6875rem] font-semibold text-white [box-shadow:0_16px_35px_-20px_oklch(0.55_0.22_255/0.9)] disabled:opacity-55"
            :disabled="!draftLatex.trim()"
            @click="saveCurrentMath">
            {{ doneLabel }}
          </Button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
