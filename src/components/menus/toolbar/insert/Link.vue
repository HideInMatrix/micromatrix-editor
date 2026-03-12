<template>
  <MenusButton
    ico="link"
    :text="t('insert.link.text')"
    menu-type="popup"
    huge
    :popup-visible="popupVisible"
    @toggle-popup="togglePopup"
  >
    <template #content>
      <div class="mxm-link-container">
        <TForm label-align="top">
          <TFormItem :label="t('insert.link.hrefText')">
            <TInput
              v-model.trim="text"
              :status="error.text ? 'error' : 'default'"
              :placeholder="t('insert.link.hrefTextTip')"
              clearable
            />
          </TFormItem>
          <TFormItem :label="t('insert.link.href')">
            <TInput
              v-model="href"
              :status="error.href ? 'error' : 'default'"
              type="url"
              clearable
              :placeholder="t('insert.link.hrefTip')"
            />
          </TFormItem>
          <TFormItem>
            <TButton
              theme="primary"
              type="submit"
              :disabled="href === '' || text === ''"
              @click="insertLink"
              >{{ t('insert.link.confirm') }}</TButton
            >
            <TButton
              theme="default"
              variant="text"
              style="margin-left: 10px"
              :disabled="href === '' || text === ''"
              @click="removeLink"
              >{{ t('insert.link.remove') }}</TButton
            >
          </TFormItem>
        </TForm>
      </div>
    </template>
  </MenusButton>
</template>

<script setup lang="ts">
import { t } from '@/composables/i18n'
import { getSelectionText } from '@/utils/selection'

const { popupVisible, togglePopup } = usePopup()
const editor = inject('editor')

let text = $ref('')
let href = $ref('')
const error = $ref({ text: false, href: false })
const insertLink = () => {
  if (text === '') {
    error.text = true
    return
  }
  if (
    !href.startsWith('http://') &&
    !href.startsWith('https://') &&
    !href.startsWith('ftp://') &&
    !href.startsWith('ftps://') &&
    !href.startsWith('mailto://')
  ) {
    error.href = true
    return
  }
  error.text = false
  error.href = false
  editor.value?.commands.setLink({ href, target: '_blank' })
  editor.value?.chain().focus().insertContent(text).run()
  popupVisible.value = false
}
const removeLink = () => {
  editor.value?.chain().focus().unsetLink().run()
  popupVisible.value = false
}

watch(
  () => popupVisible.value,
  (val) => {
    if (val) {
      text = editor.value ? getSelectionText(editor.value) : ''
      href = editor?.value?.getAttributes('link').href || ''
    } else {
      text = ''
      href = ''
      error.text = false
      error.href = false
    }
  },
)
</script>

<style lang="less" scoped>
.mxm-link-container {
  padding: 0 2px 2px;
  margin-top: -6px;
  width: 320px;
  :deep(.mxm-form__item) {
    margin-bottom: 5px;
    &:last-child {
      margin-top: 15px;
    }
  }
}
</style>
