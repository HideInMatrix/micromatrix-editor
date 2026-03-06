<script setup lang="ts">
import { Code2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

withDefaults(defineProps<{
  disabled?: boolean;
  isCodeActive: boolean;
  isCodeBlockActive: boolean;
  dropdownItemClass: (active?: boolean) => string;
}>(), {
  disabled: false,
});

const emit = defineEmits<{
  (event: "toggle-code"): void;
  (event: "toggle-code-block"): void;
}>();

const { t } = useI18n();
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :disabled="disabled" class="h-8 px-2 text-xs">
        <Code2 />
        {{ t("writingStudio.toolbar.groups.codeNodes") }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="w-56">
      <DropdownMenuLabel>{{ t("writingStudio.toolbar.labels.codeActions") }}</DropdownMenuLabel>
      <DropdownMenuItem
        :class="dropdownItemClass(isCodeActive)"
        :disabled="disabled"
        @select.prevent="emit('toggle-code')"
      >
        {{ t("writingStudio.toolbar.marks.code") }}
      </DropdownMenuItem>
      <DropdownMenuItem
        :class="dropdownItemClass(isCodeBlockActive)"
        :disabled="disabled"
        @select.prevent="emit('toggle-code-block')"
      >
        {{ t("writingStudio.toolbar.block.codeBlock") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
