<template>
  <div class="examples">
    <div class="box">
      <umo-editor ref="editorRef" v-bind="options"></umo-editor>
    </div>
    <!-- <div class="box">
      <umo-editor editor-key="testaaa" :toolbar="{ defaultMode: 'classic' }" />
    </div> -->
  </div>
</template>

<script setup>
import { buildAiPrompt, buildAiSystemPrompt } from '@/utils/ai-actions'
import { shortId } from '@/utils/short-id'

const editorRef = $ref(null)
const AI_API_URL = '/api/ai/generate'

const stripCodeFence = (value = '') => {
  return value
    .trim()
    .replace(/^```(?:json|html)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

const isEscapedQuote = (value = '', index = 0) => {
  let slashCount = 0
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (value[cursor] !== '\\') {
      break
    }
    slashCount += 1
  }
  return slashCount % 2 === 1
}

const repairJsonString = (value = '') => {
  let result = ''
  let inString = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const next = value[index + 1]

    if (char === '"' && !isEscapedQuote(value, index)) {
      inString = !inString
      result += char
      continue
    }

    if (!inString || char !== '\\') {
      result += char
      continue
    }

    const isValidEscape =
      next === '"' ||
      next === '\\' ||
      next === '/' ||
      next === 'b' ||
      next === 'f' ||
      next === 'n' ||
      next === 'r' ||
      next === 't' ||
      next === 'u'

    result += isValidEscape ? char : '\\\\'
  }

  return result
}

const tryParseJson = (value = '') => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const parseAiJson = (value = '') => {
  const normalized = stripCodeFence(value)
  if (!normalized) {
    return null
  }
  const attempts = [normalized]
  const start = normalized.indexOf('{')
  const end = normalized.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    attempts.push(normalized.slice(start, end + 1))
  }
  for (const item of attempts) {
    const direct = tryParseJson(item)
    if (direct) {
      return direct
    }
    const repaired = tryParseJson(repairJsonString(item))
    if (repaired) {
      return repaired
    }
  }
  return null
}

const looksLikeAiJson = (value = '') => {
  const normalized = stripCodeFence(value)
  if (!normalized.startsWith('{')) {
    return false
  }
  return /"(message|actions|action|content|html|text)"/.test(normalized)
}

const parseAiError = async (response) => {
  try {
    const data = await response.json()
    return data.message || data.error || `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

const callLocalAiService = async (payload) => {
  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: buildAiPrompt(payload),
      system: buildAiSystemPrompt(),
      temperature: 0.6,
      maxOutputTokens: 12000,
    }),
  })

  if (!response.ok) {
    throw new Error(await parseAiError(response))
  }

  const data = await response.json()
  const parsed = parseAiJson(data.text || '')
  const hasSelection = !!payload.selection.text?.trim()
  const scope =
    payload.scope === 'selection' && hasSelection ? 'selection' : 'document'

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.actions) || parsed.action) {
      return parsed
    }
    if (
      parsed.chart ||
      parsed.chartOptions ||
      parsed.options ||
      parsed.option
    ) {
      return {
        message:
          parsed.message ||
          (scope === 'selection'
            ? '已根据当前选区插入图表。'
            : '已在文档中插入图表。'),
        actions: [
          {
            type: 'insert_echarts',
            target: scope,
            chart: parsed.chart || parsed,
          },
        ],
      }
    }
    if (
      parsed.content !== undefined ||
      parsed.html !== undefined ||
      parsed.text !== undefined
    ) {
      return {
        message:
          parsed.message ||
          (scope === 'selection'
            ? '已通过本地 AI 服务完成选区修改。'
            : '已通过本地 AI 服务完成全文修改。'),
        actions: [
          {
            type: scope === 'selection' ? 'replace_selection' : 'replace_document',
            content: parsed.content ?? parsed.html ?? parsed.text,
            format:
              parsed.format ||
              (parsed.html !== undefined ? 'html' : 'text'),
          },
        ],
      }
    }
    return parsed
  }

  const content = stripCodeFence(data.text || '')
  if (looksLikeAiJson(content)) {
    throw new Error('AI 返回了无法解析的 JSON，请重试。')
  }
  const isHtml = content.startsWith('<')

  return {
    message:
      scope === 'selection'
        ? '已通过本地 AI 服务完成选区修改。'
        : '已通过本地 AI 服务完成全文修改。',
    actions: [
      {
        type: scope === 'selection' ? 'replace_selection' : 'replace_document',
        content,
        format: isHtml ? 'html' : 'text',
      },
    ],
  }
}

const templates = [
  {
    title: '工作任务',
    description: '工作任务模板',
    content:
      '<h1>工作任务</h1><h3>任务名称：</h3><p>[任务的简短描述]</p><h3>负责人：</h3><p>[执行任务的个人姓名]</p><h3>截止日期：</h3><p>[任务需要完成的日期]</p><h3>任务详情：</h3><ol><li>[任务步骤1]</li><li>[任务步骤2]</li><li>[任务步骤3]...</li></ol><h3>目标：</h3><p>[任务需要达成的具体目标或结果]</p><h3>备注：</h3><p>[任何额外信息或注意事项]</p>',
  },
  {
    title: '工作周报',
    description: '工作周报模板',
    content:
      '<h1>工作周报</h1><h2>本周工作总结</h2><hr /><h3>已完成工作：</h3><ul><li>[任务1名称]：[简要描述任务内容及完成情况]</li><li>[任务2名称]：[简要描述任务内容及完成情况]</li><li>...</li></ul><h3>进行中工作：</h3><ul><li>[任务1名称]：[简要描述任务当前进度和下一步计划]</li><li>[任务2名称]：[简要描述任务当前进度和下一步计划]</li><li>...</li></ul><h3>问题与挑战：</h3><ul><li>[问题1]：[描述遇到的问题及当前解决方案或需要的支持]</li><li>[问题2]：[描述遇到的问题及当前解决方案或需要的支持]</li><li>...</li></ul><hr /><h2>下周工作计划</h2><h3>计划开展工作：</h3><ul><li>[任务1名称]：[简要描述下周计划开始的任务内容]</li><li>[任务2名称]：[简要描述下周计划开始的任务内容]</li><li>...</li></ul><h3>需要支持与资源：</h3><ul><li>[资源1]：[描述需要的资源或支持]</li><li>[资源2]：[描述需要的资源或支持]</li><li>...</li></ul>',
  },
]
const options = $ref({
  // theme: 'auto',
  // skin: 'modern',
  toolbar: {
    // defaultMode: 'classic',
    // menus: ['base'],
  },
  document: {
    title: '测试文档',
    content: localStorage.getItem('document.content') || '<p>测试文档</p>',
    // structure: 'heading block*',
  },
  page: {
    layouts: ['page', 'web'],
    showBookmark: true,
  },
  ai: {
    enabled: true,
    showConfigTip: false,
    async onChat(payload) {
      return await callLocalAiService(payload)
    },
  },
  templates,
  cdnUrl: 'https://cdn.umodoc.com',
  shareUrl: 'https://www.umodoc.com',
  file: {
    // allowedMimeTypes: [
    //   'application/pdf',
    //   'image/svg+xml',
    //   'video/mp4',
    //   'audio/*',
    // ],
  },
  user: {
  },
  users: [
  ],
  // https://dev.umodoc.com/cn/docs/options/extensions#disableextensions
  disableExtensions: [],
  async onSave(content, page, document) {
    // 将文档和评论线程保存到 localStorage
    localStorage.setItem('document.content', content.html)
    // 模拟保存等待过程
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('onSave', { content, page, document })
        resolve('文档保存成功')
      }, 2000)
    })
  },
  async onFileUpload(file) {
    if (!file) {
      throw new Error('没有找到要上传的文件')
    }
    console.log('onUpload', file)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    return {
      id: shortId(),
      url: file.url || URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
    }
  },
  onFileDelete(id, url, type) {
    console.log(id, url, type)
  },
})
</script>

<style>
html,
body {
  padding: 0;
  margin: 0;
}
.examples {
  margin: 20px;
  display: flex;
  height: calc(100vh - 40px);
}
.box {
  border: solid 1px #ddd;
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: 100%;
}

html,
body {
  height: 100vh;
  overflow: hidden;
}
</style>
