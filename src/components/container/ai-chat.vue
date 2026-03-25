<template>
  <div v-if="isVisible" class="umo-ai-chat-overlay" @click.self="handleClose">
    <div class="umo-ai-chat-container" role="dialog" aria-modal="true">
      <div class="umo-ai-chat-header">
        <div>
          <div class="umo-ai-chat-title">{{ panelTitle }}</div>
          <div class="umo-ai-chat-subtitle">{{ panelSubtitle }}</div>
        </div>
        <button
          type="button"
          class="umo-ai-chat-close"
          :title="closeButtonText"
          :aria-label="closeButtonText"
          @click="handleClose"
        >
          <icon name="close" size="16" />
        </button>
      </div>
      <div ref="messageListRef" class="umo-ai-chat-messages umo-scrollbar">
        <div v-if="scopeNotice" class="umo-ai-chat-notice">
          {{ scopeNotice }}
        </div>
        <div
          v-for="item in messages"
          :key="item.id"
          class="umo-ai-chat-message"
          :class="[`is-${item.role}`, { 'is-error': item.status === 'error' }]"
        >
          <div class="umo-ai-chat-message-role">
            {{ item.role === "assistant" ? assistantName : userName }}
          </div>
          <div class="umo-ai-chat-message-body">{{ item.content }}</div>
          <div v-if="item.meta" class="umo-ai-chat-message-meta">
            {{ item.meta }}
          </div>
        </div>
        <div v-if="isSubmitting" class="umo-ai-chat-message is-assistant">
          <div class="umo-ai-chat-message-role">{{ assistantName }}</div>
          <div class="umo-ai-chat-message-body is-progress">
            <div class="umo-ai-chat-progress-head">
              <span>{{ loadingMessage }}</span>
              <span>{{ requestProgress }}%</span>
            </div>
            <div class="umo-ai-chat-progress-track">
              <span :style="{ width: `${requestProgress}%` }"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="umo-ai-chat-toolbar">
        <div class="umo-ai-chat-scope">
          <button
            v-for="item in scopeOptions"
            :key="item.value"
            type="button"
            class="umo-ai-chat-scope-button"
            :class="{
              active: currentScope === item.value,
              disabled: item.value === 'selection' && !hasSelection,
            }"
            :disabled="item.value === 'selection' && !hasSelection"
            @click="currentScope = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="umo-ai-chat-stats">{{ statsText }}</div>
      </div>
      <div v-if="showConfigTip" class="umo-ai-chat-tip">
        {{ configTipText }}
      </div>
      <div class="umo-ai-chat-input">
        <input
          ref="fileInputRef"
          class="umo-ai-chat-file-input"
          type="file"
          :accept="attachmentAccept"
          :multiple="allowMultipleAttachments"
          :disabled="isReadonly || isSubmitting"
          @change="handleAttachmentChange"
        />
        <div
          class="umo-ai-chat-composer"
          :class="{ 'has-pending': showDecisionActions }"
        >
          <div
            v-if="pendingPreviewItems.length > 0"
            class="umo-ai-chat-pending"
          >
            <div class="umo-ai-chat-pending-head">
              <span>{{ pendingTitleText }}</span>
              <span>{{ pendingCountText }}</span>
            </div>
            <div class="umo-ai-chat-pending-list umo-scrollbar">
              <div
                v-for="item in pendingPreviewItems"
                :key="item.key"
                class="umo-ai-chat-pending-item"
              >
                <div class="umo-ai-chat-pending-icon">
                  <icon :name="item.icon" size="15" />
                </div>
                <div class="umo-ai-chat-pending-main">
                  <div class="umo-ai-chat-pending-label">{{ item.label }}</div>
                  <div class="umo-ai-chat-pending-text">{{ item.text }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="attachments.length > 0" class="umo-ai-chat-attachments">
            <div
              v-for="item in attachments"
              :key="item.id"
              class="umo-ai-chat-attachment"
            >
              <div class="umo-ai-chat-attachment-main">
                <div class="umo-ai-chat-attachment-name" :title="item.name">
                  {{ item.name }}
                </div>
                <div class="umo-ai-chat-attachment-meta">
                  {{ formatAttachmentMeta(item) }}
                </div>
              </div>
              <button
                type="button"
                class="umo-ai-chat-attachment-remove"
                :disabled="isSubmitting"
                :title="removeAttachmentText"
                :aria-label="removeAttachmentText"
                @click="removeAttachment(item.id)"
              >
                <icon name="close" size="14" />
              </button>
            </div>
          </div>
          <t-textarea
            ref="promptTextareaRef"
            v-model="prompt"
            class="umo-ai-chat-textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            :maxlength="1000"
            :disabled="isReadonly || isSubmitting"
            :placeholder="inputPlaceholder"
            @keydown="handlePromptKeydown"
          />
          <div class="umo-ai-chat-composer-footer">
            <div class="umo-ai-chat-composer-tip">
              {{ composerTipText }}
            </div>
            <div class="umo-ai-chat-composer-actions">
              <button
                type="button"
                class="umo-ai-chat-icon-button"
                :disabled="isReadonly || isSubmitting"
                :title="uploadButtonText"
                :aria-label="uploadButtonText"
                @click="openFilePicker"
              >
                <icon name="file" size="16" />
              </button>
              <button
                type="button"
                class="umo-ai-chat-icon-button"
                :disabled="isSubmitting || !canResetSession"
                :title="resetButtonText"
                :aria-label="resetButtonText"
                @click="resetSession"
              >
                <icon name="reload" size="16" />
              </button>
              <button
                v-if="showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-decision"
                :disabled="isReadonly || isSubmitting"
                :title="insertButtonText"
                :aria-label="insertButtonText"
                @click="applyDecision('append')"
              >
                <icon name="block-add" size="16" />
              </button>
              <button
                v-if="showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-decision"
                :disabled="isReadonly || isSubmitting || !canApplyReplace"
                :title="replaceButtonText"
                :aria-label="replaceButtonText"
                @click="applyDecision('replace')"
              >
                <icon name="node-switch" size="16" />
              </button>
              <button
                v-if="showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-danger"
                :disabled="isReadonly || isSubmitting"
                :title="discardButtonText"
                :aria-label="discardButtonText"
                @click="discardPendingResult"
              >
                <icon name="close" size="16" />
              </button>
              <button
                type="button"
                class="umo-ai-chat-icon-button is-primary"
                :class="{ 'is-loading': isSubmitting }"
                :disabled="!canSubmit"
                :title="sendButtonText"
                :aria-label="sendButtonText"
                @click="submitPrompt"
              >
                <icon :name="isSubmitting ? 'loading' : 'reply'" size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="umo-ai-chat-resize-handle" @mousedown="startResize"></div>
    </div>
  </div>
</template>

<script setup>
import prettyBytes from "pretty-bytes";

import { useMessage } from "@/composables/dialog";
import {
  useAiAttachments,
  useAiEditorSnapshot,
  useAiProgress,
  useAiSession,
} from "@/composables/ai";
import { l } from "@/composables/i18n";
import {
  applyAiActions,
  canUseAiChat,
  getAiApplyMeta,
  getAiErrorMessage,
  normalizeAiResult,
  requestAiChat,
} from "@/utils/ai-actions";

const NODE_INSERT_TYPES = new Set([
  "insert_echarts",
  "insert_math",
  "insert_mermaid",
  "insert_diagrams",
  "insert_citation_with_footnote",
  "insert_footnote",
]);

const container = inject("container");
const editor = inject("editor");
const options = inject("options");
const page = inject("page");
const saveContent = inject("saveContent", null);
const aiChat = inject(
  "aiChat",
  ref({ visible: false, scope: "auto", focusToken: 0 }),
);
const closeAiChat = inject("closeAiChat", null);
const promptTextareaRef = ref(null);
const pendingResult = ref(null);

const {
  aiOptions,
  locale,
  assistantName,
  userName,
  isReadonly,
  inputPlaceholder,
  prompt,
  messages,
  isSubmitting,
  messageListRef,
  createMessageId,
  resetMessages,
  pushMessage,
} = useAiSession({
  options,
  editor,
});
const {
  documentCharacters,
  selectionText,
  selectionCharacters,
  hasSelection,
  syncEditorSnapshot,
  getDocumentSnapshot,
  getSelectionSnapshot,
} = useAiEditorSnapshot({
  editor,
});
const {
  attachments,
  fileInputRef,
  accept: attachmentAccept,
  multiple: allowMultipleAttachments,
  handleFileChange: handleAttachmentChange,
  openFilePicker,
  removeAttachment,
  clearAttachments,
} = useAiAttachments({
  aiOptions,
});
const {
  progress: requestProgress,
  start: startRequestProgress,
  pulse: pulseRequestProgress,
  finish: finishRequestProgress,
  fail: failRequestProgress,
  reset: resetRequestProgress,
} = useAiProgress();

const isZhLocale = computed(() => locale.value === "zh-CN");
const isVisible = computed(() => !!aiChat.value?.visible);
const showConfigTip = computed(() => aiOptions.value.showConfigTip !== false);
const showDecisionActions = computed(() => {
  return !!pendingResult.value?.actions?.length;
});
const canSubmit = computed(() => {
  return (
    !!prompt.value.trim() &&
    !!editor.value &&
    !isReadonly.value &&
    !isSubmitting.value &&
    aiOptions.value.enabled !== false &&
    canUseAiChat(aiOptions.value)
  );
});
const canResetSession = computed(() => {
  return (
    messages.value.length > 1 ||
    !!prompt.value.trim() ||
    attachments.value.length > 0 ||
    !!pendingResult.value
  );
});
const canApplyReplace = computed(() => {
  const pending = pendingResult.value;
  if (!pending?.actions?.length) {
    return false;
  }
  const activeSelection =
    pending.selectionAnchor || pending.selectionRange || null;
  if (pending.scope === "document") {
    return pending.actions.some((action) => action?.type === "patch");
  }
  return !activeSelection?.empty;
});

const panelTitle = computed(() => {
  return (
    l(aiOptions.value.title) || (isZhLocale.value ? "AI 助手" : "AI Assistant")
  );
});
const panelSubtitle = computed(() => {
  if (showDecisionActions.value) {
    return isZhLocale.value
      ? "建议已生成，确认后再写入文档。"
      : "Suggestions are ready. Confirm before writing to the document.";
  }
  if (isReadonly.value) {
    return isZhLocale.value
      ? "当前为只读模式，仅可查看对话。"
      : "Read-only mode is enabled, so the chat is view-only.";
  }
  if (hasSelection.value) {
    return isZhLocale.value
      ? "可以基于当前选区或全文修改文档"
      : "Revise the current selection or the full document";
  }
  return isZhLocale.value
    ? "当前未选中文本，默认会修改全文"
    : "No text selected, so revisions default to the full document";
});
const loadingMessage = computed(() =>
  isZhLocale.value
    ? aiOptions.value.outputMode === "stream"
      ? "AI 正在流式生成修改建议..."
      : "AI 正在生成修改建议..."
    : aiOptions.value.outputMode === "stream"
      ? "AI is streaming draft changes..."
      : "AI is drafting changes...",
);
const sendButtonText = computed(() =>
  isZhLocale.value ? "发送对话" : "Send prompt",
);
const resetButtonText = computed(() =>
  isZhLocale.value ? "清空对话" : "Clear chat",
);
const uploadButtonText = computed(() =>
  isZhLocale.value ? "上传文件" : "Upload files",
);
const insertButtonText = computed(() =>
  isZhLocale.value ? "插入建议" : "Insert suggestion",
);
const replaceButtonText = computed(() =>
  isZhLocale.value ? "替换内容" : "Replace content",
);
const discardButtonText = computed(() =>
  isZhLocale.value ? "丢弃建议" : "Discard suggestion",
);
const closeButtonText = computed(() =>
  isZhLocale.value ? "关闭 AI 面板" : "Close AI panel",
);
const removeAttachmentText = computed(() =>
  isZhLocale.value ? "移除附件" : "Remove attachment",
);
const pendingTitleText = computed(() =>
  isZhLocale.value ? "待确认建议" : "Pending suggestion",
);
const pendingCountText = computed(() => {
  const count = pendingPreviewItems.value.length;
  return isZhLocale.value ? `${count} 项` : `${count} items`;
});
const configTipText = computed(() => {
  return isZhLocale.value
    ? "默认会请求 ai.apiUrl 对应的 AI 服务生成结构化建议；生成后由你手动决定插入、替换或丢弃，也可以通过 ai.onChat 完全自定义流程。"
    : "The editor will request the AI service at ai.apiUrl to generate structured suggestions. After the response, you decide whether to insert, replace, or discard, and you can still fully customize the flow with ai.onChat.";
});
const composerTipText = computed(() => {
  if (showDecisionActions.value) {
    return canApplyReplace.value
      ? isZhLocale.value
        ? "建议已准备好，选择插入、替换或丢弃。"
        : "The suggestion is ready. Choose insert, replace, or discard."
      : isZhLocale.value
        ? "当前建议更适合插入，无法直接执行替换。"
        : "This suggestion is better suited for insertion and cannot directly replace the document.";
  }
  return isZhLocale.value
    ? "Enter 发送，Shift + Enter 换行。"
    : "Press Enter to send, Shift + Enter for a new line.";
});
const scopeOptions = computed(() => {
  return [
    { label: isZhLocale.value ? "自动" : "Auto", value: "auto" },
    { label: isZhLocale.value ? "选区" : "Selection", value: "selection" },
    { label: isZhLocale.value ? "全文" : "Document", value: "document" },
  ];
});
const scopeNotice = computed(() => {
  if (hasSelection.value) {
    const label =
      currentScope === "document"
        ? isZhLocale.value
          ? "全文上下文"
          : "Document context"
        : isZhLocale.value
          ? "当前选区"
          : "Current selection";
    return `${label}: ${truncateText(selectionText.value)}`;
  }
  return isZhLocale.value
    ? "当前没有选区，AI 将默认基于全文进行修改。"
    : "There is no active selection, so AI will revise the full document by default.";
});
const statsText = computed(() => {
  const totalChars = documentCharacters.value;
  const selectionChars = selectionCharacters.value;
  if (isZhLocale.value) {
    return `选区 ${selectionChars} 字 / 全文 ${totalChars} 字`;
  }
  return `Selection ${selectionChars} chars / Document ${totalChars} chars`;
});

const htmlToText = (value = "") => {
  if (!value || typeof value !== "string") {
    return "";
  }
  if (typeof DOMParser === "undefined") {
    return value;
  }
  try {
    const doc = new DOMParser().parseFromString(value, "text/html");
    return doc.body?.textContent?.trim() || "";
  } catch {
    return value;
  }
};

const toPreviewText = (value = "", limit = 220) => {
  const normalized = `${value}`.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit)}...`;
};

const getPatchPreview = (action) => {
  const content =
    action?.content ?? action?.html ?? action?.text ?? action?.json ?? "";
  const format =
    action?.format ||
    (typeof content === "string" && content.trim().startsWith("<")
      ? "html"
      : "text");

  if (format === "json") {
    return toPreviewText(JSON.stringify(content));
  }
  if (format === "html") {
    return toPreviewText(htmlToText(`${content}`));
  }
  return toPreviewText(`${content}`);
};

const getActionMeta = (action) => {
  if (action?.type === "insert_echarts") {
    return {
      icon: "echarts",
      label: isZhLocale.value ? "图表" : "Chart",
    };
  }
  if (action?.type === "patch") {
    return {
      icon: "ai",
      label: isZhLocale.value ? "改写" : "Rewrite",
    };
  }
  if (action?.type === "insert_math") {
    return {
      icon: "math",
      label: isZhLocale.value ? "公式" : "Math",
    };
  }
  if (action?.type === "insert_mermaid") {
    return {
      icon: "mermaid",
      label: isZhLocale.value ? "Mermaid" : "Mermaid",
    };
  }
  if (action?.type === "insert_diagrams") {
    return {
      icon: "diagrams",
      label: isZhLocale.value ? "流程图" : "Flowchart",
    };
  }
  if (action?.type === "insert_footnote") {
    return {
      icon: "footnote",
      label: isZhLocale.value ? "脚注" : "Footnote",
    };
  }
  if (action?.type === "insert_citation_with_footnote") {
    return {
      icon: "footnote",
      label: isZhLocale.value ? "引用与脚注" : "Citation + Footnote",
    };
  }
  return {
    icon: "file",
    label: isZhLocale.value ? "建议" : "Suggestion",
  };
};

const getActionPreviewText = (action) => {
  if (!action || typeof action !== "object") {
    return "";
  }
  if (action.type === "patch") {
    return getPatchPreview(action);
  }
  if (action.type === "insert_math") {
    const { math } = action;
    const latex =
      typeof math === "string"
        ? math
        : math?.latex || math?.content || math?.formula || "";
    return toPreviewText(latex, 180);
  }
  if (action.type === "insert_mermaid") {
    const mermaid =
      typeof action.mermaid === "string"
        ? action.mermaid
        : action.mermaid?.content || action.mermaid?.code || "";
    return toPreviewText(mermaid, 180);
  }
  if (action.type === "insert_diagrams") {
    return isZhLocale.value
      ? "已准备好流程图节点。"
      : "The flowchart node is ready.";
  }
  if (action.type === "insert_echarts") {
    const chart = action.chart || {};
    const title =
      chart?.name ||
      chart?.title?.text ||
      (Array.isArray(chart?.title) ? chart.title[0]?.text : chart?.title) ||
      chart?.describe ||
      chart?.description ||
      "";
    return isZhLocale.value
      ? title || "已生成图表节点。"
      : title || "The chart node is ready.";
  }
  if (action.type === "insert_footnote") {
    const footnote = action.footnote || {};
    const rawContent =
      typeof footnote === "string"
        ? footnote
        : footnote.caption ||
          footnote.text ||
          footnote.content ||
          footnote.note ||
          "";
    return toPreviewText(
      typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent),
      180,
    );
  }
  if (action.type === "insert_citation_with_footnote") {
    const citation = action.citation || {};
    const citationRaw =
      typeof citation === "string"
        ? citation
        : citation.content ||
          citation.text ||
          citation.html ||
          citation.quote ||
          "";
    const footnote = action.footnote || {};
    const footnoteRaw =
      typeof footnote === "string"
        ? footnote
        : footnote.caption ||
          footnote.text ||
          footnote.content ||
          footnote.note ||
          "";
    const citationText =
      typeof citationRaw === "string"
        ? citationRaw
        : JSON.stringify(citationRaw ?? {});
    const footnoteText =
      typeof footnoteRaw === "string"
        ? footnoteRaw
        : JSON.stringify(footnoteRaw ?? {});
    return isZhLocale.value
      ? `正文：${toPreviewText(citationText, 100)}\n脚注：${toPreviewText(footnoteText, 100)}`
      : `Citation: ${toPreviewText(citationText, 100)}\nFootnote: ${toPreviewText(footnoteText, 100)}`;
  }
  return toPreviewText(JSON.stringify(action ?? {}));
};

const pendingPreviewItems = computed(() => {
  return (pendingResult.value?.actions || [])
    .map((action, index) => {
      if (!action || typeof action !== "object") {
        return null;
      }
      const meta = getActionMeta(action);
      const text = getActionPreviewText(action);
      if (!text) {
        return null;
      }
      return {
        key: `${action?.type || "action"}-${index}`,
        icon: meta.icon,
        label: meta.label,
        text,
      };
    })
    .filter(Boolean);
});

let currentScope = $ref("auto");

const truncateText = (value = "", maxLength = 120) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
};

const formatAttachmentMeta = (item) => {
  const parts = [];
  if (item.type) {
    parts.push(item.type);
  }
  if (Number.isFinite(item.size) && item.size > 0) {
    parts.push(prettyBytes(item.size));
  }
  if (!parts.length) {
    return isZhLocale.value ? "待上传附件" : "Pending attachment";
  }
  return parts.join(" / ");
};

const normalizeScope = (scope) => {
  if (["auto", "selection", "document"].includes(scope)) {
    return scope;
  }
  return "auto";
};

const resolveScope = (scope = currentScope) => {
  const normalized = normalizeScope(scope);
  if (normalized === "auto") {
    return hasSelection.value ? "selection" : "document";
  }
  if (normalized === "selection" && !hasSelection.value) {
    return "document";
  }
  return normalized;
};

const buildPayload = (
  userPrompt,
  scope,
  selectionSnapshot,
  documentSnapshot,
) => {
  return {
    prompt: userPrompt,
    scope,
    messages: messages.value.map(({ role, content }) => ({ role, content })),
    document: documentSnapshot,
    selection: {
      text: selectionSnapshot.text,
      from: selectionSnapshot.from,
      to: selectionSnapshot.to,
      empty: selectionSnapshot.empty,
    },
    attachments: attachments.value,
    page: page.value,
    editor: {
      isEmpty: editor.value?.isEmpty,
      isEditable: editor.value?.isEditable,
    },
    container,
  };
};

const focusPromptInput = async () => {
  await nextTick();
  const textarea =
    promptTextareaRef.value?.$el?.querySelector?.("textarea") ||
    document.querySelector(`${container} .umo-ai-chat-container textarea`);
  textarea?.focus?.();
};

const clearPendingResult = () => {
  pendingResult.value = null;
};

const resetSession = () => {
  prompt.value = "";
  resetMessages();
  clearAttachments();
  clearPendingResult();
  resetRequestProgress();
};

const buildPendingMeta = (actionCount = 0) => {
  if (!actionCount) {
    return "";
  }
  return isZhLocale.value
    ? `已生成 ${actionCount} 项建议，等待你确认。`
    : `${actionCount} suggestions are ready for confirmation.`;
};

const getDecisionActions = (decision) => {
  const pending = pendingResult.value;
  if (!pending?.actions?.length) {
    return [];
  }

  const target = pending.scope === "selection" ? "selection" : "document";
  const activeSelection = pending.selectionAnchor || pending.selectionRange;
  const canReplaceSelection = target === "selection" && !activeSelection?.empty;

  return pending.actions.map((action, index) => {
    if (!action || typeof action !== "object") {
      return action;
    }

    if (action.type === "patch") {
      return {
        ...action,
        target,
        mode:
          decision === "replace"
            ? index === 0
              ? "replace"
              : "append"
            : "append",
      };
    }

    if (NODE_INSERT_TYPES.has(action.type)) {
      return {
        ...action,
        target,
        position:
          decision === "replace" && canReplaceSelection
            ? index === 0
              ? "replace"
              : "after"
            : "after",
      };
    }

    return action;
  });
};

const resolveSelectionContext = () => {
  const selectionSnapshot = getSelectionSnapshot();
  const selectionAnchor = aiChat.value?.selectionAnchor
    ? { ...aiChat.value.selectionAnchor }
    : null;

  if (!selectionAnchor) {
    return {
      selectionSnapshot,
      selectionAnchor: null,
    };
  }

  return {
    selectionSnapshot: {
      ...selectionSnapshot,
      from: selectionAnchor.from,
      to: selectionAnchor.to,
      empty: selectionAnchor.empty ?? selectionSnapshot.empty,
      isNodeSelection:
        selectionAnchor.isNodeSelection ?? selectionSnapshot.isNodeSelection,
    },
    selectionAnchor,
  };
};

const submitPrompt = async () => {
  const editorInstance = editor.value;
  if (!editorInstance || !canSubmit.value) {
    return;
  }

  const userPrompt = prompt.value.trim();
  const scope = resolveScope();
  const { selectionSnapshot, selectionAnchor } = resolveSelectionContext();
  const documentSnapshot = getDocumentSnapshot();
  const requestPayload = buildPayload(
    userPrompt,
    scope,
    selectionSnapshot,
    documentSnapshot,
  );

  await pushMessage({
    id: createMessageId(),
    role: "user",
    content: userPrompt,
  });
  prompt.value = "";
  clearPendingResult();
  isSubmitting.value = true;
  startRequestProgress();

  try {
    const response = await requestAiChat(
      requestPayload,
      {
        ...aiOptions.value,
        locale: options.value.locale,
      },
      {
        onText: async () => {
          pulseRequestProgress();
        },
        onObject: async () => {
          pulseRequestProgress();
        },
      },
    );
    const normalized = normalizeAiResult(response, scope, {
      locale: options.value.locale,
      autoApply: false,
      autoSave: false,
    });

    pendingResult.value =
      normalized.actions?.length > 0
        ? {
            ...normalized,
            scope,
            selectionRange: { ...selectionSnapshot },
            selectionAnchor,
          }
        : null;

    await finishRequestProgress();
    await pushMessage({
      id: createMessageId(),
      role: "assistant",
      content: normalized.message,
      meta: buildPendingMeta(normalized.actions?.length || 0),
    });
  } catch (error) {
    const errorMessage = getAiErrorMessage(error, {
      locale: options.value.locale,
    });

    await failRequestProgress();
    await pushMessage({
      id: createMessageId(),
      role: "assistant",
      status: "error",
      content: errorMessage,
    });
  } finally {
    isSubmitting.value = false;
    resetRequestProgress();
  }
};

const discardPendingResult = async () => {
  if (!pendingResult.value) {
    return;
  }
  clearPendingResult();
  await focusPromptInput();
};

const applyDecision = async (decision) => {
  if (!editor.value || !showDecisionActions.value) {
    return;
  }

  try {
    const result = await applyAiActions(
      getDecisionActions(decision),
      pendingResult.value?.scope || "document",
      {
        editor: editor.value,
        options: options.value,
        selectionRange: pendingResult.value?.selectionRange,
        selectionAnchor: pendingResult.value?.selectionAnchor,
      },
    );
    const changed = result.some((item) => item?.changed);
    if (!changed) {
      useMessage("error", {
        attach: container,
        content: isZhLocale.value
          ? "当前建议没有产生可应用的变更。"
          : "The current suggestion did not produce applicable changes.",
      });
      return;
    }

    if (aiOptions.value.autoSave === true && saveContent) {
      await saveContent(false);
    }

    clearPendingResult();
    syncEditorSnapshot();
    await focusPromptInput();
    useMessage("success", {
      attach: container,
      content:
        getAiApplyMeta(result, {
          locale: options.value.locale,
        }) ||
        (isZhLocale.value
          ? "已应用 AI 建议。"
          : "The AI suggestion was applied."),
    });
  } catch (error) {
    const errorMessage = getAiErrorMessage(error, {
      locale: options.value.locale,
    });
    useMessage("error", {
      attach: container,
      content: errorMessage,
    });
  }
};

const handlePromptKeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitPrompt();
  }
};

watch(
  () => aiOptions.value.defaultScope,
  (scope) => {
    currentScope = normalizeScope(scope);
  },
  { immediate: true },
);

watch(
  () => aiChat.value,
  async (state) => {
    if (!state?.visible) {
      return;
    }
    currentScope = normalizeScope(state.scope);
    await focusPromptInput();
  },
  { deep: true },
);

const handleClose = () => {
  stopResize();
  closeAiChat?.();
};

const handleWindowKeydown = (event) => {
  if (event.key === "Escape" && isVisible.value) {
    handleClose();
  }
};

onMounted(() => {
  resetSession();
  window.addEventListener("keydown", handleWindowKeydown);
});
onUnmounted(() => {
  stopResize();
  window.removeEventListener("keydown", handleWindowKeydown);
});

const basePanelWidth = 320;
const isResizing = ref(false);
const startX = ref(0);
const initialWidth = ref(basePanelWidth);
const getPageContainer = () => {
  return document.querySelector(`${container} .umo-main-container`);
};
const startResize = (event) => {
  const umoPageContainer = getPageContainer();
  if (!umoPageContainer) {
    return;
  }
  isResizing.value = true;
  startX.value = event.clientX;
  const panel = umoPageContainer.querySelector(".umo-ai-chat-container");
  if (!panel) {
    return;
  }
  initialWidth.value = parseInt(getComputedStyle(panel).width, 10);
  umoPageContainer.addEventListener("mousemove", resize);
  umoPageContainer.addEventListener("mouseup", stopResize);
};

const resize = (event) => {
  if (!isResizing.value) {
    return;
  }
  const umoPageContainer = getPageContainer();
  if (!umoPageContainer) {
    return;
  }
  const offsetX = event.clientX - startX.value;
  const newWidth = initialWidth.value - offsetX;
  const minWidth = basePanelWidth / 1.5;
  const maxWidth = basePanelWidth * 2;
  if (newWidth >= minWidth && newWidth <= maxWidth) {
    const panel = umoPageContainer.querySelector(".umo-ai-chat-container");
    if (panel) {
      panel.style.width = `${newWidth}px`;
    }
  }
};

const stopResize = () => {
  isResizing.value = false;
  const umoPageContainer = getPageContainer();
  umoPageContainer?.removeEventListener("mousemove", resize);
  umoPageContainer?.removeEventListener("mouseup", stopResize);
};
</script>

<style lang="less">
@keyframes umo-ai-chat-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.umo-ai-chat-overlay {
  position: absolute;
  inset: 0;
  z-index: 201;
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  box-sizing: border-box;
  background-color: rgba(15, 23, 42, 0.08);
}

.umo-ai-chat-container {
  width: 320px;
  min-width: 213px;
  max-width: min(480px, 100%);
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--umo-color-white);
  border-radius: 16px;
  border: solid 1px var(--umo-border-color);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.16);
  overflow: hidden;

  .umo-ai-chat-header {
    padding: 14px 16px 10px;
    border-bottom: solid 1px var(--umo-border-color-light);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .umo-ai-chat-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--umo-text-color);
  }

  .umo-ai-chat-subtitle {
    font-size: 12px;
    line-height: 1.5;
    margin-top: 4px;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-close {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 999px;
    padding: 0;
    background-color: transparent;
    color: var(--umo-text-color-light);
    cursor: pointer;

    &:hover {
      color: var(--umo-text-color);
      background-color: rgba(0, 0, 0, 0.05);
    }
  }

  .umo-ai-chat-messages {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .umo-ai-chat-notice {
    font-size: 12px;
    line-height: 1.6;
    color: var(--umo-text-color-light);
    padding: 10px 12px;
    border-radius: var(--umo-radius);
    background-color: rgba(0, 0, 0, 0.03);
  }

  .umo-ai-chat-message {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &.is-user {
      align-items: flex-end;
    }

    &.is-error .umo-ai-chat-message-body {
      border-color: rgba(214, 48, 49, 0.18);
      background-color: rgba(214, 48, 49, 0.06);
      color: var(--umo-error-color);
    }
  }

  .umo-ai-chat-message-role {
    font-size: 12px;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-message-body {
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    border-radius: 12px;
    border: solid 1px rgba(0, 0, 0, 0.05);
    background-color: rgba(0, 0, 0, 0.025);
    line-height: 1.7;
    font-size: 13px;
    color: var(--umo-text-color);
    white-space: pre-wrap;
    word-break: break-word;

    &.is-progress {
      display: flex;
      flex-direction: column;
      gap: 10px;
      white-space: normal;
    }
  }

  .umo-ai-chat-progress-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-progress-track {
    height: 6px;
    border-radius: 999px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.08);

    span {
      display: block;
      height: 100%;
      border-radius: inherit;
      transition: width 0.2s ease;
      background: linear-gradient(
        90deg,
        var(--umo-primary-color),
        rgba(56, 189, 248, 0.9)
      );
    }
  }

  .is-user .umo-ai-chat-message-body {
    background-color: var(--umo-button-hover-background);
    border-color: rgba(0, 0, 0, 0.06);
  }

  .umo-ai-chat-message-meta {
    font-size: 12px;
    color: var(--umo-primary-color);
  }

  .umo-ai-chat-toolbar {
    padding: 0 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .umo-ai-chat-scope {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .umo-ai-chat-scope-button {
    border: solid 1px var(--umo-border-color);
    background-color: var(--umo-color-white);
    border-radius: var(--umo-radius);
    padding: 8px 10px;
    font-size: 12px;
    color: var(--umo-text-color);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease;

    &.active {
      color: var(--umo-primary-color);
      border-color: rgba(0, 0, 0, 0.08);
      background-color: var(--umo-button-hover-background);
    }

    &.disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }

  .umo-ai-chat-stats {
    font-size: 12px;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-tip {
    margin: 0 16px 12px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-input {
    padding: 0 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .umo-ai-chat-file-input {
      display: none;
    }
  }

  .umo-ai-chat-composer {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border-radius: 16px;
    border: solid 1px rgba(15, 23, 42, 0.08);
    background:
      linear-gradient(180deg, rgba(37, 99, 235, 0.02), rgba(37, 99, 235, 0.008))
        padding-box,
      rgba(255, 255, 255, 0.96);

    &.has-pending {
      border-color: rgba(37, 99, 235, 0.18);
      box-shadow: 0 10px 28px rgba(37, 99, 235, 0.08);
    }
  }

  .umo-ai-chat-pending {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-bottom: 2px;
  }

  .umo-ai-chat-pending-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-pending-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 180px;
    overflow: auto;
  }

  .umo-ai-chat-pending-item {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background-color: rgba(0, 0, 0, 0.028);
    border: solid 1px rgba(0, 0, 0, 0.04);
  }

  .umo-ai-chat-pending-icon {
    width: 28px;
    height: 28px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background-color: rgba(37, 99, 235, 0.08);
    color: var(--umo-primary-color);
  }

  .umo-ai-chat-pending-main {
    min-width: 0;
    flex: 1;
  }

  .umo-ai-chat-pending-label {
    font-size: 12px;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-pending-text {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--umo-text-color);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .umo-ai-chat-attachments {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 180px;
    overflow: auto;
  }

  .umo-ai-chat-attachment {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 12px;
    background-color: rgba(0, 0, 0, 0.03);
    border: solid 1px rgba(0, 0, 0, 0.04);
  }

  .umo-ai-chat-attachment-main {
    flex: 1;
    min-width: 0;
  }

  .umo-ai-chat-attachment-name {
    font-size: 13px;
    line-height: 1.4;
    color: var(--umo-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .umo-ai-chat-attachment-meta {
    margin-top: 4px;
    font-size: 12px;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-attachment-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 999px;
    padding: 0;
    background-color: transparent;
    color: var(--umo-text-color-light);
    cursor: pointer;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
      color: var(--umo-text-color);
    }
  }

  .umo-ai-chat-textarea {
    :deep(.t-textarea),
    :deep(.umo-textarea) {
      border: none;
      background: transparent;
      box-shadow: none;
      border-radius: 0;
    }

    :deep(.t-textarea__inner),
    :deep(.umo-textarea__inner),
    :deep(textarea) {
      min-height: 108px;
      border: none;
      box-shadow: none;
      padding: 0;
      background: transparent;
      font-size: 13px;
      line-height: 1.7;
      resize: none;
      color: var(--umo-text-color);
    }
  }

  .umo-ai-chat-composer-footer {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    flex-direction: column;
  }

  .umo-ai-chat-composer-tip {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--umo-text-color-light);
  }

  .umo-ai-chat-composer-actions {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  .umo-ai-chat-icon-button {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    border: solid 1px rgba(15, 23, 42, 0.08);
    background-color: rgba(255, 255, 255, 0.9);
    color: var(--umo-text-color);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: rgba(37, 99, 235, 0.16);
      color: var(--umo-primary-color);
      background-color: rgba(37, 99, 235, 0.05);
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      transform: none;
    }

    &.is-primary {
      background-color: var(--umo-primary-color);
      border-color: var(--umo-primary-color);
      color: var(--umo-color-white);

      &:hover:not(:disabled) {
        color: var(--umo-color-white);
        background-color: var(--umo-primary-color);
        border-color: var(--umo-primary-color);
      }
    }

    &.is-danger:hover:not(:disabled) {
      color: var(--umo-error-color);
      border-color: rgba(214, 48, 49, 0.18);
      background-color: rgba(214, 48, 49, 0.06);
    }

    &.is-loading .umo-icon {
      animation: umo-ai-chat-spin 1s linear infinite;
    }
  }

  .umo-ai-chat-resize-handle {
    position: absolute;
    top: 0;
    left: -2px;
    width: 3px;
    height: 100%;
    opacity: 0.5;
    background-color: transparent;

    &:hover {
      background-color: var(--umo-primary-color);
      cursor: col-resize;
    }
  }
}

.umo-editor-container.umo-skin-default {
  .umo-ai-chat-container {
    border: solid 1px var(--umo-border-color);
  }
}

[theme-mode="dark"] {
  .umo-ai-chat-overlay {
    background-color: rgba(2, 6, 23, 0.24);
  }

  .umo-ai-chat-container {
    .umo-ai-chat-notice,
    .umo-ai-chat-message-body,
    .umo-ai-chat-attachment,
    .umo-ai-chat-pending-item {
      background-color: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.06);
    }

    .umo-ai-chat-composer {
      background: rgba(15, 23, 42, 0.72);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .umo-ai-chat-pending-icon,
    .umo-ai-chat-icon-button {
      background-color: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
  }
}

@media screen and (max-width: 900px) {
  .umo-ai-chat-overlay {
    padding: 12px;
  }

  .umo-ai-chat-container {
    width: 100%;
    min-width: 0;

    .umo-ai-chat-composer-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .umo-ai-chat-composer-actions {
      width: 100%;
      justify-content: space-between;
    }
  }
}
</style>
