import type { Editor } from "@mxm-editor/core";
import type { MentionItem } from "@mxm-editor/extension-mention";

export const sampleImageUrl =
  "https://placehold.co/960x480/201a15/f7efe4?text=mxm-editor";

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
  "<h2>P0 正在对齐 Tiptap 常用 API</h2>",
  "<p>现在已经把 <strong>code</strong>、<strong>strike</strong>、<strong>underline</strong>、<strong>horizontal rule</strong>、<strong>hard break</strong>、table、task list 以及 slash / bubble / floating menu 一起接进 playground。</p>",
  '<blockquote><p>试试输入 <strong>/bullet</strong>、<strong>/task</strong>、<strong>/code</strong>。</p></blockquote>',
  "<ul><li><p>普通 bullet list</p></li><li><p>支持 Markdown 互转</p></li></ul>",
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><div><p>完成 starter-kit 第四层</p></div></li><li data-type="taskItem" data-checked="false"><div><p>继续补 table 或 task item node view</p></div></li></ul>',
  "<p>也可以试试 <code>inline code</code>、<s>strike</s>、<u>underline</u>、<mark>highlight</mark> 和 <span style=\"color:#d9485f\">text color</span>。</p>",
  '<pre><code class="language-ts">const message = "mxm-editor";\nconsole.log(message);</code></pre>',
  '<p style="text-align: center;">TextAlign 已接入 paragraph / heading，支持 left / center / right / justify。</p>',
  `<img src="${sampleImageUrl}" alt="mxm-editor preview" title="mxm-editor preview" />`,
  "<hr />",
  "<p>Shift+Enter 会插入 hard break。这里先放一段<br />同段落换行的示例。</p>",
  '<table><tbody><tr><th><p>Layer</p></th><th><p>Status</p></th><th><p>Note</p></th></tr><tr><td><p>List</p></td><td><p>Done</p></td><td><p>Markdown round-trip</p></td></tr><tr><td><p>Table</p></td><td><p>Done</p></td><td><p>Resizable columns</p></td></tr></tbody></table>',
  '<div data-callout="" data-variant="tip"><p>输入 @ 可以触发 mention，输入 *italic* 或 **bold** 仍然会自动转成 mark。</p></div>',
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
  "这一轮开始把 API 和默认扩展往 Tiptap 官方语义靠拢：除了 heading、blockquote、bullet / ordered list、task list、code block、table 之外，还补上了 code mark、strike、underline、highlight、text style + color、horizontal rule、hard break、floating menu、placeholder、character count、text align、image、list keymap 和 collaboration caret，以及更完整的 editor commands。";

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
