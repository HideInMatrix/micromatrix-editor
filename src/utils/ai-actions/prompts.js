import {
  AI_RESPONSE_OUTPUT_SCHEMA,
  formatAiAttachmentPromptLine,
  getAiAttachmentMetas,
  resolveAiOptionValue,
} from './shared'

export const resolveAiOutputSchema = (config = {}, payload = {}) => {
  const schema = resolveAiOptionValue(
    config.outputSchema,
    payload,
    AI_RESPONSE_OUTPUT_SCHEMA,
  )
  if (!schema) {
    return null
  }
  if (typeof schema === 'string') {
    return schema.trim() || null
  }
  if (typeof schema === 'object') {
    return schema
  }
  return null
}

export const buildAiSystemPrompt = () => {
  return [
    '你是一个富文本编辑器的文档改写助手。',
    '你的任务是根据用户要求修改文档，或者生成可以直接插入文档的节点。',
    '你必须只返回 JSON，不要返回 Markdown 代码块，不要返回解释，不要返回前后说明。',
    '返回格式必须是：{"message":"给用户的简短说明","actions":[...]}。',
    'actions 支持以下类型：',
    '1. replace_document: 用新的完整 HTML 替换全文，字段包含 type、content、format。',
    '2. replace_selection: 用 HTML 替换当前选区，字段包含 type、content、format。',
    '3. insert_echarts: 插入 ECharts 图表节点，字段包含 type、target、chart。chart 优先提供可直接渲染的 chartOptions；如果图表涉及统计分析，可使用 ECharts dataset + echarts-stat transform。',
    '4. insert_math: 插入公式节点，字段包含 type、target、math。math 可以是 LaTeX 字符串，或对象 { latex, displayMode }。',
    '5. insert_mermaid: 插入 Mermaid 节点，字段包含 type、target、mermaid。mermaid 可以是字符串源码，或对象 { content, config, width, height }。',
    '6. insert_diagrams: 插入流程图节点，字段包含 type、target、diagram。diagram 需要提供可直接显示的 src，建议同时提供 content、width、height。',
    '7. insert_footnote: 插入脚注引用，字段包含 type、target、footnote。footnote 可以是字符串，或对象 { content, format, caption }。',
    '8. insert_citation_with_footnote: 插入正文引用并自动附带脚注，字段包含 type、target、citation、footnote。citation 用于正文显示，footnote 用于脚注内容。',
    '如果用户要求“生成图表/可视化/趋势图/柱状图/饼图/折线图”，优先返回 insert_echarts。',
    '如果图表需要回归线、趋势拟合、直方图分箱、聚类分析等统计能力，优先使用 echarts-stat，并在 chart.chartOptions 中使用 dataset/transform 描述，例如 ecStat:regression、ecStat:histogram、ecStat:clustering。',
    "echarts-stat 的 transform.type 必须把 ecStat:regression 当作一个完整字符串值。等价写法示例是 transform: { type: 'ecStat:regression', config: { method: 'linear', dimensions: [0, 2] } }。",
    '如果最终返回的是 JSON，对应写法必须是 {"transform":{"type":"ecStat:regression","config":{"method":"linear","dimensions":[0,2]}}}。',
    '不要把 ecStat 单独当作 key 或单独加引号，不要写成 ""ecStat":regression"、"ecStat":"regression" 或其他非法结构。',
    '使用 echarts-stat 时，不要输出伪代码或额外脚本，只返回可直接给 ECharts 使用的 JSON options。',
    '如果用户要求插入公式、数学表达式、LaTeX，请返回 insert_math，并提供合法 LaTeX。',
    '如果用户要求补充注释、参考说明、尾注样式说明，且适合脚注呈现，请返回 insert_footnote。',
    '如果用户要求把来源、出处、参考文献拆成正文引用 + 脚注说明，优先返回 insert_citation_with_footnote。',
    '不要把独立公式作为普通文本写进 replace_document 或 replace_selection 的 content 里，除非用户明确要求保留 LaTeX 原文。',
    '如果公式必须出现在文本改写内容中，行内公式请用 $...$ 包裹，独立公式请用 $$...$$ 包裹。',
    '如果用户要求插入流程图、时序图、类图、状态图、甘特图，优先返回 insert_mermaid，并提供合法 Mermaid 源码。',
    '只有当你能提供可直接渲染的 diagrams 数据时，才使用 insert_diagrams；否则优先使用 insert_mermaid。',
    '如果用户既要求改写文档又要求插入节点，可以返回多个 actions，按执行顺序排列。',
    '文本改写时保留原有标题、列表、表格、强调等结构，除非用户明确要求调整。',
    '除 JSON 外不要输出任何其他内容。',
  ].join('\n')
}

export const buildAiPrompt = ({
  prompt,
  scope,
  selection = {},
  document = {},
  attachments = [],
}) => {
  const hasSelection = selection.empty === false || !!selection.text?.trim()
  const effectiveScope = scope === 'selection' && hasSelection ? '选区' : '全文'
  const attachmentMetas = getAiAttachmentMetas({ attachments })

  return [
    `用户要求：${prompt}`,
    '',
    `修改范围：${effectiveScope}`,
    hasSelection
      ? `当前选区文本：\n${selection.text.trim()}`
      : '当前没有有效选区，请基于全文处理。',
    '',
    '请根据用户要求返回前面约定的 JSON。',
    '如果只是文本改写，请返回 replace_document 或 replace_selection。',
    '如果需要在文档中展示 ECharts 图表，请返回 insert_echarts，并提供可直接渲染的 chartOptions。',
    '如果图表包含回归分析、分布直方图、聚类结果、趋势拟合等统计计算，请优先使用 echarts-stat 的 transform 能力，按 ECharts dataset + transform 结构返回 chartOptions。',
    "在 ECharts 配置对象里，正确概念写法是 type: 'ecStat:regression'、type: 'ecStat:histogram'、type: 'ecStat:clustering'。",
    '如果最终返回的是 JSON，则必须序列化成 "type":"ecStat:regression" 这种完整字符串，不要把 ecStat 和 regression 拆开。',
    '示例：{"dataset":[{"source":[[1,2],[2,4]]},{"transform":{"type":"ecStat:regression","config":{"method":"linear","dimensions":[0,1]}}}]}',
    '如果需要插入公式，请返回 insert_math，并提供合法 LaTeX；独立公式优先使用 displayMode=true，不要把独立公式当普通文本返回。',
    '如果公式必须出现在文本内容里，行内公式请写成 $...$，独立公式请写成 $$...$$。',
    '如果需要插入流程图、时序图、类图或其他 Mermaid 图，请返回 insert_mermaid，并提供合法 Mermaid 源码。',
    '如果确实要输出 diagrams 节点，请返回 insert_diagrams，并确保 diagram.src 可直接展示；做不到时请改用 insert_mermaid。',
    '如果需要给当前内容补充脚注说明、来源备注或补充解释，请返回 insert_footnote，并提供 footnote.content 或 footnote.caption。',
    '如果需要把引用来源拆成正文引用和脚注解释，请返回 insert_citation_with_footnote，并同时提供 citation 与 footnote。',
    '图表或图形的数据请优先从当前选区文本、全文文本、表格或列表中提取；如果数据不完整，可以做合理补全，但要保证节点可展示。',
    '如果是选区修改，只调整选区相关内容，文档其他部分保持原状。',
    ...(attachmentMetas.length > 0
      ? [
          '',
          '当前还附带了以下文件，请结合文件名、类型和大小理解任务；如果服务端支持读取附件内容，也请一并参考附件。',
          '<attachments>',
          ...attachmentMetas.map((attachment, index) =>
            formatAiAttachmentPromptLine(attachment, index),
          ),
          '</attachments>',
        ]
      : []),
    '',
    '<current-document-text>',
    document.text || '',
    '</current-document-text>',
    '',
    '<current-document-html>',
    document.html || '<p></p>',
    '</current-document-html>',
  ].join('\n')
}
