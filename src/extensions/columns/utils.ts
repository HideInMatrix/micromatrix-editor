export const findBoundaryPosition = (view, event, handleWidth) => {
  const gridDOM = event.composedPath().find(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      el.classList.contains('mxm-node-column-container'),
  )
  if (!gridDOM) return -1

  const children = Array.from(gridDOM.children).filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement && el.classList.contains('mxm-node-column'),
  )
  for (let i = 0; i < children.length; i++) {
    const colEl = children[i]
    const rect = colEl.getBoundingClientRect()
    if (
      event.clientX >= rect.right - handleWidth - 2 &&
      event.clientX <= rect.right + 10 + handleWidth
    ) {
      const pos = view.posAtDOM(colEl, 0)
      if (pos !== null) {
        return pos
      }
    }
  }

  return -1
}

export const draggedWidth = (dragging, event, minWidth) => {
  const offset = event.clientX - dragging.startX
  return Math.max(minWidth, dragging.startWidth + offset)
}

export const updateColumnNodeWidth = (view, pos, attrs, width) => {
  view.dispatch(
    view.state.tr.setNodeMarkup(pos, undefined, {
      ...attrs,
      colWidth: width - 12 * 2,
    }),
  )
}

export const getColumnInfoAtPos = (view, boundaryPos) => {
  const $pos = view.state.doc.resolve(boundaryPos)
  const node = $pos.parent
  if (!node || node.type.name !== 'column') return null

  const dom = view.domAtPos($pos.pos)
  if (!dom.node) return null

  const columnEl =
    dom.node instanceof HTMLElement ? dom.node : dom.node.childNodes[dom.offset]
  if (!(columnEl instanceof HTMLElement)) return null

  const domWidth = columnEl.offsetWidth

  return { $pos, node, columnEl, domWidth }
}
