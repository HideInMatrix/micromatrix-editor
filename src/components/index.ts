import 'virtual:svg-icons-register'

import MxmEditor from './index.vue'
import MxmMenuButton from './menus/Button.vue'
import MxmDialog from './Modal.vue'
import MxmTooltip from './Tooltip.vue'

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
