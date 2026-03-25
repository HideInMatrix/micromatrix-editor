<template>
  <div
    v-if="panel.isVisible"
    class="umo-ai-chat-overlay"
    @click.self="panel.handleClose"
  >
    <div class="umo-ai-chat-container" role="dialog" aria-modal="true">
      <div class="umo-ai-chat-header">
        <div>
          <div class="umo-ai-chat-title">{{ panel.panelTitle }}</div>
          <div class="umo-ai-chat-subtitle">{{ panel.panelSubtitle }}</div>
        </div>
        <button
          type="button"
          class="umo-ai-chat-close"
          :title="panel.closeButtonText"
          :aria-label="panel.closeButtonText"
          @click="panel.handleClose"
        >
          <icon name="close" size="16" />
        </button>
      </div>
      <div :ref="messageListRef" class="umo-ai-chat-messages umo-scrollbar">
        <div v-if="panel.scopeNotice" class="umo-ai-chat-notice">
          {{ panel.scopeNotice }}
        </div>
        <div
          v-for="item in panel.messages"
          :key="item.id"
          class="umo-ai-chat-message"
          :class="[`is-${item.role}`, { 'is-error': item.status === 'error' }]"
        >
          <div class="umo-ai-chat-message-role">
            {{
              item.role === 'assistant' ? panel.assistantName : panel.userName
            }}
          </div>
          <div class="umo-ai-chat-message-body">{{ item.content }}</div>
          <div v-if="item.meta" class="umo-ai-chat-message-meta">
            {{ item.meta }}
          </div>
        </div>
        <div v-if="panel.isSubmitting" class="umo-ai-chat-message is-assistant">
          <div class="umo-ai-chat-message-role">{{ panel.assistantName }}</div>
          <div class="umo-ai-chat-message-body is-progress">
            <div class="umo-ai-chat-progress-head">
              <span>{{ panel.loadingMessage }}</span>
              <span>{{ panel.requestProgress }}%</span>
            </div>
            <div class="umo-ai-chat-progress-track">
              <span :style="{ width: `${panel.requestProgress}%` }"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="umo-ai-chat-toolbar">
        <div class="umo-ai-chat-scope">
          <button
            v-for="item in panel.scopeOptions"
            :key="item.value"
            type="button"
            class="umo-ai-chat-scope-button"
            :class="{
              active: panel.currentScope === item.value,
              disabled: item.value === 'selection' && !panel.hasSelection,
            }"
            :disabled="item.value === 'selection' && !panel.hasSelection"
            @click="panel.currentScope = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="umo-ai-chat-stats">{{ panel.statsText }}</div>
      </div>
      <div v-if="panel.showConfigTip" class="umo-ai-chat-tip">
        {{ panel.configTipText }}
      </div>
      <div class="umo-ai-chat-input">
        <input
          :ref="fileInputRef"
          class="umo-ai-chat-file-input"
          type="file"
          :accept="panel.attachmentAccept"
          :multiple="panel.allowMultipleAttachments"
          :disabled="panel.isReadonly || panel.isSubmitting"
          @change="panel.handleAttachmentChange"
        />
        <div
          class="umo-ai-chat-composer"
          :class="{ 'has-pending': panel.showDecisionActions }"
        >
          <div
            v-if="panel.pendingPreviewItems.length > 0"
            class="umo-ai-chat-pending"
          >
            <div class="umo-ai-chat-pending-head">
              <span>{{ panel.pendingTitleText }}</span>
              <span>{{ panel.pendingCountText }}</span>
            </div>
            <div class="umo-ai-chat-pending-list umo-scrollbar">
              <div
                v-for="item in panel.pendingPreviewItems"
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
          <div
            v-if="panel.attachments.length > 0"
            class="umo-ai-chat-attachments"
          >
            <div
              v-for="item in panel.attachments"
              :key="item.id"
              class="umo-ai-chat-attachment"
            >
              <div class="umo-ai-chat-attachment-main">
                <div class="umo-ai-chat-attachment-name" :title="item.name">
                  {{ item.name }}
                </div>
                <div class="umo-ai-chat-attachment-meta">
                  {{ panel.formatAttachmentMeta(item) }}
                </div>
              </div>
              <button
                type="button"
                class="umo-ai-chat-attachment-remove"
                :disabled="panel.isSubmitting"
                :title="panel.removeAttachmentText"
                :aria-label="panel.removeAttachmentText"
                @click="panel.removeAttachment(item.id)"
              >
                <icon name="close" size="14" />
              </button>
            </div>
          </div>
          <t-textarea
            :ref="promptTextareaRef"
            v-model="panel.prompt"
            class="umo-ai-chat-textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            :maxlength="1000"
            :disabled="panel.isReadonly || panel.isSubmitting"
            :placeholder="panel.inputPlaceholder"
            @keydown="panel.handlePromptKeydown"
          />
          <div class="umo-ai-chat-composer-footer">
            <div class="umo-ai-chat-composer-tip">
              {{ panel.composerTipText }}
            </div>
            <div class="umo-ai-chat-composer-actions">
              <button
                type="button"
                class="umo-ai-chat-icon-button"
                :disabled="panel.isReadonly || panel.isSubmitting"
                :title="panel.uploadButtonText"
                :aria-label="panel.uploadButtonText"
                @click="panel.openFilePicker"
              >
                <icon name="file" size="16" />
              </button>
              <button
                type="button"
                class="umo-ai-chat-icon-button"
                :disabled="panel.isSubmitting || !panel.canResetSession"
                :title="panel.resetButtonText"
                :aria-label="panel.resetButtonText"
                @click="panel.resetSession"
              >
                <icon name="reload" size="16" />
              </button>
              <button
                v-if="panel.showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-decision"
                :disabled="panel.isReadonly || panel.isSubmitting"
                :title="panel.insertButtonText"
                :aria-label="panel.insertButtonText"
                @click="panel.applyDecision('append')"
              >
                <icon name="block-add" size="16" />
              </button>
              <button
                v-if="panel.showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-decision"
                :disabled="
                  panel.isReadonly ||
                  panel.isSubmitting ||
                  !panel.canApplyReplace
                "
                :title="panel.replaceButtonText"
                :aria-label="panel.replaceButtonText"
                @click="panel.applyDecision('replace')"
              >
                <icon name="node-switch" size="16" />
              </button>
              <button
                v-if="panel.showDecisionActions"
                type="button"
                class="umo-ai-chat-icon-button is-danger"
                :disabled="panel.isReadonly || panel.isSubmitting"
                :title="panel.discardButtonText"
                :aria-label="panel.discardButtonText"
                @click="panel.discardPendingResult"
              >
                <icon name="close" size="16" />
              </button>
              <button
                type="button"
                class="umo-ai-chat-icon-button is-primary"
                :class="{ 'is-loading': panel.isSubmitting }"
                :disabled="!panel.canSubmit"
                :title="panel.sendButtonText"
                :aria-label="panel.sendButtonText"
                @click="panel.submitPrompt"
              >
                <icon
                  :name="panel.isSubmitting ? 'loading' : 'reply'"
                  size="16"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        class="umo-ai-chat-resize-handle"
        @mousedown="panel.startResize"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { proxyRefs } from 'vue'

import { useAiChatPanel } from '@/components/container/use-ai-chat-panel'

const panelState = useAiChatPanel()
const panel = proxyRefs(panelState)
const { fileInputRef, messageListRef, promptTextareaRef } = panelState
</script>

<style src="./ai-chat.less" lang="less"></style>
