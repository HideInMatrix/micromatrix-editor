import { Extension } from '@tiptap/core'
import { saveAs } from 'file-saver'

let serializerLoader = null
const loadSerializer = async () => {
  if (!serializerLoader) {
    serializerLoader = import('./serializer')
  }
  return await serializerLoader
}

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
        const { createDocxDocument } = await loadSerializer()
        return await createDocxDocument(storage.editor, options)
      },
      getBlob: async (options = {}) => {
        const { createDocxBlob } = await loadSerializer()
        return await createDocxBlob(storage.editor, options)
      },
      download: async (options = {}) => {
        const { createDocxBlob } = await loadSerializer()
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
