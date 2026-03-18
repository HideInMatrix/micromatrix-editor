export const createTableSerializers = (runtime) => {
  const { context, helpers, functions } = runtime

  const parseSpan = (value) => {
    const numeric = Number.parseInt(`${value || 1}`, 10)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1
  }

  const getRowColumnCount = (rowNode) => {
    return helpers.ensureArray(rowNode?.content).reduce((count, cellNode) => {
      return count + parseSpan(cellNode?.attrs?.colspan)
    }, 0)
  }

  const getColumnWidths = (rows, columnCount) => {
    const widths = Array.from({ length: columnCount }, () => 0)
    let hasExplicitWidth = false

    for (const rowNode of rows) {
      let columnIndex = 0
      for (const cellNode of helpers.ensureArray(rowNode?.content)) {
        const colspan = parseSpan(cellNode?.attrs?.colspan)
        const explicitWidths = helpers.ensureArray(cellNode?.attrs?.colwidth)

        if (explicitWidths.length > 0) {
          hasExplicitWidth = true
          for (let index = 0; index < colspan; index += 1) {
            const width =
              Number.parseFloat(
                `${explicitWidths[index] || explicitWidths[0] || ''}`,
              ) || 0
            widths[columnIndex + index] = Math.max(
              widths[columnIndex + index],
              width,
            )
          }
        }

        columnIndex += colspan
      }
    }

    if (!hasExplicitWidth) {
      return undefined
    }

    return widths.map((value) => helpers.pxToTwip(value || 120) || 1800)
  }

  const normalizeCellChildren = async (node, options = {}) => {
    const children = []
    const content = helpers.ensureArray(node?.content)

    for (const child of content) {
      if (child?.type === 'table') {
        children.push(await createTable(child))
        continue
      }

      if (child?.type === 'paragraph') {
        children.push(
          await functions.createParagraph(child, {
            alignment: helpers.getParagraphAlignment(
              node?.attrs?.align || child?.attrs?.textAlign,
              context.docx.AlignmentType,
            ),
            run: options.header
              ? {
                  bold: true,
                  color:
                    helpers.parseColorToHex(node?.attrs?.color) ||
                    context.defaultTextColor,
                  size: context.defaultFontSize,
                }
              : undefined,
          }),
        )
        continue
      }

      const blocks = await functions.serializeBlockNode(child)
      for (const block of blocks) {
        if (
          block instanceof context.docx.Paragraph ||
          block instanceof context.docx.Table
        ) {
          children.push(block)
        }
      }
    }

    if (children.length === 0) {
      children.push(new context.docx.Paragraph(''))
    }

    return children
  }

  const createTable = async (node) => {
    const rowNodes = helpers.ensureArray(node?.content)
    const columnCount = Math.max(
      1,
      ...rowNodes.map((rowNode) => getRowColumnCount(rowNode)),
    )
    const columnWidths = getColumnWidths(rowNodes, columnCount)
    const rows = []

    for (const rowNode of rowNodes) {
      const cells = []
      let columnIndex = 0

      for (const cellNode of helpers.ensureArray(rowNode?.content)) {
        cells.push(
          await createTableCell(cellNode, {
            header: cellNode?.type === 'tableHeader',
            columnCount,
            columnIndex,
            columnWidths,
          }),
        )
        columnIndex += parseSpan(cellNode?.attrs?.colspan)
      }
      rows.push(new context.docx.TableRow({ children: cells }))
    }

    return new context.docx.Table({
      rows,
      columnWidths,
      layout: columnWidths
        ? context.docx.TableLayoutType.FIXED
        : context.docx.TableLayoutType.AUTOFIT,
      width: {
        size: 100,
        type: context.docx.WidthType.PERCENTAGE,
      },
    })
  }

  const createTableCell = async (node, options = {}) => {
    const children = await normalizeCellChildren(node, options)
    const shadingFill = helpers.parseColorToHex(node?.attrs?.background)
    const colspan = parseSpan(node?.attrs?.colspan)
    const rowspan = parseSpan(node?.attrs?.rowspan)
    const widthFromGrid =
      options.columnWidths?.length > 0
        ? options.columnWidths
            .slice(options.columnIndex, options.columnIndex + colspan)
            .reduce((sum, value) => sum + value, 0)
        : undefined

    return new context.docx.TableCell({
      children,
      columnSpan: colspan > 1 ? colspan : undefined,
      rowSpan: rowspan > 1 ? rowspan : undefined,
      shading:
        shadingFill || options.header
          ? {
              fill: shadingFill || 'F3F4F6',
            }
          : undefined,
      width: {
        size:
          widthFromGrid ||
          Math.round((100 * colspan) / Math.max(1, options.columnCount || 1)),
        type: widthFromGrid
          ? context.docx.WidthType.DXA
          : context.docx.WidthType.PERCENTAGE,
      },
      verticalAlign: context.docx.VerticalAlign.TOP,
      borders: {
        top: helpers.createBorder(context.docx.BorderStyle.SINGLE, 'D1D5DB', 4),
        right: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          'D1D5DB',
          4,
        ),
        bottom: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          'D1D5DB',
          4,
        ),
        left: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          'D1D5DB',
          4,
        ),
      },
    })
  }

  return {
    createTable,
    createTableCell,
  }
}
