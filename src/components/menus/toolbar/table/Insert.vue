<template>
  <MenusButton
    ico="table"
    :text="t('table.insert.text')"
    :tooltip="t('table.insert.tip')"
    menu-type="popup"
    huge
    :popup-visible="popupVisible"
    @toggle-popup="togglePopup"
  >
    <template #content>
      <div class="mxm-table-grid" @mouseleave="resetTable">
        <div v-for="(row, rowIndex) in table" :key="rowIndex" class="row">
          <div
            v-for="(cell, colIndex) in row"
            :key="colIndex"
            class="cell"
            :class="{ selected: isSelected(rowIndex, colIndex) }"
            @mouseover="selectCell(rowIndex, colIndex)"
            @click="insertTable"
          ></div>
        </div>
      </div>
      <div class="mxm-table-custom">
        <div
          class="mxm-table-custom-title"
          v-text="t('table.insert.property')"
        ></div>
        <TInputNumber
          v-model="selected.rows"
          theme="column"
          align="right"
          :max="1000"
          :min="0"
          :label="t('table.insert.rows')"
        />
        <TInputNumber
          v-model="selected.cols"
          theme="column"
          align="right"
          :max="30"
          :min="0"
          :label="t('table.insert.cols')"
        />
        <TCheckbox v-model="withHeaderRow">
          {{ t('table.insert.withHeader') }}
        </TCheckbox>
        <TButton
          class="mxm-insert-button"
          block
          theme="primary"
          variant="base"
          @click="insertTable"
          v-text="t('table.insert.create')"
        >
        </TButton>
      </div>
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
const { popupVisible, togglePopup } = usePopup()
const editor = inject('editor')

const table = Array.from({ length: 8 }, () =>
  Array.from({ length: 10 }, () => ''),
)
const selected = $ref({ rows: 0, cols: 0 })
const withHeaderRow = $ref(true)

const isSelected = (rows, cols) => {
  return (
    selected.rows &&
    selected.rows > rows &&
    selected.cols &&
    selected.cols > cols
  )
}
const selectCell = (rows, cols) => {
  selected.rows = rows + 1
  selected.cols = cols + 1
}
const resetTable = () => {
  selected.rows = 0
  selected.cols = 0
}
const insertTable = () => {
  const { rows, cols } = selected
  if (rows === 0 || rows > 1000 || cols === 0 || cols > 30) {
    return
  }
  editor.value?.chain().focus().insertTable({ rows, cols, withHeaderRow }).run()
  popupVisible.value = false
}
</script>

<style lang="less" scoped>
.mxm-table-grid {
  .row {
    display: flex;
    gap: 4px;
  }
  .cell {
    width: 14px;
    height: 14px;
    border: 1px solid var(--mxm-border-color);
    cursor: pointer;
    margin-bottom: 4px;
    &.selected {
      border-color: var(--mxm-primary-color);
      background-color: rgba(0, 0, 0, 0.03);
    }
  }
}

.mxm-table-custom {
  :deep(.mxm-input-number) {
    width: 196px;
    display: block;
    margin-bottom: 8px;
  }
  &-title {
    color: var(--mxm-text-color-light);
    font-size: 12px;
    margin: 8px 0 2px;
  }
  .mxm-insert-button {
    margin-top: 5px;
  }
}
</style>
