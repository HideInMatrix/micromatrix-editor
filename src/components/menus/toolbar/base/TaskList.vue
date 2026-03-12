<template>
  <MenusButton
    ico="task-list"
    :text="t('list.task.text')"
    shortcut="Ctrl+Shift+9"
    menu-type="dropdown"
    popup-handle="arrow"
    hide-text
    :menu-active="editor?.isActive('taskList')"
    :disabled="
      !editor?.can().chain().focus().toggleBulletList().run() &&
      !editor?.can().chain().focus().toggleOrderedList().run() &&
      !editor?.can().chain().focus().toggleTaskList().run()
    "
    @menu-click="editor?.chain().focus().toggleTaskList().run()"
  >
    <template #dropmenu>
      <TDropdownMenu>
        <TDropdownItem
          :disabled="!editor?.can().splitListItem('taskItem')"
          @click="editor?.chain().focus().splitListItem('taskItem').run()"
        >
          {{ t('list.task.split') }}
        </TDropdownItem>
        <TDropdownItem
          :disabled="!editor?.can().sinkListItem('taskItem')"
          @click="editor?.chain().focus().sinkListItem('taskItem').run()"
        >
          {{ t('list.task.sink') }}
        </TDropdownItem>
        <TDropdownItem
          :disabled="!editor?.can().liftListItem('taskItem')"
          @click="editor?.chain().focus().liftListItem('taskItem').run()"
        >
          {{ t('list.task.lift') }}
        </TDropdownItem>
      </TDropdownMenu>
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const editor = inject('editor')
</script>
