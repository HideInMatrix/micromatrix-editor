<script setup lang="ts">
import { Square, Type } from "lucide-vue-next";
import { toRef } from "vue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useWritingStudioTableColorPanel,
  type WritingStudioTableColorPanelEntry,
} from "~/composables/writing-studio/table/useColorPanel";
import type {
  WritingStudioTableCellColorValue,
  WritingStudioTableColorKind,
} from "~/composables/writing-studio/table/useTableOperations";

const props = withDefaults(defineProps<{
  searchQuery?: string;
  kinds?: WritingStudioTableColorKind[];
}>(), {
  searchQuery: "",
  kinds: () => ["text", "background"],
});

const emit = defineEmits<{
  select: [payload: { kind: WritingStudioTableColorKind; value: WritingStudioTableCellColorValue }];
}>();

const { colorSections } = useWritingStudioTableColorPanel({
  searchQuery: toRef(props, "searchQuery"),
  kinds: toRef(props, "kinds"),
});

const resolveSwatchStyle = (entry: WritingStudioTableColorPanelEntry) => {
  if (entry.kind === "text") {
    return {
      color: entry.textColor ?? "oklch(var(--foreground))",
    };
  }

  return {
    color: entry.backgroundColor ?? "oklch(var(--muted-foreground))",
  };
};

const handleSelect = (entry: WritingStudioTableColorPanelEntry) => {
  emit("select", {
    kind: entry.kind,
    value: entry.value,
  });
};
</script>

<template>
  <ScrollArea class="ws-table-color-scroll h-[14rem] max-h-[60vh]">
    <template v-for="(section, index) in colorSections" :key="section.kind">
      <div class="ws-table-color-section gap-0.5 p-0.5">
        <div class="ws-table-color-title px-1.5 py-0.5 text-[11px]">
          {{ section.title }}
        </div>

        <button
          v-for="entry in section.entries"
          :key="`${entry.kind}-${entry.value}`"
          type="button"
          class="ws-table-color-item gap-1.5 rounded-md px-1.5 py-1 text-[11px]"
          @mousedown.prevent
          @click="handleSelect(entry)"
        >
          <span
            class="ws-table-color-swatch h-7 w-7 rounded-md"
            :style="resolveSwatchStyle(entry)"
          >
            <Type v-if="entry.kind === 'text'" class="h-3.5 w-3.5" />
            <Square v-else class="h-3.5 w-3.5 fill-current" />
          </span>
          <span>{{ entry.label }}</span>
        </button>
      </div>

      <Separator
        v-if="index < colorSections.length - 1"
        class="my-1.5"
      />
    </template>
  </ScrollArea>
</template>
