import { PluginKey, type Transaction } from '@tiptap/pm/state'

export const gridResizingPluginKey = new PluginKey('gridResizingPlugin')

export type GridDragging =
  | {
      startX: number
      startWidth: number
    }
  | false
  | null

export class GridResizeState {
  activeHandle: number
  dragging: GridDragging

  constructor(activeHandle: number, dragging: GridDragging) {
    this.activeHandle = activeHandle
    this.dragging = dragging
  }

  apply(tr: Transaction) {
    const action = tr.getMeta(gridResizingPluginKey) as
      | {
          setHandle?: number
          setDragging?: GridDragging
        }
      | undefined
    if (!action) return this

    if (typeof action.setHandle === 'number') {
      return new GridResizeState(action.setHandle, false)
    }
    if (action.setDragging !== undefined) {
      return new GridResizeState(this.activeHandle, action.setDragging)
    }
    if (this.activeHandle > -1 && tr.docChanged) {
      // remap when doc changes
    }
    return this
  }
}
