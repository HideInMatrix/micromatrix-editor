export const createInlineSerializers = (runtime) => {
  const { context, helpers } = runtime

  const createTextRun = (options = {}, baseOptions = {}) => {
    return new context.docx.TextRun({
      color: context.defaultTextColor,
      ...(context.defaultFont ? { font: context.defaultFont } : {}),
      size: context.defaultFontSize,
      ...baseOptions,
      ...options,
    })
  }

  const getBookmarkName = (marks = []) => {
    const bookmark = marks.find(
      (mark) => mark?.type === 'bookmark' && mark?.attrs?.bookmarkName,
    )
    return bookmark?.attrs?.bookmarkName || null
  }

  const stripBookmarkMarks = (marks = []) => {
    return marks.filter((mark) => mark?.type !== 'bookmark')
  }

  const mergeRunOptionsFromMarks = (marks = [], baseOptions = {}) => {
    const options = {
      color: context.defaultTextColor,
      ...(context.defaultFont ? { font: context.defaultFont } : {}),
      size: context.defaultFontSize,
      ...baseOptions,
    }
    let link = null

    marks.forEach((mark) => {
      const attrs = mark?.attrs || {}
      switch (mark?.type) {
        case 'bold':
          options.bold = true
          break
        case 'italic':
          options.italics = true
          break
        case 'underline':
          options.underline = {
            type: context.docx.UnderlineType.SINGLE,
          }
          break
        case 'strike':
          options.strike = true
          break
        case 'subscript':
          options.subScript = true
          break
        case 'superscript':
          options.superScript = true
          break
        case 'code':
          options.font = 'Consolas'
          options.shading = { fill: 'F3F4F6' }
          break
        case 'link':
          link = attrs.href || null
          options.color = '0563C1'
          options.underline = {
            type: context.docx.UnderlineType.SINGLE,
          }
          break
        case 'textStyle':
          options.color = helpers.parseColorToHex(attrs.color) || options.color
          options.size =
            helpers.fontSizeToHalfPoints(attrs.fontSize) || options.size
          options.font = attrs.fontFamily || options.font
          if (attrs.backgroundColor) {
            const fill = helpers.parseColorToHex(attrs.backgroundColor)
            if (fill) {
              options.shading = { fill }
            }
          }
          break
        case 'letterSpacing': {
          const spacing = Number.parseFloat(
            `${attrs.spacing || ''}`.replace(/px$/i, ''),
          )
          if (Number.isFinite(spacing)) {
            options.characterSpacing = Math.round(spacing * 20)
          }
          break
        }
        default:
          break
      }
    })

    return { link, options }
  }

  const wrapLinkChild = (child, href) => {
    if (!href) {
      return child
    }

    if (href.startsWith('#')) {
      return new context.docx.InternalHyperlink({
        anchor: context.resolveInternalAnchor(href),
        children: [child],
      })
    }

    return new context.docx.ExternalHyperlink({
      link: href,
      children: [child],
    })
  }

  const createInlineText = async (
    node,
    marks = node?.marks,
    baseOptions = {},
  ) => {
    const text = node?.text || ''
    if (!text) {
      return []
    }

    const { link, options } = mergeRunOptionsFromMarks(marks, baseOptions)
    const run = createTextRun({
      text,
      ...options,
    })

    return [wrapLinkChild(run, link)]
  }

  const createImageRun = async (node) => {
    const attrs = node?.attrs || {}

    try {
      const transformation = helpers.buildImageTransformation(attrs)
      const image = attrs.src
        ? await helpers.resolveImageData(
            attrs.src,
            transformation.width,
            transformation.height,
          )
        : node?.type === 'echarts'
          ? await helpers.resolveChartData(
              node,
              context.editor,
              context.pageContentWidthPx,
            )
          : null
      if (!image?.data?.length) {
        return []
      }

      const fitted = helpers.fitImageToPage(
        transformation.width || image.width,
        transformation.height || image.height,
        context.pageContentWidthPx,
      )

      return [
        new context.docx.ImageRun({
          type: image.type === 'svg+xml' ? 'svg' : image.type,
          data: image.data,
          transformation: {
            width: fitted.width || helpers.DEFAULT_IMAGE_WIDTH,
            height: fitted.height || helpers.DEFAULT_IMAGE_HEIGHT,
          },
        }),
      ]
    } catch {
      const fallback = helpers.pickFirstText(node, [
        'name',
        'describe',
        'content',
      ])
      return fallback ? [createTextRun({ text: fallback })] : []
    }
  }

  const createMathChild = async (latex) => {
    const text = `${latex || ''}`.trim()
    if (!text) {
      return createTextRun({ text: '' })
    }

    const mathObject = await helpers.resolveDocxMath(text)
    if (mathObject) {
      return mathObject
    }

    const image = await helpers.resolveMathData(text, {
      displayMode: false,
      fontSizePx: Math.max(14, Math.round(context.defaultFontSize / 1.5)),
    })
    if (image?.data?.length) {
      const fitted = helpers.fitImageToPage(
        image.width,
        image.height,
        context.pageContentWidthPx,
      )
      return new context.docx.ImageRun({
        type: 'png',
        data: image.data,
        transformation: fitted,
      })
    }

    if (context.docx.Math && context.docx.MathRun) {
      return new context.docx.Math({
        children: [new context.docx.MathRun(text)],
      })
    }

    return createTextRun({
      text,
      italics: true,
    })
  }

  const createOptionBoxRuns = (node) => {
    const attrs = node?.attrs || {}
    const items = helpers.ensureArray(attrs.items)
    const target = `${attrs.target || 'checkbox'}`.toLowerCase()
    const children = []

    const appendSeparator = () => {
      if (children.length > 0) {
        children.push(createTextRun({ text: '  ' }))
      }
    }

    const appendCheckbox = (checked, label) => {
      appendSeparator()

      if (context.docx.CheckBox) {
        children.push(
          new context.docx.CheckBox({
            alias: label || undefined,
            checked: Boolean(checked),
          }),
        )
      } else {
        children.push(
          createTextRun({
            text: checked ? '[x]' : '[ ]',
          }),
        )
      }

      if (label) {
        children.push(createTextRun({ text: ` ${label}` }))
      }
    }

    const appendRadio = (checked, label) => {
      appendSeparator()
      children.push(
        createTextRun({
          text: checked ? '◉' : '○',
        }),
      )
      if (label) {
        children.push(createTextRun({ text: ` ${label}` }))
      }
    }

    if (target === 'checkbox' && attrs.checkAll) {
      appendCheckbox(
        attrs.checked,
        context.options?.optionBoxCheckAllLabel || 'Check all',
      )
    }

    items.forEach((item) => {
      const label = `${item?.label || ''}`.trim()
      if (target === 'radio') {
        appendRadio(item?.checked, label)
        return
      }
      appendCheckbox(item?.checked, label)
    })

    return children.length > 0
      ? children
      : [
          createTextRun({
            text: helpers.extractCellText(node),
          }),
        ]
  }

  const createInlineAtomRuns = async (node, baseOptions = {}) => {
    switch (node?.type) {
      case 'inlineImage':
        return await createImageRun(node)
      case 'inlineMath':
        return [await createMathChild(node?.attrs?.latex)]
      case 'footnoteReference': {
        const reference = context.getFootnoteReference(
          node?.attrs?.['data-fn-id'],
        )
        if (reference?.id) {
          return [new context.docx.FootnoteReferenceRun(reference.id)]
        }
        return [
          createTextRun({
            text: `[${node?.attrs?.referenceNumber || '?'}]`,
            superScript: true,
          }, baseOptions),
        ]
      }
      case 'mention':
        return [
          createTextRun({
            text: `@${node?.attrs?.label || node?.attrs?.id || ''}`,
            color: '0563C1',
          }, baseOptions),
        ]
      case 'datetime':
        return [createTextRun({ text: node?.attrs?.text || '' }, baseOptions)]
      case 'tag':
        return [
          createTextRun({
            text: node?.attrs?.text || '',
            color:
              helpers.parseColorToHex(node?.attrs?.color) ||
              context.defaultTextColor,
            shading: helpers.parseColorToHex(node?.attrs?.backgroundColor)
              ? {
                  fill: helpers.parseColorToHex(node?.attrs?.backgroundColor),
                }
              : undefined,
          }, baseOptions),
        ]
      case 'optionBox':
        return createOptionBoxRuns(node)
      default: {
        const text =
          helpers.pickFirstText(node, ['text', 'label', 'name', 'content']) ||
          helpers.getNodeText(node)
        return text ? [createTextRun({ text }, baseOptions)] : []
      }
    }
  }

  const serializeInlineNodes = async (nodes, baseOptions = {}) => {
    const children = []
    let activeBookmarkName = null
    let activeBookmarkChildren = []

    const flushBookmark = () => {
      if (!activeBookmarkName || activeBookmarkChildren.length === 0) {
        activeBookmarkName = null
        activeBookmarkChildren = []
        return
      }

      children.push(
        new context.docx.Bookmark({
          id: context.getBookmarkAnchor(activeBookmarkName),
          children: activeBookmarkChildren,
        }),
      )
      activeBookmarkName = null
      activeBookmarkChildren = []
    }

    for (const node of helpers.ensureArray(nodes)) {
      if (!node) {
        continue
      }

      if (node.type === 'text') {
        const bookmarkName = getBookmarkName(node.marks)
        if (bookmarkName !== activeBookmarkName) {
          flushBookmark()
        }

        const childrenForNode = await createInlineText(
          node,
          stripBookmarkMarks(node.marks),
          baseOptions,
        )
        if (!bookmarkName) {
          children.push(...childrenForNode)
          continue
        }

        activeBookmarkName = bookmarkName
        activeBookmarkChildren.push(...childrenForNode)
        continue
      }

      flushBookmark()

      if (node.type === 'hardBreak') {
        children.push(createTextRun({ break: 1 }, baseOptions))
        continue
      }

      children.push(...(await createInlineAtomRuns(node, baseOptions)))
    }

    flushBookmark()

    return children
  }

  const getParagraphIndent = (node, extras = {}) => {
    const indentLevel = Number.parseInt(`${node?.attrs?.indent || 0}`, 10)
    const firstLine = indentLevel > 0 ? indentLevel * 420 : undefined
    const extraIndent = extras.indent || {}
    const indent = {
      ...extraIndent,
      firstLine: extraIndent.firstLine ?? firstLine,
    }

    Object.keys(indent).forEach((key) => {
      if (indent[key] === undefined || indent[key] === null) {
        delete indent[key]
      }
    })

    return Object.keys(indent).length > 0 ? indent : undefined
  }

  const createParagraph = async (node, extras = {}) => {
    const children = [
      ...helpers.ensureArray(extras.prefixChildren),
      ...(await serializeInlineNodes(node?.content, extras.runDefaults)),
      ...helpers.ensureArray(extras.suffixChildren),
    ]

    if (children.length === 0) {
      children.push(createTextRun({ text: '' }, extras.runDefaults))
    }

    const bookmarkId =
      extras.bookmarkId || node?.attrs?.id || node?.attrs?.['data-toc-id']
    const paragraphChildren =
      bookmarkId && children.length > 0
        ? [
            new context.docx.Bookmark({
              id: context.getBookmarkAnchor(bookmarkId),
              children,
            }),
          ]
        : children

    const spacing = {
      ...(extras.useDefaultSpacing === false
        ? {}
        : context.defaultParagraphSpacing || {}),
      ...helpers.getParagraphSpacing(node?.attrs, context.docx.LineRuleType),
      ...extras.spacing,
    }

    Object.keys(spacing).forEach((key) => {
      if (spacing[key] === undefined || spacing[key] === null) {
        delete spacing[key]
      }
    })

    const paragraphOptions = {
      children: paragraphChildren,
      alignment:
        extras.alignment ||
        helpers.getParagraphAlignment(
          node?.attrs?.textAlign,
          context.docx.AlignmentType,
        ),
      wordWrap:
        node?.attrs?.wordWrap && node.attrs.wordWrap !== 'normal'
          ? true
          : undefined,
      spacing: Object.keys(spacing).length > 0 ? spacing : undefined,
      indent: getParagraphIndent(node, {
        ...extras,
        indent: {
          ...(extras.useDefaultIndent === false
            ? {}
            : context.defaultParagraphIndent || {}),
          ...(extras.indent || {}),
        },
      }),
      border: extras.border,
      shading: extras.shading,
      bullet: extras.bullet,
      numbering: extras.numbering,
      heading: extras.heading,
      pageBreakBefore: extras.pageBreakBefore,
    }

    if (extras.run) {
      paragraphOptions.run = extras.run
    }

    return new context.docx.Paragraph(paragraphOptions)
  }

  const createImageParagraph = async (node) => {
    const imageRuns = await createImageRun(node)
    if (imageRuns.length === 0) {
      return null
    }

    return new context.docx.Paragraph({
      children: imageRuns,
      alignment: helpers.getParagraphAlignment(
        node?.attrs?.nodeAlign === 'flex-start'
          ? 'left'
          : node?.attrs?.nodeAlign === 'flex-end'
            ? 'right'
            : 'center',
        context.docx.AlignmentType,
      ),
      spacing: helpers.readMarginSpacing(node?.attrs?.margin),
    })
  }

  const createLinkParagraph = (label, href) => {
    if (!href) {
      return new context.docx.Paragraph({
        children: [createTextRun({ text: label || '' })],
      })
    }

    const linkRun = createTextRun({
      text: label || href,
      color: '0563C1',
      underline: {
        type: context.docx.UnderlineType.SINGLE,
      },
    })

    return new context.docx.Paragraph({
      children: [wrapLinkChild(linkRun, href)],
    })
  }

  return {
    createImageParagraph,
    createLinkParagraph,
    createParagraph,
    createTextRun,
    serializeInlineNodes,
  }
}
