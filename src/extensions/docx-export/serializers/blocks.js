export const createBlockSerializers = (runtime) => {
  const { context, helpers, functions } = runtime

  const getHorizontalRuleStyle = (value) => {
    switch (`${value || ''}`.toLowerCase()) {
      case 'double':
      case 'double-bold-top':
      case 'double-bold-bottom':
        return context.docx.BorderStyle.DOUBLE
      case 'dotted':
        return context.docx.BorderStyle.DOTTED
      case 'dashed':
      case 'dashed-double':
        return context.docx.BorderStyle.DASHED
      case 'wavy':
        return context.docx.BorderStyle.WAVE
      case 'signle-bold':
        return context.docx.BorderStyle.THICK
      case 'single':
      case 'signle':
      default:
        return context.docx.BorderStyle.SINGLE
    }
  }

  const createTextRunsFromString = (text, runOptions = {}) => {
    const parts = `${text || ''}`.split('\n')
    const children = []

    parts.forEach((part, index) => {
      if (index > 0) {
        children.push(functions.createTextRun({ break: 1 }))
      }
      children.push(
        functions.createTextRun({
          text: part,
          ...runOptions,
        }),
      )
    })

    return children.length > 0
      ? children
      : [functions.createTextRun({ text: '' })]
  }

  const createPlainParagraph = (
    text,
    paragraphOptions = {},
    runOptions = {},
  ) => {
    return new context.docx.Paragraph({
      children: createTextRunsFromString(text, runOptions),
      ...paragraphOptions,
    })
  }

  const createPlainParagraphs = (
    text,
    paragraphOptions = {},
    runOptions = {},
  ) => {
    const chunks = `${text || ''}`
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (chunks.length === 0) {
      return [createPlainParagraph('', paragraphOptions, runOptions)]
    }

    return chunks.map((chunk) =>
      createPlainParagraph(chunk, paragraphOptions, runOptions),
    )
  }

  const createBorderlessTableBorders = () => {
    const border = helpers.createBorder(
      context.docx.BorderStyle.NIL,
      'FFFFFF',
      0,
    )
    return {
      top: border,
      right: border,
      bottom: border,
      left: border,
      insideHorizontal: border,
      insideVertical: border,
    }
  }

  const createCodeBlock = async (node) => {
    const language = `${node?.attrs?.language || ''}`.trim()
    const text = helpers.getNodeText(node)
    const marginSpacing = helpers.readMarginSpacing(node?.attrs?.margin)

    return new context.docx.Paragraph({
      children: [
        ...(language
          ? [
              functions.createTextRun({
                text: `${language}\n`,
                bold: true,
                font: 'Consolas',
              }),
            ]
          : []),
        ...createTextRunsFromString(text, {
          font: 'Consolas',
        }),
      ],
      spacing: {
        before: marginSpacing.before ?? 120,
        after: marginSpacing.after ?? 120,
      },
      shading: {
        fill: 'F5F5F5',
      },
      border: {
        left: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          'E5E7EB',
          8,
        ),
      },
    })
  }

  const createHorizontalRule = (node) => {
    const marginSpacing = helpers.readMarginSpacing(node?.attrs?.margin)
    return new context.docx.Paragraph({
      border: {
        bottom: helpers.createBorder(
          getHorizontalRuleStyle(node?.attrs?.['data-type']),
          helpers.parseColorToHex(node?.attrs?.color) || 'BFBFBF',
          8,
        ),
      },
      spacing: {
        before: marginSpacing.before ?? 120,
        after: marginSpacing.after ?? 120,
      },
    })
  }

  const createPageBreak = () => {
    return new context.docx.Paragraph({
      children: [new context.docx.PageBreak()],
    })
  }

  const createMathParagraph = async (node) => {
    const marginSpacing = helpers.readMarginSpacing(node?.attrs?.margin)
    const mathObject = await helpers.resolveDocxMath(node?.attrs?.latex)
    console.log("公式",mathObject);
    
    if (mathObject) {
      return new context.docx.Paragraph({
        children: [mathObject],
        alignment: context.docx.AlignmentType.CENTER,
        spacing: {
          before: marginSpacing.before ?? 120,
          after: marginSpacing.after ?? 120,
        },
      })
    }

    const image = await helpers.resolveMathData(node?.attrs?.latex, {
      displayMode: true,
      fontSizePx: Math.max(16, Math.round(context.defaultFontSize / 1.5) + 2),
    })
    if (image?.data?.length) {
      const fitted = helpers.fitImageToPage(
        image.width,
        image.height,
        context.pageContentWidthPx,
      )

      return new context.docx.Paragraph({
        children: [
          new context.docx.ImageRun({
            type: 'png',
            data: image.data,
            transformation: fitted,
          }),
        ],
        alignment: context.docx.AlignmentType.CENTER,
        spacing: {
          before: marginSpacing.before ?? 120,
          after: marginSpacing.after ?? 120,
        },
      })
    }

    return new context.docx.Paragraph({
      children: [
        context.docx.Math && context.docx.MathRun
          ? new context.docx.Math({
              children: [new context.docx.MathRun(node?.attrs?.latex || '')],
            })
          : functions.createTextRun({
              text: node?.attrs?.latex || '',
              italics: true,
            }),
      ],
      alignment: context.docx.AlignmentType.CENTER,
      spacing: {
        before: marginSpacing.before ?? 120,
        after: marginSpacing.after ?? 120,
      },
    })
  }

  const createTableOfContents = (node) => {
    return new context.docx.TableOfContents(
      node?.attrs?.text ||
        node?.attrs?.title ||
        context.options?.tocTitle ||
        'Table of Contents',
      {
        beginDirty: true,
        headingStyleRange: '1-6',
        hyperlink: true,
        preserveTabInEntries: true,
        useAppliedParagraphOutlineLevel: true,
      },
    )
  }

  const createCalloutBlocks = async (node) => {
    const blocks = []
    const children = helpers.ensureArray(node?.content)
    const fill =
      helpers.parseColorToHex(node?.attrs?.backgroundColor) || 'E5F0FF'
    const border = {
      left: helpers.createBorder(context.docx.BorderStyle.SINGLE, '9BB8E8', 16),
    }

    for (const [index, child] of children.entries()) {
      if (child?.type !== 'paragraph') {
        blocks.push(...(await functions.serializeBlockNode(child)))
        continue
      }

      const prefixChildren =
        index === 0 && node?.attrs?.icon
          ? [
              new context.docx.TextRun({
                text: `${node.attrs.icon} `,
                size: context.defaultFontSize,
                color: context.defaultTextColor,
              }),
            ]
          : undefined

      blocks.push(
        await functions.createParagraph(child, {
          border,
          shading: { fill },
          prefixChildren,
        }),
      )
    }

    if (blocks.length === 0) {
      blocks.push(
        new context.docx.Paragraph({
          children: [
            new context.docx.TextRun({
              text: node?.attrs?.icon || '',
              color: context.defaultTextColor,
              size: context.defaultFontSize,
            }),
          ],
          border,
          shading: { fill },
        }),
      )
    }

    return blocks
  }

  const createTextBoxBlock = async (node) => {
    return await functions.createParagraph(node, {
      border: {
        top: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          helpers.parseColorToHex(node?.attrs?.borderColor) || '000000',
        ),
        right: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          helpers.parseColorToHex(node?.attrs?.borderColor) || '000000',
        ),
        bottom: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          helpers.parseColorToHex(node?.attrs?.borderColor) || '000000',
        ),
        left: helpers.createBorder(
          context.docx.BorderStyle.SINGLE,
          helpers.parseColorToHex(node?.attrs?.borderColor) || '000000',
        ),
      },
      shading: helpers.parseColorToHex(node?.attrs?.backgroundColor)
        ? { fill: helpers.parseColorToHex(node?.attrs?.backgroundColor) }
        : undefined,
      spacing: {
        before: 120,
        after: 120,
      },
    })
  }

  const createHeadingBlock = async (node) => {
    const level = helpers.clamp(
      Number.parseInt(`${node?.attrs?.level || 1}`, 10),
      1,
      6,
    )
    const headingKey = context.docx.HeadingLevel[`HEADING_${level}`]
    const headingStyle = context.headingStyles?.[level] || {}
    const headingRun = {
      bold: headingStyle.bold !== false,
      color: headingStyle.color || context.defaultTextColor,
      size:
        headingStyle.size ||
        helpers.fontSizeToHalfPoints(node?.attrs?.fontSize) ||
        [32, 28, 24, 22, 20, 18][level - 1],
      ...(headingStyle.font ? { font: headingStyle.font } : {}),
    }
    return await functions.createParagraph(node, {
      heading: headingKey,
      run: headingRun,
      runDefaults: headingRun,
      useDefaultIndent: false,
    })
  }

  const createBlockquoteBlocks = async (node) => {
    const blocks = []
    const border = {
      left: helpers.createBorder(context.docx.BorderStyle.SINGLE, 'CBD5E1', 16),
    }
    const indent = { left: 360 }

    for (const child of helpers.ensureArray(node?.content)) {
      if (child?.type === 'paragraph') {
        blocks.push(
          await functions.createParagraph(child, {
            border,
            indent,
          }),
        )
        continue
      }
      blocks.push(...(await functions.serializeBlockNode(child)))
    }

    return blocks
  }

  const createDetailsBlocks = async (node) => {
    const blocks = []

    for (const child of helpers.ensureArray(node?.content)) {
      if (child?.type === 'detailsSummary') {
        blocks.push(
          await functions.createParagraph(child, {
            prefixChildren: [
              functions.createTextRun({
                text: '▸ ',
                bold: true,
              }),
            ],
            run: {
              bold: true,
              color: context.defaultTextColor,
              size: context.defaultFontSize,
            },
          }),
        )
        continue
      }

      if (child?.type === 'detailsContent') {
        for (const contentChild of helpers.ensureArray(child?.content)) {
          if (contentChild?.type === 'paragraph') {
            blocks.push(
              await functions.createParagraph(contentChild, {
                indent: { left: 360 },
              }),
            )
            continue
          }
          blocks.push(...(await functions.serializeBlockNode(contentChild)))
        }
        continue
      }

      blocks.push(...(await functions.serializeBlockNode(child)))
    }

    return blocks
  }

  const createColumnBlocks = async (node) => {
    const columns = helpers.ensureArray(node?.content)
    if (columns.length === 0) {
      return []
    }

    const cells = []

    for (const column of columns) {
      const cellChildren = []

      for (const child of helpers.ensureArray(column?.content)) {
        const blocks = await functions.serializeBlockNode(child)
        for (const block of blocks) {
          if (
            block instanceof context.docx.Paragraph ||
            block instanceof context.docx.Table
          ) {
            cellChildren.push(block)
          }
        }
      }

      if (cellChildren.length === 0) {
        cellChildren.push(new context.docx.Paragraph(''))
      }

      cells.push(
        new context.docx.TableCell({
          children: cellChildren,
          width: {
            size: 100 / columns.length,
            type: context.docx.WidthType.PERCENTAGE,
          },
        }),
      )
    }

    return [
      new context.docx.Table({
        rows: [new context.docx.TableRow({ children: cells })],
        width: {
          size: 100,
          type: context.docx.WidthType.PERCENTAGE,
        },
        borders: createBorderlessTableBorders(),
        layout: context.docx.TableLayoutType.FIXED,
      }),
    ]
  }

  const createAiBlocks = async (node) => {
    const title = node?.attrs?.title || 'AI'
    const prompt = `${node?.attrs?.prompt || ''}`.trim()
    const response =
      `${node?.attrs?.response || ''}`.trim() ||
      `${node?.attrs?.summary || ''}`.trim() ||
      `${node?.attrs?.error || ''}`.trim()

    const blocks = [
      createPlainParagraph(
        title,
        {
          spacing: {
            before: 120,
            after: 60,
          },
          border: {
            left: helpers.createBorder(
              context.docx.BorderStyle.SINGLE,
              'C7D2FE',
              12,
            ),
          },
          shading: {
            fill: 'EEF2FF',
          },
        },
        {
          bold: true,
        },
      ),
    ]

    if (prompt) {
      blocks.push(
        ...createPlainParagraphs(
          prompt,
          {
            border: {
              left: helpers.createBorder(
                context.docx.BorderStyle.SINGLE,
                'C7D2FE',
                12,
              ),
            },
            shading: {
              fill: 'EEF2FF',
            },
          },
          {},
        ),
      )
    }

    if (response) {
      blocks.push(
        ...createPlainParagraphs(
          response,
          {
            border: {
              left: helpers.createBorder(
                context.docx.BorderStyle.SINGLE,
                'C7D2FE',
                12,
              ),
            },
            shading: {
              fill: 'EEF2FF',
            },
          },
          {},
        ),
      )
    }

    return blocks
  }

  const createMediaBlocks = async (node) => {
    switch (node?.type) {
      case 'image':
      case 'echarts': {
        const imageParagraph = await functions.createImageParagraph(node)
        if (imageParagraph) {
          return [imageParagraph]
        }

        const fallback =
          node?.attrs?.describe ||
          node?.attrs?.name ||
          node?.attrs?.src ||
          'Image'
        return [createPlainParagraph(fallback)]
      }
      case 'file': {
        if (node?.attrs?.src) {
          const imageParagraph = await functions.createImageParagraph(node)
          if (imageParagraph) {
            return [imageParagraph]
          }
        }

        return [
          functions.createLinkParagraph(
            node?.attrs?.name || node?.attrs?.url || 'File',
            node?.attrs?.url || node?.attrs?.src,
          ),
        ]
      }
      case 'video':
      case 'audio':
      case 'iframe':
        return [
          functions.createLinkParagraph(
            node?.attrs?.name || node?.attrs?.src || 'Media',
            node?.attrs?.src,
          ),
        ]
      default:
        return []
    }
  }

  const serializeCustomContainer = async (node) => {
    const blocks = []
    for (const child of helpers.ensureArray(node?.content)) {
      blocks.push(...(await functions.serializeBlockNode(child)))
    }
    return blocks
  }

  const serializeFallbackBlock = async (node) => {
    if (helpers.ensureArray(node?.content).length > 0) {
      const hasInline = helpers
        .ensureArray(node.content)
        .every((child) => child?.type === 'text' || child?.type === 'hardBreak')
      if (hasInline) {
        return [await functions.createParagraph(node)]
      }
      return await serializeCustomContainer(node)
    }

    const text =
      helpers.pickFirstText(node, ['text', 'label', 'name', 'content']) ||
      helpers.getNodeText(node)
    if (!text) {
      return []
    }

    return [
      new context.docx.Paragraph({
        children: [
          new context.docx.TextRun({
            text,
            color: context.defaultTextColor,
            size: context.defaultFontSize,
          }),
        ],
      }),
    ]
  }

  const serializeBlockNode = async (node, state = {}) => {
    switch (node?.type) {
      case 'paragraph':
        return [await functions.createParagraph(node)]
      case 'heading':
        return [await createHeadingBlock(node)]
      case 'bulletList':
      case 'orderedList':
      case 'taskList':
        return await functions.serializeList(node, {
          level: state.listLevel || 0,
        })
      case 'table':
        return [await functions.createTable(node)]
      case 'image':
      case 'echarts':
      case 'file':
      case 'video':
      case 'audio':
      case 'iframe':
        return await createMediaBlocks(node)
      case 'codeBlock':
        return [await createCodeBlock(node)]
      case 'horizontalRule':
        return [createHorizontalRule(node)]
      case 'pageBreak':
        return [createPageBreak()]
      case 'blockquote':
        return await createBlockquoteBlocks(node)
      case 'blockMath':
        return [await createMathParagraph(node)]
      case 'callout':
        return await createCalloutBlocks(node)
      case 'textBox':
        return [await createTextBoxBlock(node)]
      case 'details':
        return await createDetailsBlocks(node)
      case 'detailsContent':
      case 'columnContainer':
      case 'column':
      case 'columns':
      case 'columnBlock':
        if (node?.type === 'columnContainer') {
          return await createColumnBlocks(node)
        }
        return await serializeCustomContainer(node)
      case 'detailsSummary':
        return [
          await functions.createParagraph(node, {
            run: {
              bold: true,
              color: context.defaultTextColor,
              size: context.defaultFontSize,
            },
          }),
        ]
      case 'toc':
        return [createTableOfContents(node)]
      case 'ai':
        return await createAiBlocks(node)
      case 'footnotes':
      case 'footnote':
        return []
      default:
        return await serializeFallbackBlock(node)
    }
  }

  const serializeDocumentChildren = async (json) => {
    const blocks = []
    for (const node of helpers.getDocumentContent(json)) {
      if (node?.type === 'footnotes') {
        continue
      }
      blocks.push(...(await serializeBlockNode(node)))
    }
    return blocks
  }

  const serializeFootnoteDefinitions = async () => {
    const footnotes = {}

    for (const [fnId, reference] of context.footnotes.references.entries()) {
      const footnoteNode = context.getFootnoteNode(fnId)
      const children = []

      for (const child of helpers.ensureArray(footnoteNode?.content)) {
        const blocks = await serializeBlockNode(child)
        for (const block of blocks) {
          if (block instanceof context.docx.Paragraph) {
            children.push(block)
          }
        }
      }

      if (children.length === 0) {
        children.push(createPlainParagraph(reference?.caption || '', {}, {}))
      }

      footnotes[reference.id] = { children }
    }

    return footnotes
  }

  return {
    serializeBlockNode,
    serializeDocumentChildren,
    serializeFootnoteDefinitions,
  }
}
