import { Extension } from '@tiptap/core'
import { saveAs } from 'file-saver'

import { createDocxBlob, createDocxDocument } from './serializer'

const buildFilename = (title = '') => {
  const normalized = `${title || ''}`.trim()
  return `${normalized || 'document'}.docx`
}

export default Extension.create({
  name: 'docxExport',
  addStorage() {
    const storage = {
      editor: null,
      createDocument: async (options = {}) => {
        return await createDocxDocument(storage.editor, options)
      },
      getBlob: async (options = {}) => {
        return await createDocxBlob(storage.editor, options)
      },
      download: async (options = {}) => {
        const blob = await createDocxBlob(storage.editor, options)
        saveAs(blob, options.filename || buildFilename(options.title))
        return blob
      },
    }
    return storage
  },
  onCreate() {
    this.storage.editor = this.editor
  },
  addCommands() {
    return {
      exportDocx:
        (options = {}) =>
        ({ editor }) => {
          editor.storage.docxExport
            ?.download(options)
            .catch((error) => console.error(error))
          return true
        },
    }
  },
})
