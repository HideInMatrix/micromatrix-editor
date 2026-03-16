import type { Editor } from "@mxm-editor/core";
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
  "<h1>Getting started</h1>",
  '<p>Welcome to the <em><mark data-color="var(--tt-color-highlight-yellow)" style="background-color: var(--tt-color-highlight-yellow); color: inherit;">mxm-editor Playground</mark></em> template! This version showcases <strong>mxm-editor</strong> packages, editor commands, and UI patterns that are built in this monorepo.</p>',
  '<p>Use it as a branded starting point for demos, package verification, and product-facing editor flows. You can also explore the <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/micromatrix/mxm-editor#readme">mxm-editor README</a> to understand how the workspace is organized.</p>',
  "<pre><code>pnpm --filter @mxm-editor/playground dev</code></pre>",
  "<h2>Features</h2>",
  "<blockquote><p><em>A focused rich text workspace with slash commands, markdown shortcuts, floating menus, and first-party mxm-editor extensions. Type markdown <code>**</code> or use keyboard shortcuts <code>⌘+B</code> for <s>most</s> all common text marks. 🪄</em></p></blockquote>",
  '<p>Mix images, alignment, and <mark data-color="var(--tt-color-highlight-blue)" style="background-color: var(--tt-color-highlight-blue); color: inherit;">advanced formatting</mark> to validate real product content, not just isolated editor APIs.</p>',
  `<img src="${sampleImageUrl}" alt="mxm-editor preview" title="mxm-editor preview" />`,
  "<ul><li><p><strong>Superscript</strong> (x<sup>2</sup>) and <strong>Subscript</strong> (H<sub>2</sub>O) for precision.</p></li><li><p><strong>Typographic conversion</strong>: automatically convert <code>-&gt;</code> into an arrow <strong>→</strong>.</p></li></ul>",
  '<p><em>→ </em><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/micromatrix/mxm-editor#readme">Learn more about mxm-editor</a></p>',
  "<hr />",
  "<h2>Make it your own</h2>",
  "<p>Switch between light and dark modes, tune the chrome with Tailwind v4 and UnoCSS, and adapt the editor shell to match the mxm-editor brand language.</p>",
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><div><p>Test the mxm-editor branded template</p></div></li><li data-type="taskItem" data-checked="false"><div><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/micromatrix/mxm-editor#readme">Integrate the branded playground into your app</a></p></div></li></ul>',
  "<p></p>",
].join("");

export const sampleMarkdown = [
  "# P0 Playground",
  "",
  "你可以输入 `/` 触发 slash command，或者在空段落观察 floating menu。",
  "",
  "> 现在已经支持 blockquote、heading、list、task list、code block、horizontal rule 和 table 的 markdown 互转。",
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
  "<p><span style=\"color:#d9485f\">Color 扩展会保留 textStyle 的内联样式。</span></p>",
  "",
  `![mxm-editor preview](${sampleImageUrl} "mxm-editor preview")`,
  "",
  "一行文本，下一行是 hard break。  ",
  "还在同一个段落里。",
  "",
  "---",
  "",
  "| Feature | Status | Detail |",
  "| --- | --- | --- |",
  "| Table | Ready | Resizable columns |",
  "| StarterKit | Ready | More official-like defaults |",
  "",
  "再试试 @mention、*italic* 和 **bold**。",
].join("\n");

export const collaborationContent = [
  "## Shared Y.Doc",
  "",
  "> 左右两个编辑器通过双向桥接同步文档和 awareness，可以同时看到远端 caret。",
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
  "| Side | Capability |",
  "| --- | --- |",
  "| Left | Edit shared content |",
  "| Right | Watch table sync |",
  "",
  "在任意一侧输入 `/tip`、`/quote`、`/bullet`、`/table` 或直接编辑内容，另一侧都会同步。",
].join("\n");

export const heroCopy =
  "这一轮的 playground 现在以 mxm-editor 品牌为中心：除了 heading、blockquote、bullet / ordered list、task list、code block、table 之外，还补上了 code mark、strike、underline、highlight、text style + color、horizontal rule、hard break、floating menu、placeholder、character count、text align、image、list keymap 和 collaboration caret，以及更完整的 editor commands。";

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
