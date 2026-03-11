import { createApp } from 'vue'

import App from './app.vue'
import { useMxmEditor } from './components'

const app = createApp(App)

const options = {}

app.use(useMxmEditor, options)

app.mount('#app')
