<template>
  <div
    v-if="items.length > 0"
    ref="popupRef"
    class="mxm-popup mxm-mention-popup"
  >
    <div class="mxm-popup__content mxm-dropdown">
      <div class="mxm-dropdown__menu" style="padding: 5px; max-height: 320px">
        <div>
          <li
            v-for="(item, index) in items"
            :key="index"
            class="mxm-dropdown__item mxm-dropdown__item--theme-default mxm-dropdown__item"
            :class="{ 'mxm-dropdown__item--active': index === selectedIndex }"
            @click="selectItem(index)"
          >
            {{ item.label }}
          </li>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  command: {
    type: Function,
    required: true,
  },
})

let selectedIndex = $ref(0)

watch(
  () => props.items,
  () => {
    selectedIndex = 0
  },
)

const onKeyDown = ({ event }) => {
  if (event.key === 'ArrowUp') {
    upHandler()
    return true
  }

  if (event.key === 'ArrowDown') {
    downHandler()
    return true
  }

  if (event.key === 'Enter') {
    if (props.items.length === 0) {
      return false
    }
    enterHandler()
    return true
  }

  return false
}

const upHandler = () => {
  selectedIndex = (selectedIndex + props.items.length - 1) % props.items.length
}

const downHandler = () => {
  selectedIndex = (selectedIndex + 1) % props.items.length
}

const enterHandler = () => {
  selectItem(selectedIndex)
}

const selectItem = (index) => {
  const item = props.items[index]

  if (item) {
    props.command(item)
  }
}

defineExpose({
  onKeyDown,
})
</script>

<style lang="less">
.mxm-node-mention {
  box-decoration-break: clone;
  color: var(--mxm-primary-color);
  padding: 0.1em 0.2em;
  margin: 0 0.1em;
  border-radius: 0.2em;
  white-space: nowrap;
  cursor: default;
}
.mxm-mention-popup {
  .mxm-dropdown {
    &__item--active {
      font-weight: 600;
    }
  }
  &-empty {
    padding: 3px 5px;
    min-width: 100px;
    color: var(--mxm-text-color-light);
  }
}
</style>
