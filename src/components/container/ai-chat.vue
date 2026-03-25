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
            {{ item.role === 'assistant' ? assistantName : userName }}
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
import { useAiChatPanel } from '@/components/container/use-ai-chat-panel'

const {
  assistantName,
  attachmentAccept,
  attachments,
  canApplyReplace,
  canResetSession,
  canSubmit,
  closeButtonText,
  composerTipText,
  configTipText,
  currentScope,
  discardButtonText,
  discardPendingResult,
  fileInputRef,
  formatAttachmentMeta,
  handleAttachmentChange,
  handleClose,
  handlePromptKeydown,
  insertButtonText,
  inputPlaceholder,
  isReadonly,
  isSubmitting,
  isVisible,
  loadingMessage,
  messageListRef,
  messages,
  openFilePicker,
  panelSubtitle,
  panelTitle,
  pendingCountText,
  pendingPreviewItems,
  pendingTitleText,
  prompt,
  promptTextareaRef,
  removeAttachment,
  removeAttachmentText,
  replaceButtonText,
  requestProgress,
  resetButtonText,
  resetSession,
  scopeNotice,
  scopeOptions,
  sendButtonText,
  showConfigTip,
  showDecisionActions,
  startResize,
  statsText,
  submitPrompt,
  uploadButtonText,
  userName,
  applyDecision,
} = useAiChatPanel()
</script>

<style src="./ai-chat.less" lang="less"></style>
