<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { Plus } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useWritingStudioTableHoverControls } from "~/composables/writing-studio/table/useHoverControls";

const props = defineProps<{
  editor: Editor | null | undefined;
  container: HTMLElement | null;
}>();

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const containerRef = computed(() => props.container);

const { activeControl, activateCurrentControl, handleControlMouseEnter, handleControlMouseLeave } = useWritingStudioTableHoverControls(editorRef, containerRef);

const controlStyle = computed(() => {
  const control = activeControl.value;
  if (!control) {
    return undefined;
  }

  return {
    top: `${control.top}px`,
    left: `${control.left}px`,
    width: `${control.width}px`,
    height: `${control.height}px`,
  };
});

const controlLabel = computed(() => {
  return activeControl.value?.axis === "column" ? t("writingStudio.toolbar.table.quickAddColumn") : t("writingStudio.toolbar.table.quickAddRow");
});

const controlDescription = computed(() => {
  return activeControl.value?.axis === "column" ? t("writingStudio.toolbar.table.quickAddColumnDescription") : t("writingStudio.toolbar.table.quickAddRowDescription");
});

const hoverCardSide = computed(() => {
  return activeControl.value?.axis === "column" ? "left" : "top";
});
</script>

<template>
  <div
    v-if="activeControl"
    class="ws-table-hover-control"
    :class="[activeControl.axis === 'column' ? 'ws-table-hover-control--column' : 'ws-table-hover-control--row']"
    :style="controlStyle"
    @mouseenter="handleControlMouseEnter"
    @mouseleave="handleControlMouseLeave">
    <HoverCard :open-delay="80" :close-delay="40">
      <HoverCardTrigger as-child>
        <Button type="button" variant="outline" size="icon-sm" class="ws-table-hover-trigger" :aria-label="controlLabel" :title="controlLabel" @mousedown.prevent @click="activateCurrentControl">
          <Plus class="h-3 w-3" />
        </Button>
      </HoverCardTrigger>

      <HoverCardContent :side="hoverCardSide" align="center" :side-offset="10" class="flex w-44 max-w-[calc(100vw-24px)] flex-col gap-1.5 rounded-lg border-0 bg-black/92 p-3 text-white shadow-[0_12px_32px_-16px_oklch(0_0_0/0.7)]">
        <span class="text-center text-xs font-semibold leading-4">
          {{ controlLabel }}
        </span>
        <span class="text-center text-[11px] leading-4 text-white/78">
          {{ controlDescription }}
        </span>
      </HoverCardContent>
    </HoverCard>
  </div>
</template>
