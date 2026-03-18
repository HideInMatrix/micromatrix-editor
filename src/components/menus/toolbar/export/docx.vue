<template>
  <menus-button
    ico="file"
    :text="t('export.docx.text')"
    huge
    :disabled="loading"
    @menu-click="saveDocxFile"
  />
</template>

<script setup>
import { saveAs } from 'file-saver'

const container = inject('container')
const options = inject('options')
const exportDocxDocument = inject('exportDocxDocument', null)

let loading = $ref(false)

const saveDocxFile = async () => {
  if (!exportDocxDocument || loading) {
    return
  }

  loading = true
  try {
    const blob = await exportDocxDocument()
    const { title } = options.value.document
    const filename = title !== '' ? title : t('document.untitled')
    saveAs(blob, `${filename}.docx`)
  } catch (error) {
    const dialog = useAlert({
      attach: container,
      theme: 'warning',
      header: t('export.docx.error'),
      body: error?.message || t('export.docx.error'),
      onConfirm() {
        dialog.destroy()
      },
    })
  } finally {
    loading = false
  }
}
</script>
