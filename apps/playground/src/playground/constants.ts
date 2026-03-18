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

export const commentsDemoContent = [
  "<h1>Editorial review in context</h1>",
  '<p><span data-thread-ids="thread-launch">Anchor discussion directly to the sentence</span>, and let <span data-thread-ids="thread-launch,thread-voice">overlapping reviews</span> travel with the text as it changes.</p>',
  "<p>Select any phrase to open a fresh thread from the sidebar. Existing discussions can be replied to, resolved, or archived without leaving the writing flow.</p>",
  "<h2>What this demo shows</h2>",
  "<ul><li><p>Thread metadata lives in the provider.</p></li><li><p>Inline marks keep document anchors stable.</p></li><li><p>Multiple thread ids can share the same text range.</p></li></ul>",
  "<blockquote><p>Try selecting a sentence in the editor, write a note in the sidebar, then create an overlapping thread on the same words.</p></blockquote>",
  "<p></p>",
].join("");

export const pagesDemoContent = [
  "<h1>The Field Notes Atlas</h1>",
  "<p>Pages turns a regular rich text document into a paper-aware layout: every top-level block is measured, page chrome is inserted automatically, and headers plus footers stay aligned to the current sheet.</p>",
  "<p>This demo is intentionally dense. It mixes headings, paragraphs, lists, and a few wide blocks so you can inspect how the editor behaves when a working draft starts to feel like an actual document instead of a single scrolling canvas.</p>",
  "<blockquote><p>Try switching between A4, Letter, and Legal, then toggle mirrored headers to see how the same content adopts a new rhythm.</p></blockquote>",
  "<h2>1. Editorial pacing</h2>",
  "<p>Long-form documents usually reveal layout problems later than we expect. A hero sentence that feels balanced in a continuous editor can suddenly look cramped once margins, running heads, and page gaps appear. That is why the first page often needs its own quieter treatment.</p>",
  "<p>When product teams review complex material, they also tend to comment on where an idea lands physically on the page. A transition paragraph at the bottom of page two feels different from the same paragraph sitting comfortably at the top of page three.</p>",
  "<p>Mirrored headers help readers keep their place in longer drafts. They also provide a natural place to surface chapter titles, section labels, review stages, or timestamps without interrupting the document body.</p>",
  "<h2>2. Layout as product feedback</h2>",
  "<p>Pagination is not only about print. Contract review, policy drafting, educational handouts, and internal knowledge bases all benefit from a paper-like preview because authors can catch awkward breaks before shipping the document to downstream workflows.</p>",
  "<p>That changes the kind of feedback a team can give. Instead of saying “the section feels too long,” reviewers can say “page four needs a stronger opening block” or “the data table would read better if the appendix started on a fresh page.”</p>",
  "<ul><li><p>Paper size affects perceived density.</p></li><li><p>Margins influence both hierarchy and breathing room.</p></li><li><p>Headers and footers create orientation cues across a long draft.</p></li></ul>",
  "<h2>3. Draft structure</h2>",
  "<p>Imagine this document as an internal field guide prepared for a launch review. The opening pages establish the premise, later sections collect evidence, and the closing appendix preserves references for specialists who need the full context.</p>",
  "<p>The more the content grows, the more useful it becomes to keep page numbers visible. Writers can refer to specific leaves during meetings, while designers can tune the vertical cadence without guessing where content currently lands.</p>",
  "<p>Tables are also a good stress case for pagination because they consume vertical space quickly and make overflow visually obvious. Even in a lightweight prototype, simply seeing the table inside a paginated frame changes how authors judge whether it belongs here or in an appendix.</p>",
  "<table><thead><tr><th><p>Section</p></th><th><p>Intent</p></th><th><p>Review cue</p></th></tr></thead><tbody><tr><td><p>Opening</p></td><td><p>Set the narrative and stakes.</p></td><td><p>Should feel calm and spacious.</p></td></tr><tr><td><p>Evidence</p></td><td><p>Support claims with specifics.</p></td><td><p>Needs stable page references.</p></td></tr><tr><td><p>Appendix</p></td><td><p>Preserve detail without crowding the main flow.</p></td><td><p>Can be denser and more technical.</p></td></tr></tbody></table>",
  "<h2>4. Closing note</h2>",
  "<p>What matters in practice is not perfect print parity on day one. It is giving editors and product teams a believable canvas for reasoning about final form earlier in the process. Once pagination exists, even a rough prototype invites better discussions.</p>",
  "<p>Use the controls on the right to swap formats, adjust the page gap, and turn first-page or odd-even variants on and off. The content stays the same, but the document personality changes immediately.</p>",
  "<p></p>",
].join("");

export const commentsDemoThreads: CommentsThread[] = [
  {
    id: "thread-launch",
    data: {
      author: "Ava",
      label: "Launch narrative",
      quote: "Anchor discussion directly to the sentence",
    },
    resolved: false,
    archived: false,
    createdAt: "2026-03-17T09:30:00.000Z",
    updatedAt: "2026-03-17T09:44:00.000Z",
    comments: [
      {
        id: "comment-launch-1",
        content: "This is the core promise. Let's keep the sentence outcome-led instead of feature-led.",
        data: {
          author: "Ava",
          role: "Content Design",
        },
        createdAt: "2026-03-17T09:30:00.000Z",
        updatedAt: "2026-03-17T09:30:00.000Z",
      },
      {
        id: "comment-launch-2",
        content: "Agreed. It would help to hint that the anchor survives document edits.",
        data: {
          author: "Noah",
          role: "Product",
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
      label: "Voice polish",
      quote: "overlapping reviews",
    },
    resolved: true,
    archived: false,
    createdAt: "2026-03-17T10:02:00.000Z",
    updatedAt: "2026-03-17T10:18:00.000Z",
    comments: [
      {
        id: "comment-voice-1",
        content: "This phrase is a nice shorthand. Keeping it resolved here makes the overlap behavior easy to inspect.",
        data: {
          author: "Lin",
          role: "Editor",
        },
        createdAt: "2026-03-17T10:02:00.000Z",
        updatedAt: "2026-03-17T10:18:00.000Z",
      },
    ],
  },
];

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
