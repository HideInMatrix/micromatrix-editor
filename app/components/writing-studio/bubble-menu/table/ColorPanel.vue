<script setup lang="ts">
import { Square, Type } from "lucide-vue-next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useWritingStudioTableColumnColors,
  type WritingStudioTableCellColorValue,
  type WritingStudioTableColorKind,
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

const { t } = useI18n();
const colorPresets = useWritingStudioTableColumnColors();

const resolveFilteredColorEntries = (kind: WritingStudioTableColorKind) => {
  const query = props.searchQuery.trim().toLowerCase();
  const entries = Object.entries(colorPresets[kind]) as Array<
    [WritingStudioTableCellColorValue, (typeof colorPresets)[typeof kind][WritingStudioTableCellColorValue]]
  >;

  if (!query) {
    return entries;
  }

  return entries.filter(([, preset]) => {
    return t(preset.labelKey).toLowerCase().includes(query);
  });
};

const filteredTextColorEntries = computed(() => {
  if (!props.kinds.includes("text")) {
    return [];
  }

  return resolveFilteredColorEntries("text");
});

const filteredBackgroundColorEntries = computed(() => {
  if (!props.kinds.includes("background")) {
    return [];
  }

  return resolveFilteredColorEntries("background");
});
</script>

<template>
  <ScrollArea class="ws-table-color-scroll h-[14rem] max-h-[60vh]">
    <div v-if="filteredTextColorEntries.length > 0" class="ws-table-color-section gap-0.5 p-0.5">
      <div class="ws-table-color-title px-1.5 py-0.5 text-[11px]">
        {{ t("writingStudio.toolbar.table.columnMenu.colors.text.title") }}
      </div>

      <button
        v-for="[value, preset] in filteredTextColorEntries"
        :key="`text-${value}`"
        type="button"
        class="ws-table-color-item gap-1.5 rounded-md px-1.5 py-1 text-[11px]"
        @mousedown.prevent
        @click="emit('select', { kind: 'text', value })"
      >
        <span
          class="ws-table-color-swatch h-7 w-7 rounded-md"
          :style="{ color: preset.textColor ?? 'oklch(var(--foreground))' }"
        >
          <Type class="h-3.5 w-3.5" />
        </span>
        <span>{{ t(preset.labelKey) }}</span>
      </button>
    </div>

    <Separator
      v-if="filteredTextColorEntries.length > 0 && filteredBackgroundColorEntries.length > 0"
      class="my-1.5"
    />

    <div v-if="filteredBackgroundColorEntries.length > 0" class="ws-table-color-section gap-0.5 p-0.5">
      <div class="ws-table-color-title px-1.5 py-0.5 text-[11px]">
        {{ t("writingStudio.toolbar.table.columnMenu.colors.background.title") }}
      </div>

      <button
        v-for="[value, preset] in filteredBackgroundColorEntries"
        :key="`background-${value}`"
        type="button"
        class="ws-table-color-item gap-1.5 rounded-md px-1.5 py-1 text-[11px]"
        @mousedown.prevent
        @click="emit('select', { kind: 'background', value })"
      >
        <span
          class="ws-table-color-swatch h-7 w-7 rounded-md"
          :style="{ color: preset.backgroundColor ?? 'oklch(var(--muted-foreground))' }"
        >
          <Square class="h-3.5 w-3.5 fill-current" />
        </span>
        <span>{{ t(preset.labelKey) }}</span>
      </button>
    </div>
  </ScrollArea>
</template>
