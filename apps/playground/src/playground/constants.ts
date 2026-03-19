import type { Editor } from "@mxm-editor/core";
import type { CommentsThread } from "@mxm-editor/extension-comments";
import type { MentionItem } from "@mxm-editor/extension-mention";

export const sampleImageUrl =
  `${import.meta.env.BASE_URL}tiptap-placeholder-image.svg`;

export const accentRoseColor = "#d9485f";
export const accentOceanColor = "#2f7cf6";

export const mentionDirectory: MentionItem[] = [
  { id: "team-ava", label: "Ava" },
  { id: "team-lin", label: "Lin" },
  { id: "team-noah", label: "Noah" },
  { id: "team-zoe", label: "Zoe" },
  { id: "team-mika", label: "Mika" },
];

export const initialContent = [
  "<h1>快速开始</h1>",
  '<p>欢迎使用 <em><mark data-color="var(--tt-color-highlight-yellow)" style="background-color: var(--tt-color-highlight-yellow); color: inherit;">mxm-editor 演示场</mark></em> 模板！这一版集中展示 monorepo 里的 <strong>mxm-editor</strong> 包、编辑器命令以及界面模式。</p>',
  '<p>你可以把它当作品牌化起点，用来做功能演示、包验证和面向产品的编辑流程。也可以打开 <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/micromatrix/mxm-editor#readme">mxm-editor README</a>，了解整个工作区的组织方式。</p>',
  "<pre><code>pnpm --filter @mxm-editor/playground dev</code></pre>",
  "<h2>特性速览</h2>",
  "<blockquote><p><em>这是一个专注的富文本工作台，内置 slash 命令、Markdown 快捷语法、浮动菜单，以及 mxm-editor 官方扩展。输入 <code>**</code> 这样的 Markdown 标记，或者使用 <code>⌘+B</code> 之类的快捷键，就能完成绝大多数常见文本格式。</em></p></blockquote>",
  '<p>混合图片、对齐能力和 <mark data-color="var(--tt-color-highlight-blue)" style="background-color: var(--tt-color-highlight-blue); color: inherit;">高级格式</mark>，用真实内容验证产品里的编辑体验，而不只是孤立的编辑器 API。</p>',
  `<img src="${sampleImageUrl}" alt="mxm-editor 预览图" title="mxm-editor 预览图" />`,
  "<ul><li><p><strong>上标</strong> (x<sup>2</sup>) 与 <strong>下标</strong> (H<sub>2</sub>O) 适合更精确的表达。</p></li><li><p><strong>排版替换</strong> 会自动把 <code>-&gt;</code> 转成箭头 <strong>→</strong>。</p></li></ul>",
  '<p><em>→ </em><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/micromatrix/mxm-editor#readme">继续了解 mxm-editor</a></p>',
  "<hr />",
  "<h2>定制你的工作台</h2>",
  "<p>在浅色与深色模式之间切换，用 Tailwind v4 和 UnoCSS 调整外层界面，并把整个编辑器外壳改造成符合 mxm-editor 品牌语气的产品页面。</p>",
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><div><p>体验 mxm-editor 品牌化模板</p></div></li><li data-type="taskItem" data-checked="false"><div><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/micromatrix/mxm-editor#readme">把这套演示页集成到你的应用里</a></p></div></li></ul>',
  "<p></p>",
].join("");

export const sampleMarkdown = [
  "# P0 演示页",
  "",
  "你可以输入 `/` 触发命令菜单，或者在空段落观察浮动菜单。",
  "",
  "> 现在已经支持引用、标题、列表、任务列表、代码块、分隔线和表格的 Markdown 互转。",
  "",
  "- 普通列表项",
  "- 第二个列表项",
  "",
  "- [x] 已完成任务",
  "- [ ] 待处理任务",
  "",
  "```ts",
  "const version = 4",
  "console.log(version)",
  "```",
  "",
  "<p style=\"text-align:center\">这是一段通过 TextAlign 扩展保留的居中文本。</p>",
  "",
  "<p><span style=\"color:#d9485f\">Color 扩展会保留 TextStyle 的行内样式。</span></p>",
  "",
  `![mxm-editor 预览图](${sampleImageUrl} "mxm-editor 预览图")`,
  "",
  "一行文本，下一行是硬换行。  ",
  "还在同一个段落里。",
  "",
  "---",
  "",
  "| 功能 | 状态 | 说明 |",
  "| --- | --- | --- |",
  "| 表格 | 就绪 | 可调整列宽 |",
  "| StarterKit | 就绪 | 更接近官方默认体验 |",
  "",
  "再试试 @mention、*斜体* 和 **加粗**。",
].join("\n");

export const collaborationContent = [
  "## 共享 Y.Doc",
  "",
  "> 左右两个编辑器通过双向桥接同步文档和 awareness 状态，可以同时看到远端光标。",
  "",
  "- [x] 左边改任务状态",
  "- [ ] 右边继续补文档结构",
  "",
  "```ts",
  "console.log('shared doc')",
  "```",
  "",
  "---",
  "",
  "| 侧边 | 能力 |",
  "| --- | --- |",
  "| 左侧 | 编辑共享内容 |",
  "| 右侧 | 观察表格同步 |",
  "",
  "在任意一侧输入 `/tip`、`/quote`、`/bullet`、`/table` 或直接编辑内容，另一侧都会同步。",
].join("\n");

export const commentsDemoContent = [
  "<h1>在上下文里完成审阅</h1>",
  '<p><span data-thread-ids="thread-launch">把讨论直接锚定在句子上</span>，并让 <span data-thread-ids="thread-launch,thread-voice">重叠的审阅意见</span> 随着正文修改一起移动。</p>',
  "<p>选中任意短语，都可以从侧栏开启新的讨论串。已有讨论可以在不离开写作流的情况下继续回复、解决或归档。</p>",
  "<h2>这个演示展示了什么</h2>",
  "<ul><li><p>讨论串元数据保存在 provider 中。</p></li><li><p>行内标记会持续维护文档锚点。</p></li><li><p>同一段文本范围可以挂载多个讨论串 id。</p></li></ul>",
  "<blockquote><p>试着先在编辑器里选中一句话，在侧栏写下一条评论，再在同一段文字上创建一个重叠讨论串。</p></blockquote>",
  "<p></p>",
].join("");

export const pagesDemoContent = [
  "<h1>田野手册总览</h1>",
  "<p>Pages 会把普通富文本文档转换成具有纸张意识的布局：每一个顶层块都会被测量，页面装饰自动插入，页眉和页脚也会始终贴合当前纸张。</p>",
  "<p>这个示例刻意保持较高的信息密度。它混合了标题、长段落、列表以及较宽的块级内容，让你能观察当工作稿开始更像一份真正的文档，而不是一张连续滚动画布时，编辑器的分页行为会如何变化。</p>",
  "<blockquote><p>试着在 A4、Letter 和 Legal 之间切换，再打开奇偶页镜像页眉，感受同一份内容如何立即呈现出不同的阅读节奏。</p></blockquote>",
  "<h2>1. 编辑节奏</h2>",
  "<p>长文档通常会比我们预想得更晚暴露布局问题。在连续编辑器里看起来平衡的一句开场白，等真正出现页边距、页眉和分页缝隙后，可能马上显得拥挤。这也是为什么首页往往需要更安静、更有留白的处理。</p>",
  "<p>当产品团队一起评审复杂材料时，他们也常常会对某个观点落在页面上的具体位置提出反馈。同样一段过渡文字，位于第二页底部时会显得更紧张，移动到第三页顶部时，阅读感受又会完全不同。</p>",
  "<p>镜像页眉能帮助读者在长稿里持续建立方向感，也适合放章节名、节标签、评审阶段或者时间戳，而不会打断正文本身的叙事节奏。</p>",
  "<h2>2. 把布局当作产品反馈</h2>",
  "<p>分页不只是为了打印。合同审阅、制度草拟、教学讲义以及内部知识库，同样需要接近纸张的预览，因为作者可以在文档进入下游流程前，先发现不自然的断页和拥挤的区块。</p>",
  "<p>这也会改变团队给反馈的方式。大家不再只说“这一节有点长”，而会更具体地说“第四页开头需要一个更有力的段落”，或者“这张数据表如果移到附录开头会更好读”。</p>",
  "<ul><li><p>纸张尺寸会直接改变读者感知到的密度。</p></li><li><p>页边距同时影响层级感和呼吸感。</p></li><li><p>页眉和页脚会在长稿中不断提供定位线索。</p></li></ul>",
  "<h2>3. 草稿结构</h2>",
  "<p>你可以把这份文档想象成一份面向上线评审的内部手册。开头几页负责建立问题背景，后续章节收集证据和判断，最后的附录则为需要完整上下文的同学保存参考资料。</p>",
  "<p>随着内容持续增长，页码的可见性会越来越有价值。写作者可以在会议里直接引用具体纸页，设计师也能在不猜测落点的情况下，精细调整垂直节奏。</p>",
  "<p>表格同样是分页布局里很好的压力测试对象，因为它们会快速消耗纵向空间，也会让溢出问题在视觉上变得非常明显。哪怕只是一个轻量原型，只要把表格放进分页框架里，作者就能更快判断它该留在正文还是移到附录。</p>",
  "<table><thead><tr><th><p>章节</p></th><th><p>目的</p></th><th><p>评审提示</p></th></tr></thead><tbody><tr><td><p>开场</p></td><td><p>建立叙事和问题张力。</p></td><td><p>应该安静、留白且易于进入。</p></td></tr><tr><td><p>证据</p></td><td><p>用更具体的材料支撑判断。</p></td><td><p>需要稳定的页码引用。</p></td></tr><tr><td><p>附录</p></td><td><p>保留细节而不挤压正文主线。</p></td><td><p>可以更密集，也可以更技术化。</p></td></tr></tbody></table>",
  "<h2>4. 收尾说明</h2>",
  "<p>真正重要的并不是第一天就做到与打印完全一致，而是让编辑和产品团队在更早阶段就拥有一个足够可信的画布来推演最终成品。一旦文档具备分页能力，哪怕版式仍然粗糙，也会自然引出更高质量的讨论。</p>",
  "<p>使用右侧控制项可以切换纸张格式、调整页面间距，并打开或关闭首页与奇偶页变体。内容本身没有变，但整份文档的气质会立即改变。</p>",
  "<p></p>",
].join("");

export const commentsDemoThreads: CommentsThread[] = [
  {
    id: "thread-launch",
    data: {
      author: "Ava",
      label: "发布叙事",
      quote: "把讨论直接锚定在句子上",
    },
    resolved: false,
    archived: false,
    createdAt: "2026-03-17T09:30:00.000Z",
    updatedAt: "2026-03-17T09:44:00.000Z",
    comments: [
      {
        id: "comment-launch-1",
        content: "这是最核心的承诺，建议把句子写得更强调结果，而不是功能本身。",
        data: {
          author: "Ava",
          role: "内容设计",
        },
        createdAt: "2026-03-17T09:30:00.000Z",
        updatedAt: "2026-03-17T09:30:00.000Z",
      },
      {
        id: "comment-launch-2",
        content: "同意。如果能顺带点出锚点会随着正文编辑保持稳定，信息会更完整。",
        data: {
          author: "Noah",
          role: "产品",
        },
        createdAt: "2026-03-17T09:44:00.000Z",
        updatedAt: "2026-03-17T09:44:00.000Z",
      },
    ],
  },
  {
    id: "thread-voice",
    data: {
      author: "Lin",
      label: "语气润色",
      quote: "重叠的审阅意见",
    },
    resolved: true,
    archived: false,
    createdAt: "2026-03-17T10:02:00.000Z",
    updatedAt: "2026-03-17T10:18:00.000Z",
    comments: [
      {
        id: "comment-voice-1",
        content: "这个短语很利落。这里保持已解决状态，也方便观察重叠讨论的实际表现。",
        data: {
          author: "Lin",
          role: "编辑",
        },
        createdAt: "2026-03-17T10:02:00.000Z",
        updatedAt: "2026-03-17T10:18:00.000Z",
      },
    ],
  },
];

export const heroCopy =
  "这一版演示场现在围绕 mxm-editor 品牌展开：除了标题、引用、无序 / 有序列表、任务列表、代码块和表格之外，还补齐了行内代码、删除线、下划线、高亮、文本样式与颜色、分隔线、硬换行、浮动菜单、占位提示、字符统计、文本对齐、图片、列表快捷键、协同光标，以及更完整的编辑命令。";

export function bubbleMenuShouldShow({
  state,
}: {
  state: Editor["state"];
}) {
  return !state.selection.empty;
}

export function floatingMenuShouldShow({
  state,
  editor,
}: {
  state: Editor["state"];
  editor: Editor;
}) {
  return state.selection.empty && editor.isActive("paragraph");
}
