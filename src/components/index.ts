import 'virtual:svg-icons-register'

import MxmEditor from './index.vue'
import MxmMenuButton from './menus/button.vue'
import MxmDialog from './modal.vue'
import MxmTooltip from './tooltip.vue'

const useMxmEditor = {
  install: (app, options) => {
    app.provide('defaultOptions', options || {})
    app.component(MxmEditor.name || 'MxmEditor', MxmEditor)
  },
}

export {
  MxmEditor as default,
  MxmDialog,
  MxmEditor,
  MxmMenuButton,
  MxmTooltip,
  useMxmEditor,
}
