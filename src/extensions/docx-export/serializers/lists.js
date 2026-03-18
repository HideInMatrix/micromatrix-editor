export const createListSerializers = (runtime) => {
  const { context, helpers, functions } = runtime

  const getTaskPrefixChildren = (checked) => {
    return [
      functions.createTextRun({
        text: checked ? '☒ ' : '☐ ',
      }),
    ]
  }

  const createTaskPlaceholderParagraph = (level, prefixChildren) => {
    return new context.docx.Paragraph({
      children: prefixChildren,
      indent: {
        left: 720 + level * 360,
      },
    })
  }

  const createListParagraphOptions = (listState) => {
    if (listState.type === 'ordered') {
      return listState.reference
        ? {
            numbering: {
              reference: listState.reference,
              level: listState.level,
            },
          }
        : {}
    }

    if (listState.type === 'bullet') {
      return listState.reference
        ? {
            numbering: {
              reference: listState.reference,
              level: listState.level,
            },
          }
        : {}
    }

    return {
      indent: {
        left: 720 + listState.level * 360,
      },
    }
  }

  const serializeList = async (node, state = {}) => {
    const listReference = context.getListReference(node)
    const type =
      node?.type === 'orderedList'
        ? 'ordered'
        : node?.type === 'bulletList'
          ? 'bullet'
          : 'task'

    return (
      await Promise.all(
        helpers.ensureArray(node?.content).map((item) =>
          serializeListItem(item, {
            level: state.level || 0,
            reference: listReference?.reference || null,
            type,
          }),
        ),
      )
    ).flat()
  }

  const serializeListItem = async (node, listState) => {
    const blocks = []
    const content = helpers.ensureArray(node?.content)
    const prefixChildren =
      listState.type === 'task'
        ? getTaskPrefixChildren(node?.attrs?.checked)
        : []

    let hasBlockParagraph = false

    for (const child of content) {
      if (['bulletList', 'orderedList', 'taskList'].includes(child?.type)) {
        blocks.push(
          ...(await serializeList(child, { level: listState.level + 1 })),
        )
        continue
      }

      if (
        ['paragraph', 'heading', 'detailsSummary', 'textBox'].includes(
          child?.type,
        )
      ) {
        hasBlockParagraph = true
        blocks.push(
          await functions.createParagraph(child, {
            ...createListParagraphOptions(listState),
            prefixChildren: prefixChildren.length ? prefixChildren : undefined,
          }),
        )
        prefixChildren.length = 0
        continue
      }

      if (!hasBlockParagraph) {
        hasBlockParagraph = true
        if (listState.type === 'task') {
          blocks.push(
            createTaskPlaceholderParagraph(listState.level, prefixChildren),
          )
        } else {
          blocks.push(
            new context.docx.Paragraph({
              children: [functions.createTextRun({ text: '' })],
              ...createListParagraphOptions(listState),
            }),
          )
        }
        prefixChildren.length = 0
      }

      blocks.push(...(await functions.serializeBlockNode(child)))
    }

    if (!hasBlockParagraph && prefixChildren.length) {
      blocks.push(
        createTaskPlaceholderParagraph(listState.level, prefixChildren),
      )
    }

    return blocks
  }

  return {
    serializeList,
    serializeListItem,
  }
}
