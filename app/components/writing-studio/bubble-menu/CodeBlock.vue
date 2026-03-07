<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import {
  Check,
  ChevronDown,
  Copy,
  Ellipsis,
  WrapText,
} from "lucide-vue-next";
import {
  onBeforeUnmount,
  shallowRef,
} from "vue";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWritingStudioCodeBlockLanguages } from "~/composables/writing-studio/extensions/useCodeBlockLowlightExtension";

const props = defineProps<{
  editor: Editor | null | undefined;
  setCodeBlockLanguage: (language: string) => void;
  setCodeBlockWrap: (wrap: boolean) => void;
}>();

const { t } = useI18n();
const codeBlockLanguages = useWritingStudioCodeBlockLanguages();
const isLanguageMenuOpen = ref(false);
const isSettingsMenuOpen = ref(false);
const isCopied = ref(false);
const lastCodeBlockLanguage = ref("plaintext");
const lastCodeBlockWrap = ref(false);
const lastCodeBlockElement = shallowRef<HTMLElement | null>(null);

let copiedTimer: ReturnType<typeof setTimeout> | null = null;

type ActiveCodeBlockTarget = {
  dom: HTMLElement;
  language: string;
  wrap: boolean;
  text: string;
};

const resolveActiveCodeBlockTarget = (): ActiveCodeBlockTarget | null => {
  if (!props.editor) {
    return null;
  }

  const { state, view } = props.editor;
  const selection = state.selection as any;

  if (selection?.node?.type?.name === "codeBlock" && typeof selection.from === "number") {
    const dom = view.nodeDOM(selection.from) as HTMLElement | null;
    if (!dom) {
      return null;
    }

    return {
      dom,
      language: typeof selection.node.attrs?.language === "string" && selection.node.attrs.language.length > 0
        ? selection.node.attrs.language
        : "plaintext",
      wrap: selection.node.attrs?.wrap === true,
      text: selection.node.textContent ?? "",
    };
  }

  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "codeBlock") {
      continue;
    }

    const nodePos = $from.before(depth);
    const dom = view.nodeDOM(nodePos) as HTMLElement | null;
    if (!dom) {
      break;
    }

    return {
      dom,
      language: typeof node.attrs?.language === "string" && node.attrs.language.length > 0
        ? node.attrs.language
        : "plaintext",
      wrap: node.attrs?.wrap === true,
      text: node.textContent ?? "",
    };
  }

  return null;
};

const syncCodeBlockState = () => {
  const target = resolveActiveCodeBlockTarget();
  if (!target) {
    return null;
  }

  lastCodeBlockElement.value = target.dom;
  lastCodeBlockLanguage.value = target.language;
  lastCodeBlockWrap.value = target.wrap;
  return target;
};

const currentCodeBlockLanguage = computed(() => {
  const target = syncCodeBlockState();
  if (target) {
    return target.language;
  }

  return lastCodeBlockLanguage.value;
});

const currentCodeBlockWrap = computed(() => {
  const target = syncCodeBlockState();
  if (target) {
    return target.wrap;
  }

  return lastCodeBlockWrap.value;
});

const shouldShowCodeBlockMenu = ({ editor: currentEditor }: any) => {
  if (!currentEditor.isEditable) {
    return false;
  }

  if (isLanguageMenuOpen.value || isSettingsMenuOpen.value) {
    return true;
  }

  const isCodeBlockActive = currentEditor.isActive("codeBlock");
  if (isCodeBlockActive) {
    syncCodeBlockState();
  }

  return isCodeBlockActive;
};

const getCodeBlockVirtualElement = () => {
  const target = syncCodeBlockState();
  const element = target?.dom ?? lastCodeBlockElement.value;
  if (!element || !import.meta.client) {
    return null;
  }

  return {
    contextElement: element,
    getBoundingClientRect: () => {
      const rect = element.getBoundingClientRect();
      return new DOMRect(rect.right - 10, rect.top + 10, 0, 0);
    },
  };
};

const formatLanguageLabel = (language: string) => {
  if (language === "plaintext") {
    return "Plain Text";
  }

  return language.charAt(0).toUpperCase() + language.slice(1);
};

const selectCodeLanguage = (language: string) => {
  props.setCodeBlockLanguage(language);
  lastCodeBlockLanguage.value = language;
  isLanguageMenuOpen.value = false;
};

const copyCodeBlock = async () => {
  const target = resolveActiveCodeBlockTarget();
  if (!target || !import.meta.client) {
    return;
  }

  if (!target.text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(target.text);
    isCopied.value = true;

    if (copiedTimer) {
      clearTimeout(copiedTimer);
    }

    copiedTimer = setTimeout(() => {
      isCopied.value = false;
    }, 1200);
  } catch {
    isCopied.value = false;
  }
};

const toggleCodeWrap = () => {
  const nextWrap = !currentCodeBlockWrap.value;
  props.setCodeBlockWrap(nextWrap);
  lastCodeBlockWrap.value = nextWrap;
  isSettingsMenuOpen.value = false;
};

const preventCodeBlockMenuMouseDown = (event: MouseEvent) => {
  event.preventDefault();
};

onBeforeUnmount(() => {
  if (!copiedTimer) {
    return;
  }

  clearTimeout(copiedTimer);
});
</script>

<template>
  <BubbleMenu
    v-if="editor"
    plugin-key="writing-studio-code-block-menu"
    :editor="editor"
    :should-show="shouldShowCodeBlockMenu"
    :get-referenced-virtual-element="getCodeBlockVirtualElement"
    :options="{ placement: 'bottom-end', strategy: 'fixed', offset: 2 }"
  >
    <div class="ws-code-block-menu">
      <DropdownMenu v-model:open="isLanguageMenuOpen">
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="sm"
            class="ws-code-block-language-trigger h-8 gap-1 px-2 text-xs"
            @mousedown="preventCodeBlockMenuMouseDown"
          >
            <span class="max-w-[9rem] truncate">
              {{ formatLanguageLabel(currentCodeBlockLanguage) }}
            </span>
            <ChevronDown class="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-[260px] p-0">
          <Command>
            <CommandInput :placeholder="t('writingStudio.toolbar.code.searchLanguage')" />
            <CommandList class="max-h-72">
              <CommandEmpty>{{ t("writingStudio.toolbar.code.noLanguageResult") }}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  v-for="language in codeBlockLanguages"
                  :key="language"
                  :value="language"
                  @select="() => selectCodeLanguage(language)"
                >
                  <Check
                    class="h-4 w-4"
                    :class="language === currentCodeBlockLanguage ? 'opacity-100' : 'opacity-0'"
                  />
                  <span>{{ formatLanguageLabel(language) }}</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        class="ws-code-block-icon-button h-8 w-8"
        :title="isCopied ? t('writingStudio.toolbar.code.copied') : t('writingStudio.toolbar.code.copy')"
        :aria-label="isCopied ? t('writingStudio.toolbar.code.copied') : t('writingStudio.toolbar.code.copy')"
        @mousedown="preventCodeBlockMenuMouseDown"
        @click="copyCodeBlock"
      >
        <Check v-if="isCopied" class="h-4 w-4" />
        <Copy v-else class="h-4 w-4" />
      </Button>

      <DropdownMenu v-model:open="isSettingsMenuOpen">
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="ws-code-block-icon-button h-8 w-8"
            :title="t('writingStudio.toolbar.code.settings')"
            :aria-label="t('writingStudio.toolbar.code.settings')"
            @mousedown="preventCodeBlockMenuMouseDown"
          >
            <Ellipsis class="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-44">
          <DropdownMenuItem @select.prevent="toggleCodeWrap">
            <WrapText class="h-4 w-4" />
            {{ currentCodeBlockWrap
              ? t("writingStudio.toolbar.code.disableWrap")
              : t("writingStudio.toolbar.code.enableWrap") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </BubbleMenu>
</template>
