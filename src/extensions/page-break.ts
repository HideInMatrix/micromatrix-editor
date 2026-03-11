import { mergeAttributes, Node } from '@tiptap/core'

export default Node.create({
  name: 'pageBreak',
  group: 'block',
  addOptions() {
    return {
      HTMLAttributes: {
        class: 'mxm-page-break',
        'data-line-number': false,
      },
      getContentLabel: () => t('page.break'),
    }
  },
  parseHTML() {
    return [{ tag: 'div[class*="mxm-page-break"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-content': this.options.getContentLabel(),
      }),
    ]
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
          }),
    }
  },
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    }
  },
})
