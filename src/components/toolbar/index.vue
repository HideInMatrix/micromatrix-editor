<template>
  <div v-if="$toolbar.show" class="mxm-toolbar-container">
    <toolbar-ribbon
      v-if="$toolbar.mode === 'ribbon'"
      :menus="toolbarMenus"
      :current-menu="currentMenu"
      @menu-change="menuChange"
    >
      <template
        v-for="item in options.toolbar?.menus"
        :key="item"
        #[`toolbar_${item}`]="props"
      >
        <slot :name="`toolbar_${item}`" v-bind="props" />
      </template>
    </toolbar-ribbon>
    <toolbar-classic
      v-if="$toolbar.mode === 'classic'"
      :menus="toolbarMenus"
      :current-menu="currentMenu"
      @menu-change="menuChange"
    >
      <template
        v-for="item in options.toolbar?.menus"
        :key="item"
        #[`toolbar_${item}`]="props"
      >
        <slot :name="`toolbar_${item}`" v-bind="props" />
      </template>
    </toolbar-classic>
    <div
      class="mxm-toolbar-actions"
      :class="`mxm-toolbar-actions-${$toolbar.mode}`"
    >
      <t-popup
        v-if="
          options.toolbar.showSaveLabel && options.document.readOnly !== true
        "
        v-model="statusPopup"
        :attach="container"
        trigger="click"
        placement="bottom-right"
        @visible-change="(visible) => (statusPopup = visible)"
      >
        <t-button
          class="mxm-toolbar-actions-button"
          variant="text"
          size="small"
          :class="{ active: statusPopup }"
        >
          <span class="mxm-status">
            <span
              class="mxm-status-online"
              :class="{ offline: !online }"
            ></span>
            <span class="mxm-status-saved button-text">
              <span
                v-if="savedAt"
                v-text="t('save.savedAtText', { time: timeAgo(savedAt) })"
              ></span>
              <span v-else class="unsaved" v-text="t('save.unsaved')"></span>
            </span>
          </span>
        </t-button>
        <template #content>
          <div class="mxm-document-status-container mxm-status">
            <div>
              {{ t('save.network') }}
              {{ online ? t('save.online') : t('save.offline') }}
            </div>
            <div>
              {{ t('save.savedAt') }}
              <span
                v-if="savedAt"
                v-text="t('save.savedAtText', { time: timeAgo(savedAt) })"
              ></span>
              <span v-else v-text="t('save.unsaved')"></span>
            </div>
            <div class="mxm-document-button-container">
              <t-button
                size="small"
                @click="saveContent"
                v-text="t('save.text')"
              ></t-button>
              <t-button
                size="small"
                variant="outline"
                @click="setContentFromCache"
                v-text="t('save.cache.text')"
              >
              </t-button>
            </div>
          </div>
        </template>
      </t-popup>
      <t-dropdown
        trigger="click"
        size="small"
        placement="bottom-right"
        :popup-props="{
          destroyOnClose: true,
          attach: container,
        }"
        @click="toggleToolbarMode"
      >
        <t-button
          class="mxm-toolbar-actions-button"
          variant="text"
          size="small"
        >
          <icon name="expand-down" />
          <span class="mxm-button-text">{{ t('toolbar.toggle') }}</span>
        </t-button>
        <template #dropdown>
          <t-dropdown-menu
            v-for="item in editorModeOptions"
            :key="item.value"
            :content="item.label"
            :value="item.value"
            :divider="item.divider"
            :active="item.value === $toolbar.mode"
          >
            <template #prefixIcon>
              <icon :name="item.prefixIcon" />
            </template>
          </t-dropdown-menu>
        </template>
      </t-dropdown>
    </div>
  </div>
  <tooltip v-else :content="t('toolbar.show')" placement="bottom-right">
    <div class="mxm-show-toolbar" @click="$toolbar.show = true">
      <icon name="arrow-down" />
    </div>
  </tooltip>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { timeAgo } from '@/utils/time-ago'
const emits = defineEmits(['menu-change'])

const container = inject('container')
const editor = inject('editor')
const savedAt = inject('savedAt')
const options = inject('options')
const $toolbar = useState('toolbar', options)
let statusPopup = $ref(false)
const online = useOnline()

type ToolbarModeOption = {
  label: string
  value: string
  prefixIcon: string
  divider?: boolean
}

// 工具栏菜单
const defaultToolbarMenus = [
  { label: t('toolbar.base'), value: 'base' },
  { label: t('toolbar.insert'), value: 'insert' },
  { label: t('toolbar.table'), value: 'table' },
  { label: t('toolbar.tools'), value: 'tools' },
  { label: t('toolbar.page'), value: 'page' },
  { label: t('toolbar.view'), value: 'view' },
  { label: t('toolbar.export'), value: 'export' },
]
let toolbarMenus = defaultToolbarMenus
if (options.value.toolbar?.menus) {
  toolbarMenus = options.value.toolbar?.menus.map(
    (item) => defaultToolbarMenus.filter((menu) => menu.value === item)[0],
  )
}
let currentMenu = $ref(toolbarMenus[0].value)
const menuChange = (menu) => {
  currentMenu = menu
  emits('menu-change', menu)
}
// 监听如果当前编辑元素为table则切换到table菜单
watch(
  () => editor.value?.isActive('table'),
  (val, oldVal) => {
    if (val) {
      currentMenu = 'table'
    } else if (!val && oldVal) {
      currentMenu = 'base'
    }
  },
)

// 切换编辑器模式
const editorModeOptions: ToolbarModeOption[] = [
  {
    label: t('toolbar.ribbon'),
    value: 'ribbon',
    prefixIcon: 'toolbar-ribbon',
  },
  {
    label: t('toolbar.classic'),
    value: 'classic',
    prefixIcon: 'toolbar-classic',
  },
  {
    label: t('toolbar.hide'),
    value: 'hideToolbar',
    prefixIcon: 'hide-toolbar',
  },
]

const toggleToolbarMode = ({ value }) => {
  if (value === 'hideToolbar') {
    $toolbar.value.show = false
  } else {
    $toolbar.value.show = true
    $toolbar.value.mode = value
  }
}

// 保存文档
const saveContentMethod = inject('saveContent')
const saveContent = () => {
  saveContentMethod()
  statusPopup = false
}

// 从缓存中恢复文档
const setContentFromCache = () => {
  const document = useState('document', options)
  const { content } = document.value
  if (!content || content === '' || content === '<p></p>') {
    const dialog = useAlert({
      attach: container,
      theme: 'info',
      header: t('save.cache.error.title'),
      body: t('save.cache.error.message'),
      onConfirm() {
        dialog.destroy()
      },
    })
    return
  }
  statusPopup = false
  editor.value?.chain().setContent(content, true).focus().run()
}
</script>

<style lang="less" scoped>
.mxm-toolbar-container {
  display: flex;
  justify-content: space-between;
  user-select: none;
  position: relative;
}
.mxm-toolbar-actions {
  padding: 6px 10px;
  display: flex;
  align-items: center;
  &-ribbon {
    position: absolute;
    right: 0;
    top: 1px;
  }
  &-button {
    &.active {
      background-color: var(--mxm-button-hover-background);
    }
    &:not(:last-child) {
      margin-right: 3px;
    }
    :deep(.mxm-button__text) {
      display: flex;
      align-items: center;
      .mxm-icon {
        margin-right: 3px;
      }
    }
  }
  @media screen and (max-width: 640px) {
    padding-left: 0;
    .mxm-status-online {
      margin-right: 0;
    }
    .mxm-button-text {
      display: none;
    }
  }
}
.mxm-show-toolbar {
  cursor: pointer;
  position: absolute;
  right: 20px;
  font-size: 18px;
  padding: 3px 6px;
  z-index: 99;
  background-color: var(--mxm-color-white);
  color: var(--mxm-text-color-light);
  border-bottom-left-radius: var(--mxm-radius);
  border-bottom-right-radius: var(--mxm-radius);
  border: solid 1px var(--mxm-border-color);
  border-top: none;
  &:hover {
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.08);
    color: var(--mxm-primary-color);
  }
}
.mxm-status {
  font-size: 12px;
  display: flex;
  align-items: center;
  cursor: pointer;
  &-online {
    width: 10px;
    height: 10px;
    background: rgb(26, 187, 26);
    border-radius: 50%;
    &.offline {
      background: rgb(187, 26, 26);
    }
  }
  &-saved {
    color: var(--mxm-text-color-light);
    margin-left: 5px;
    .unsaved {
      color: var(--mxm-error-color);
    }
  }
}
.mxm-document-status-container {
  flex-direction: column;
  align-items: unset;
  padding: 12px 16px;
  color: var(--mxm-text-color);
  min-width: 150px;
  cursor: default;
  .mxm-document-button-container {
    margin: 8px 0 4px;
    display: flex;
    gap: 8px;
  }
}
</style>

<style lang="less">
.mxm-skin-modern {
  &.toolbar-classic {
    .mxm-toolbar-actions {
      margin: 15px 15px 2px 0;
      border-radius: 6px;
      background-color: var(--mxm-color-white);
      box-shadow:
        0 0 0 1px hsla(0, 0%, 5%, 0.04),
        0 2px 5px hsla(0, 0%, 5%, 0.06);
      &:hover {
        box-shadow:
          0 0 0 1px hsla(0, 0%, 5%, 0.06),
          0 2px 5px hsla(0, 0%, 5%, 0.1);
      }
    }
  }
  &.toolbar-ribbon {
    .mxm-toolbar-actions {
      right: 5px !important;
      top: 6px !important;
    }
  }
}
[theme-mode='dark'] .mxm-skin-modern {
  &.toolbar-classic {
    .mxm-toolbar-actions {
      outline: solid 1px var(--mxm-border-color-light);
    }
  }
}
</style>
