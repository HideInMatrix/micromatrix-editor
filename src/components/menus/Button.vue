<template>
  <TTooltip
    :content="getTooltipContent"
    :visible="tooltipVisible && !tooltipForceHide"
    theme="light"
    placement="top"
    :attach="container"
    :show-arrow="false"
    destroy-on-close
  >
    <div
      class="mxm-menu-button-wrap"
      @click="tooltipVisible = false"
      @mouseover="tooltipVisible = true"
      @mouseleave="tooltipVisible = false"
    >
      <template v-if="menuType === 'button'">
        <TButton
          class="mxm-menu-button"
          :class="{
            huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
            'show-text': !hideText,
            active: menuActive && editor?.isEditable !== false,
          }"
          shape="square"
          variant="text"
          size="small"
          :disabled="
            !forceEnabled && (disabled || editor?.isEditable === false)
          "
          v-bind="attrs"
          @click="menuClick"
        >
          <div class="mxm-button-content">
            <slot />
            <template v-if="ico">
              <span
                v-if="ico?.startsWith('<')"
                class="mxm-button-icon-svg"
                v-html="ico"
              >
              </span>
              <Icon v-else class="mxm-button-icon" :name="ico" />
            </template>
            <p class="mxm-button-text">{{ text }}</p>
            <kbd v-if="shortcutText" class="mxm-button-kbd">
              {{ getShortcut(shortcutText) }}
            </kbd>
          </div>
        </TButton>
      </template>
      <template v-else-if="menuType === 'dropdown'">
        <template v-if="popupHandle === 'arrow'">
          <TButton
            class="mxm-menu-button has-arrow"
            :class="{
              huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
              'show-text': !hideText,
              active: tooltipForceHide,
            }"
            variant="text"
            size="small"
            v-bind="attrs"
            :disabled="
              !forceEnabled && (disabled || editor?.isEditable === false)
            "
          >
            <div class="mxm-button-content" @click="menuClick">
              <slot />
              <template v-if="ico">
                <span
                  v-if="ico?.startsWith('<')"
                  class="mxm-button-icon-svg"
                  v-html="ico"
                >
                </span>
                <Icon v-else class="mxm-button-icon" :name="ico" />
              </template>
              <p class="mxm-button-text">{{ text }}</p>
              <kbd v-if="shortcutText" class="mxm-button-kbd">
                {{ getShortcut(shortcutText) }}
              </kbd>
            </div>
            <TDropdown
              v-bind="attrs"
              trigger="click"
              size="small"
              :options="selectOptions"
              :popup-props="{
                overlayClassName: attrs['overlay-class-name'],
                popperOptions: {
                  modifiers: [
                    { name: 'offset', options: { offset: [-22, 0] } },
                  ],
                },
                onVisibleChange: popupVisileChange,
                destroyOnClose: true,
                attach: container,
              }"
              @click="attrs.onChange"
            >
              <span class="mxm-button-icon-arrow mxm-button-handle">
                <Icon name="arrow-down" />
              </span>
              <slot v-if="!selectOptions" name="dropmenu" />
            </TDropdown>
          </TButton>
        </template>
        <template v-else>
          <TDropdown
            v-bind="attrs"
            trigger="click"
            size="small"
            :options="selectOptions"
            :popup-props="{
              overlayClassName: attrs['overlay-class-name'],
              onVisibleChange: popupVisileChange,
              destroyOnClose: true,
              attach: container,
            }"
            @click="attrs.onChange"
          >
            <TButton
              class="mxm-menu-button has-arrow"
              :class="{
                huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
                'show-text': !hideText,
                active: tooltipForceHide,
              }"
              variant="text"
              size="small"
              v-bind="attrs"
              :disabled="
                !forceEnabled && (disabled || editor?.isEditable === false)
              "
            >
              <div class="mxm-button-content" @click="menuClick">
                <slot />
                <template v-if="ico">
                  <span
                    v-if="ico?.startsWith('<')"
                    class="mxm-button-icon-svg"
                    v-html="ico"
                  >
                  </span>
                  <Icon v-else class="mxm-button-icon" :name="ico" />
                </template>
                <p class="mxm-button-text">{{ text }}</p>
                <kbd v-if="shortcutText" class="mxm-button-kbd">{{
                  getShortcut(shortcutText)
                }}</kbd>
                <span
                  v-if="$toolbar.mode === 'ribbon'"
                  class="mxm-button-icon-arrow"
                >
                  <Icon name="arrow-down" />
                </span>
              </div>
              <span
                v-if="$toolbar.mode === 'classic'"
                class="mxm-button-icon-arrow"
              >
                <Icon name="arrow-down" />
              </span>
            </TButton>
            <slot v-if="!selectOptions" name="dropmenu" />
          </TDropdown>
        </template>
      </template>
      <template v-else-if="menuType === 'select'">
        <TSelect
          v-if="selectVisible"
          size="small"
          placement="bottom-left"
          :on-popup-visible-change="popupVisileChange"
          :value="selectValue"
          :popup-props="{
            destroyOnClose: true,
            attach: container,
          }"
          v-bind="attrs"
          :options="selectOptions"
          :disabled="
            !forceEnabled && (disabled || editor?.isEditable === false)
          "
          @change="menuClick"
        >
          <slot />
        </TSelect>
      </template>
      <template v-else-if="menuType === 'popup'">
        <template v-if="popupHandle === 'arrow'">
          <TButton
            class="mxm-menu-button has-arrow"
            :class="{
              'show-text': !hideText,
              active: popupVisible,
            }"
            variant="text"
            size="small"
            v-bind="attrs"
            :disabled="
              !forceEnabled && (disabled || editor?.isEditable === false)
            "
          >
            <div class="mxm-button-content" @click="menuClick">
              <slot />
              <template v-if="ico">
                <span
                  v-if="ico?.startsWith('<')"
                  class="mxm-button-icon-svg"
                  v-html="ico"
                >
                </span>
                <Icon v-else class="mxm-button-icon" :name="ico" />
              </template>
              <p class="mxm-button-text">{{ text }}</p>
              <kbd v-if="shortcutText" class="mxm-button-kbd">
                {{ getShortcut(shortcutText) }}
              </kbd>
            </div>
            <TPopup
              :attach="container"
              trigger="click"
              placement="bottom-left"
              v-bind="attrs"
              :visible="popupVisible"
              :popper-options="{
                modifiers: [{ name: 'offset', options: { offset: [-22, 0] } }],
              }"
            >
              <span
                v-if="$toolbar.mode === 'ribbon'"
                ref="popupHandleRef"
                class="mxm-button-icon-arrow mxm-button-handle"
                @click="togglePopup(!popupVisible)"
              >
                <Icon name="arrow-down" />
              </span>
              <template #content>
                <div ref="popupContentRef" class="mxm-popup-content">
                  <slot name="content" />
                </div>
              </template>
              <span
                v-if="$toolbar.mode === 'classic'"
                ref="popupHandleRef"
                class="mxm-button-icon-arrow mxm-button-handle"
                @click="togglePopup(!popupVisible)"
              >
                <Icon name="arrow-down" />
              </span>
            </TPopup>
          </TButton>
        </template>
        <template v-else>
          <TPopup
            :attach="container"
            trigger="click"
            placement="bottom-left"
            :visible="popupVisible"
          >
            <TButton
              ref="popupHandleRef"
              class="mxm-menu-button has-arrow"
              :class="{
                huge: (huge && $toolbar.mode === 'ribbon') || forceHuge,
                'show-text': !hideText,
                active: popupVisible,
              }"
              variant="text"
              size="small"
              v-bind="attrs"
              :disabled="
                !forceEnabled && (disabled || editor?.isEditable === false)
              "
              @click="togglePopup(!popupVisible)"
            >
              <div class="mxm-button-content">
                <slot />
                <template v-if="ico">
                  <span
                    v-if="ico?.startsWith('<')"
                    class="mxm-button-icon-svg"
                    v-html="ico"
                  >
                  </span>
                  <Icon v-else class="mxm-button-icon" :name="ico" />
                </template>
                <p class="mxm-button-text">{{ text }}</p>
                <kbd v-if="shortcutText" class="mxm-button-kbd">{{
                  getShortcut(shortcutText)
                }}</kbd>
                <span
                  v-if="$toolbar.mode === 'ribbon'"
                  class="mxm-button-icon-arrow"
                >
                  <Icon name="arrow-down" />
                </span>
              </div>
              <span
                v-if="$toolbar.mode === 'classic'"
                class="mxm-button-icon-arrow"
              >
                <Icon name="arrow-down" />
              </span>
            </TButton>
            <template #content>
              <div ref="popupContentRef" class="mxm-popup-content">
                <slot name="content" />
              </div>
            </template>
          </TPopup>
        </template>
      </template>
      <template v-else>
        <slot />
      </template>
    </div>
  </TTooltip>
</template>

<script setup lang="ts">
import { isString } from '@tool-belt/type-predicates'

import { getShortcut } from '@/utils/shortcut'

type MenuButtonProps = {
  menuType?: string
  huge?: boolean
  forceHuge?: boolean
  ico?: string
  text?: string
  hideText?: boolean
  tooltip?: string | boolean
  shortcut?: string
  shortcutText?: string
  selectOptions?: any[]
  selectValue?: string | number
  popupVisible?: boolean
  popupHandle?: string
  menuActive?: boolean
  disabled?: boolean
  forceEnabled?: boolean
}

const { selectVisible } = useSelect()

const props = withDefaults(defineProps<MenuButtonProps>(), {
  menuType: 'button',
  huge: false,
  forceHuge: false,
  ico: undefined,
  text: '',
  hideText: false,
  tooltip: undefined,
  shortcut: undefined,
  shortcutText: undefined,
  selectOptions: undefined,
  selectValue: '',
  popupVisible: false,
  popupHandle: undefined,
  menuActive: false,
  disabled: false,
  forceEnabled: false,
})
const emits = defineEmits(['toggle-popup'])

const attrs = useAttrs() as Record<string, any>
const container = inject('container')
const editor = inject('editor')
const options = inject('options')
const $toolbar = useState('toolbar', options)
const menuClick = (...args) => {
  if (attrs.onMenuClickThrough) {
    attrs.onMenuClickThrough(...args)
  } else if (attrs.onMenuClick) {
    attrs.onMenuClick(...args)
  }
}

const tooltipVisible = $ref(false)
let tooltipForceHide = $ref(false)
const popupVisileChange = (visible) => {
  // 隐藏 Tooltip，适用于 select、dropdown、popup 等子组件展开时，隐藏 Tooltip
  tooltipForceHide = visible
}
const getTooltipContent = () => {
  if (props.tooltip === false) {
    return ''
  }
  if (props.huge && props.tooltip) {
    return `${props.tooltip}${props.shortcut ? ` (${getShortcut(props.shortcut)})` : ''}`
  }
  if (props.text) {
    return `${isString(props.tooltip) && props.tooltip ? props.tooltip : props.text}${props.shortcut ? ` (${getShortcut(props.shortcut)})` : ''}`
  }
  return ''
}
watch(
  () => props.popupVisible,
  (val) => {
    tooltipForceHide = val
  },
)

// Popup
const popupHandleRef = ref(null)
const popupContentRef = ref(null)
const togglePopup = (visible) => {
  emits('toggle-popup', visible)
}
onClickOutside(
  popupContentRef,
  () => {
    emits('toggle-popup', false)
  },
  {
    ignore: [popupHandleRef, '.mxm-popup'],
  },
)
</script>

<style lang="less" scoped>
.mxm-menu-button {
  --td-comp-paddingLR-s: 5px;
  --td-radius-default: var(--mxm-radius);
  border: none;
  &.show-text {
    width: auto;
    padding-left: var(--td-comp-paddingLR-s);
    padding-right: var(--td-comp-paddingLR-s);
    .mxm-button-content .mxm-button-text {
      display: block !important;
      margin-left: 3px;
    }
  }
  &[disabled] {
    .mxm-button-icon {
      --mxm-primary-color: var(--mxm-text-color-disabled);
      color: var(--mxm-text-color-disabled) !important;
    }
    .mxm-button-text {
      color: var(--mxm-text-color-disabled) !important;
    }
  }
  &-wrap {
    display: inline-flex;
    &:not(:last-child) {
      margin-right: 5px;
    }
  }
  &.active {
    background-color: var(--mxm-button-hover-background);
    .mxm-button-icon-arrow.mxm-button-handle {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
  .mxm-button-content {
    display: flex;
    align-items: center;
    justify-content: center;
    .mxm-button-icon,
    :deep(.mxm-icon) {
      font-size: 16px;
    }
    .mxm-button-icon-svg {
      display: flex;
      :deep(svg) {
        width: 16px;
        height: 16px;
      }
    }
    .mxm-button-text {
      display: none;
    }
  }
  .mxm-button-icon-arrow {
    display: flex;
    border-top-right-radius: var(--td-radius-default);
    border-bottom-right-radius: var(--td-radius-default);
    width: 12px;
    height: 26px;
    align-items: center;
    justify-content: center;
    margin-right: -3px;
    .mxm-button-icon {
      font-size: 10px;
      color: var(--mxm-text-color-light);
    }
    &.mxm-button-handle {
      margin: 0 -4px 0 2px;
      &:hover {
        background-color: var(--td-bg-color-container-active);
      }
    }
  }
  &.huge {
    width: auto;
    padding: 0 var(--td-comp-paddingLR-s);
    height: 56px;
    margin-bottom: 0;
    flex-direction: column;
    .mxm-button-content {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      min-width: 32px;
      .mxm-button-icon {
        display: block;
        font-size: 24px;
        margin-top: 3px;
      }
      .mxm-button-icon-svg {
        display: flex;
        margin-top: 3px;
        :deep(svg) {
          width: 24px;
          height: 24px;
        }
      }
      .mxm-button-text {
        display: block;
        font-size: 12px;
        color: var(--mxm-text-color);
      }
      .mxm-button-icon-arrow {
        position: absolute;
        left: calc(50% + 12px);
        top: 2px;
      }
    }
    &.has-arrow {
      .mxm-button-content {
        min-width: 40px;
      }
    }
  }
}
:global(.mxm-popup-content) {
  padding: var(--mxm-popup-content-padding);
}
</style>
