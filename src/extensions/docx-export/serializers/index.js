import { createBlockSerializers } from './blocks'
import { createInlineSerializers } from './inline'
import { createListSerializers } from './lists'
import { createTableSerializers } from './tables'

export const createNodeSerializers = (context, helpers) => {
  const runtime = {
    context,
    helpers,
    functions: {},
  }

  Object.assign(runtime.functions, createInlineSerializers(runtime))
  Object.assign(runtime.functions, createTableSerializers(runtime))
  Object.assign(runtime.functions, createListSerializers(runtime))
  Object.assign(runtime.functions, createBlockSerializers(runtime))

  return runtime.functions
}
