import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'

import { shortId } from '@/utils/short-id'

import NodeView from './node-view.vue'

const parseJsonAttribute = (element, attributeName, defaultValue) => {
  const value = element.getAttribute(attributeName)
  if (!value) {
    return defaultValue
  }
  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

export default Node.create({
  name: 'ai',
  inline: false,
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,
  addAttributes() {
    return {
      vnode: {
        default: true,
      },
      id: {
        default: null,
      },
      title: {
        default: null,
      },
      prompt: {
        default: '',
      },
      response: {
        default: '',
      },
      summary: {
        default: '',
      },
      status: {
        default: 'done',
      },
      error: {
        default: '',
      },
      actions: {
        default: [],
        parseHTML: (element) =>
          parseJsonAttribute(element, 'data-actions', []),
        renderHTML: (attributes) => ({
          'data-actions':
            Array.isArray(attributes.actions) && attributes.actions.length > 0
              ? JSON.stringify(attributes.actions)
              : null,
        }),
      },
      createdAt: {
        default: null,
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="ai"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'ai',
      }),
    ]
  },
  addNodeView() {
    return VueNodeViewRenderer(NodeView)
  },
  addCommands() {
    return {
      setAi:
        (options = {}, position = null) =>
        ({ commands, editor }) => {
          const attrs = {
            vnode: true,
            id: options.id || shortId(10),
            createdAt: options.createdAt || new Date().toISOString(),
            ...options,
          }
          const insertPosition =
            typeof position === 'number'
              ? position
              : editor.state.selection.anchor
          return commands.insertContentAt(insertPosition, {
            type: this.name,
            attrs,
          })
        },
      updateAiById:
        (id, attrs = {}) =>
        ({ editor, tr, dispatch }) => {
          if (!id) {
            return false
          }

          let updated = false
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === id) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                ...attrs,
              })
              updated = true
              return false
            }
            return true
          })

          if (updated && dispatch) {
            dispatch(tr)
          }
          return updated
        },
    }
  },
})
