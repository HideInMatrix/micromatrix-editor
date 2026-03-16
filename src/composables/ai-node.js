import { getSelectionText } from '@/utils/selection'
import { shortId } from '@/utils/short-id'

const getInsertPosFromResolved = ($pos) => {
  if (!$pos) {
    return 0
  }
  if ($pos.depth > 0) {
    try {
      return $pos.after($pos.depth)
    } catch {}
  }
  return $pos.pos
}

const createBaseAiAttrs = () => {
  return {
    vnode: true,
    id: shortId(10),
    prompt: '',
    response: '',
    summary: '',
    status: 'idle',
    error: '',
    actions: [],
    createdAt: new Date().toISOString(),
  }
}

export const createSelectionAiNodePayload = ({ editor }) => {
  if (!editor) {
    return null
  }

  const { selection } = editor.state
  const text = getSelectionText(editor).trim()
  if (!text) {
    return null
  }

  const parent = selection.$from?.parent || null
  const parentPos =
    selection.$from && selection.$from.depth > 0
      ? selection.$from.before(selection.$from.depth)
      : selection.from
  const insertPos = getInsertPosFromResolved(selection.$to)

  return {
    position: Math.max(insertPos, 0),
    attrs: {
      ...createBaseAiAttrs(),
      targetType: 'selection',
      contextText: text,
      selectionRange: {
        from: selection.from,
        to: selection.to,
        empty: selection.empty,
        text,
      },
      block: {
        type: parent?.type?.name || 'paragraph',
        text: parent?.textContent || '',
        pos: parentPos,
      },
      insertPos,
    },
  }
}

export const createBlockAiNodePayload = ({
  editor,
  node,
  pos,
  locale = 'zh-CN',
}) => {
  if (!editor) {
    return null
  }

  const text = (node?.textContent || '').trim()
  const blockType = node?.type?.name || 'paragraph'
  const basePos = Number.isFinite(pos)
    ? pos
    : editor.state.selection?.from || 0
  const nodeSize = node?.nodeSize || 0
  const insertPos = basePos + nodeSize

  return {
    position: Math.max(insertPos, 0),
    attrs: {
      ...createBaseAiAttrs(),
      targetType: 'block',
      contextText:
        text ||
        (locale === 'zh-CN'
          ? `当前块类型：${blockType}`
          : `Current block type: ${blockType}`),
      selectionRange: {
        from: basePos,
        to: basePos + nodeSize,
        empty: !text,
        text,
      },
      block: {
        type: blockType,
        text,
        pos: basePos,
      },
      insertPos,
    },
  }
}
