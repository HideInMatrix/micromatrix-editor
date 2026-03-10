<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListX,
  ListOrdered,
  ListTodo,
  Pilcrow,
} from "lucide-vue-next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useWritingStudioBlockActions } from "~/composables/writing-studio/actions/useBlockActions";
import { useWritingStudioListActions } from "~/composables/writing-studio/actions/useListActions";
import type { ListTypeValue, ParagraphHeadingValue } from "./types";

const props = withDefaults(defineProps<{
  editor: Editor | null | undefined;
}>(), {
});

const { t } = useI18n();
const editorRef = computed(() => props.editor);
const { setParagraph, toggleHeading } = useWritingStudioBlockActions(editorRef);
const { toggleBulletList, toggleOrderedList, toggleTaskList } = useWritingStudioListActions(editorRef);

const paragraphHeadingOptions = [
  { value: "paragraph", labelKey: "writingStudio.toolbar.block.paragraph", icon: Pilcrow },
  { value: "heading1", labelKey: "writingStudio.toolbar.block.heading1", icon: Heading1 },
  { value: "heading2", labelKey: "writingStudio.toolbar.block.heading2", icon: Heading2 },
  { value: "heading3", labelKey: "writingStudio.toolbar.block.heading3", icon: Heading3 },
  { value: "heading4", labelKey: "writingStudio.toolbar.block.heading4", icon: Heading4 },
  { value: "heading5", labelKey: "writingStudio.toolbar.block.heading5", icon: Heading5 },
  { value: "heading6", labelKey: "writingStudio.toolbar.block.heading6", icon: Heading6 },
] as const;

const listTypeOptions = [
  { value: "bulletList", labelKey: "writingStudio.toolbar.block.bulletList", icon: List },
  { value: "orderedList", labelKey: "writingStudio.toolbar.block.orderedList", icon: ListOrdered },
  { value: "taskList", labelKey: "writingStudio.toolbar.block.taskList", icon: ListTodo },
] as const;

const clearListOption = {
  value: "clearList",
  labelKey: "writingStudio.toolbar.block.clearList",
  icon: ListX,
} as const;

const headingLevelMap: Record<Exclude<ParagraphHeadingValue, "paragraph">, 1 | 2 | 3 | 4 | 5 | 6> = {
  heading1: 1,
  heading2: 2,
  heading3: 3,
  heading4: 4,
  heading5: 5,
  heading6: 6,
};

const currentParagraphHeading = (): ParagraphHeadingValue => {
  if (props.editor?.isActive("heading", { level: 1 })) {
    return "heading1";
  }
  if (props.editor?.isActive("heading", { level: 2 })) {
    return "heading2";
  }
  if (props.editor?.isActive("heading", { level: 3 })) {
    return "heading3";
  }
  if (props.editor?.isActive("heading", { level: 4 })) {
    return "heading4";
  }
  if (props.editor?.isActive("heading", { level: 5 })) {
    return "heading5";
  }
  if (props.editor?.isActive("heading", { level: 6 })) {
    return "heading6";
  }

  return "paragraph";
};

const currentListType = (): ListTypeValue | undefined => {
  if (props.editor?.isActive("bulletList")) {
    return "bulletList";
  }
  if (props.editor?.isActive("orderedList")) {
    return "orderedList";
  }
  if (props.editor?.isActive("taskList")) {
    return "taskList";
  }

  return undefined;
};

const currentParagraphHeadingOption = computed(() => {
  return paragraphHeadingOptions.find(option => option.value === currentParagraphHeading()) ?? paragraphHeadingOptions[0];
});

const currentListTypeOption = computed(() => {
  return listTypeOptions.find(option => option.value === currentListType()) ?? null;
});

const handleParagraphHeadingChange = (value: unknown) => {
  if (typeof value === "string" && paragraphHeadingOptions.some(option => option.value === value)) {
    if (value === "paragraph") {
      setParagraph();
      return;
    }

    if (value in headingLevelMap) {
      toggleHeading(headingLevelMap[value as keyof typeof headingLevelMap]);
    }
  }
};

const handleListTypeChange = (value: unknown) => {
  if (value === clearListOption.value) {
    const activeListType = currentListType();

    if (activeListType === "bulletList") {
      toggleBulletList();
      return;
    }

    if (activeListType === "orderedList") {
      toggleOrderedList();
      return;
    }

    if (activeListType === "taskList") {
      toggleTaskList();
    }

    return;
  }

  if (value === "bulletList") {
    toggleBulletList();
    return;
  }

  if (value === "orderedList") {
    toggleOrderedList();
    return;
  }

  if (value === "taskList") {
    toggleTaskList();
  }
};
</script>

<template>
  <Select
    :model-value="currentParagraphHeading()"
    :disabled="!editor"
    @update:model-value="handleParagraphHeadingChange"
  >
    <SelectTrigger class="h-8 w-[6rem] px-2 text-xs">
      <div class="flex min-w-0 items-center gap-1.5">
        <component :is="currentParagraphHeadingOption.icon" class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate">{{ t(currentParagraphHeadingOption.labelKey) }}</span>
      </div>
    </SelectTrigger>
    <SelectContent align="start" class="w-[220px]">
      <SelectItem
        v-for="option in paragraphHeadingOptions"
        :key="option.value"
        :value="option.value"
      >
        <div class="flex items-center gap-2">
          <component :is="option.icon" class="h-4 w-4 shrink-0" />
          <span>{{ t(option.labelKey) }}</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>

  <Select
    :model-value="currentListType()"
    :disabled="!editor"
    @update:model-value="handleListTypeChange"
  >
    <SelectTrigger class="h-8 w-[6rem] px-2 text-xs">
      <div class="flex min-w-0 items-center gap-1.5" :class="{ 'text-muted-foreground': !currentListTypeOption }">
        <component :is="currentListTypeOption?.icon ?? List" class="h-3.5 w-3.5 shrink-0" />
        <span class="truncate">
          {{ currentListTypeOption ? t(currentListTypeOption.labelKey) : t("writingStudio.toolbar.groups.listNodes") }}
        </span>
      </div>
    </SelectTrigger>
    <SelectContent align="start" class="w-[200px]">
      <SelectItem :value="clearListOption.value">
        <div class="flex items-center gap-2">
          <component :is="clearListOption.icon" class="h-4 w-4 shrink-0" />
          <span>{{ t(clearListOption.labelKey) }}</span>
        </div>
      </SelectItem>
      <SelectItem
        v-for="option in listTypeOptions"
        :key="option.value"
        :value="option.value"
      >
        <div class="flex items-center gap-2">
          <component :is="option.icon" class="h-4 w-4 shrink-0" />
          <span>{{ t(option.labelKey) }}</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
