import { useState } from "react";
import {
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { EditorTextEngineInlineRun } from "@mxm-editor/core";
import {
  Pages,
  type PagesStorage,
} from "@mxm-editor/extension-pages";
import { createPretextTextEngine } from "@mxm-editor/pretext";
import {
  EditorContent,
  useEditor,
  useEditorState,
} from "@mxm-editor/react";
import {
  pretextDemoContent,
  pretextIntegrationSnippet,
} from "../constants";
import { createPlaygroundExtensions } from "../extensions";
import { useContentStats } from "../hooks/useContentStats";

type TextEngineMode = "dom" | "pretext";

interface ModeOption {
  description: string;
  id: TextEngineMode;
  label: string;
}

const pretextPlaygroundEngine = createPretextTextEngine();
const probeFont = '500 18px "Avenir Next", "Segoe UI", sans-serif';
const probeLineHeight = 30;
const probeText =
  "Pretext probe keeps the same words but renders them as explicit measured lines, so you can compare browser wrapping with a line-by-line layout built from the text engine.";

const modeOptions: ModeOption[] = [
  {
    id: "pretext",
    label: "Pretext 模式",
    description: "Pages 的标题与段落测量优先走 textEngine。",
  },
  {
    id: "dom",
    label: "DOM 模式",
    description: "完全回退到浏览器当前的 DOM 高度测量路径。",
  },
];

const pretextPageFormat = {
  width: 700,
  height: 900,
  margins: {
    top: 96,
    right: 82,
    bottom: 96,
    left: 82,
  },
};

function roundPixels(value: number) {
  return Math.round(value);
}

function extractProbeLineText(line: ReturnType<typeof pretextPlaygroundEngine.measure>["lines"][number]) {
  return line.fragments
    .map((fragment) => fragment.text ?? "")
    .join("");
}

function PretextSectionInner({
  engineMode,
  onModeChange,
}: {
  engineMode: TextEngineMode;
  onModeChange: (mode: TextEngineMode) => void;
}) {
  const [probeWidth, setProbeWidth] = useState(320);
  const editor = useEditor({
    extensions: [
      ...createPlaygroundExtensions({
        interactive: true,
      }),
      Pages.configure({
        pageFormat: pretextPageFormat,
        pageGap: 48,
        pageBreakBackground: "#ded7ca",
        headerHeight: 28,
        footerHeight: 24,
        headerTopMargin: 36,
        footerBottomMargin: 28,
        differentFirstPage: false,
        differentOddEven: false,
        header: "Pretext textEngine playground",
        footer: ({ page, totalPages }) => `mode: ${engineMode} · ${page}/${totalPages}`,
      }),
    ],
    autofocus: true,
    content: pretextDemoContent,
    textEngine: engineMode === "pretext" ? pretextPlaygroundEngine : null,
  });
  const pagesMeta = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const storage = currentEditor?.storage.pages as
        | PagesStorage
        | undefined;
      const pageFormat = storage?.pageFormat ?? pretextPageFormat;
      const metrics = storage?.getMetrics() ?? {
        topInset: pageFormat.margins.top,
        rightInset: pageFormat.margins.right,
        bottomInset: pageFormat.margins.bottom,
        leftInset: pageFormat.margins.left,
        availableContentHeight:
          pageFormat.height
          - pageFormat.margins.top
          - pageFormat.margins.bottom,
      };
      const selectionPage =
        currentEditor && storage
          ? storage.getPageNumber(currentEditor.state.selection.from)
          : 1;

      return {
        engineName: currentEditor?.textEngine?.name ?? "browser-dom",
        metrics,
        pageCount: storage?.pageCount ?? 1,
        pageFormat,
        selectionPage,
      };
    },
  });
  const contentStats = useContentStats(editor);
  const probeRuns: EditorTextEngineInlineRun[] = [
    {
      kind: "text",
      font: probeFont,
      text: probeText,
    },
  ];
  const probeResult = pretextPlaygroundEngine.measure({
    lineHeight: probeLineHeight,
    maxWidth: probeWidth,
    runs: probeRuns,
  });

  if (!editor) {
    return null;
  }

  return (
    <section className="pages-demo pretext-demo">
      <div className="pages-demo__grid">
        <div className="ui-shell pages-editor-card border border-[var(--panel-border)]">
          <div className="pages-card__header">
            <div>
              <div className="panel-eyebrow">Pretext</div>
              <h2>文本引擎切换演示</h2>
              <p>
                这页故意把 `Pages` 当作第一个真实消费者。切换模式时，正文内容不变，
                但段落和标题的分页测量会在 DOM 与 Pretext 两条路径之间切换。
              </p>
            </div>

            <div className="pages-card__meta">
              <span>{pagesMeta.pageCount} 页</span>
              <span>光标在第 {pagesMeta.selectionPage} 页</span>
            </div>
          </div>

          <div className="pages-card__toolbar">
            <button
              className="pages-toolbar-button"
              onClick={() => {
                editor.commands.repaginate();
              }}
              type="button"
            >
              <Sparkles size={16} strokeWidth={2} />
              <span>重新测量分页</span>
            </button>
            <button
              className="pages-toolbar-button"
              onClick={() => {
                editor.commands.setContent(pretextDemoContent);
                editor.commands.repaginate();
              }}
              type="button"
            >
              <RotateCcw size={16} strokeWidth={2} />
              <span>重置演示</span>
            </button>
          </div>

          <EditorContent
            editor={editor}
            className="editor-surface pages-editor-surface pretext-editor-surface min-h-0 flex-1"
          />
        </div>

        <aside className="pages-sidebar">
          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">可见差异</div>
                <h3>DOM 与 Pretext 渲染探针</h3>
              </div>
              <span className="pages-panel__meta">{probeWidth}px</span>
            </div>

            <label className="pages-control-block" htmlFor="pretext-probe-width">
              <div className="pages-control-label">
                <span>探针宽度</span>
                <output>{probeWidth}px</output>
              </div>
              <input
                id="pretext-probe-width"
                className="pages-range"
                max={420}
                min={220}
                onChange={(event) => {
                  setProbeWidth(event.currentTarget.valueAsNumber);
                }}
                step={4}
                type="range"
                value={probeWidth}
              />
            </label>

            <div className="pretext-probe-grid">
              <article className="pretext-probe-card">
                <span className="pretext-probe-label">DOM 段落</span>
                <div
                  className="pretext-probe-surface pretext-probe-surface--dom"
                  style={{ width: `${probeWidth}px` }}
                >
                  <p className="pretext-probe-dom-text">{probeText}</p>
                </div>
                <p className="pretext-probe-meta">
                  浏览器自己决定断行。视觉上更自然，但你拿不到显式 line fragments。
                </p>
              </article>

              <article className="pretext-probe-card">
                <span className="pretext-probe-label">Pretext 行渲染</span>
                <div
                  className="pretext-probe-surface pretext-probe-surface--pretext"
                  style={{ width: `${probeWidth}px` }}
                >
                  {probeResult.lines.map((line, index) => (
                    <div
                      key={`${index}-${extractProbeLineText(line)}`}
                      className="pretext-probe-line"
                      style={{ minHeight: `${probeLineHeight}px` }}
                    >
                      {line.fragments.map((fragment, fragmentIndex) => (
                        <span
                          key={`${index}-${fragmentIndex}`}
                          style={{
                            marginLeft: fragment.leadingGap
                              ? `${fragment.leadingGap}px`
                              : undefined,
                          }}
                        >
                          {fragment.text}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="pretext-probe-meta">
                  这里是 text engine 给出的逐行结果，共 {probeResult.lineCount} 行，
                  总高度 {probeResult.height}px。
                </p>
              </article>
            </div>
          </section>

          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">模式切换</div>
                <h3>当前后端</h3>
              </div>
              <span className="pages-panel__meta">{engineMode}</span>
            </div>

            <div className="pages-choice-grid">
              {modeOptions.map((option) => (
                <button
                  key={option.id}
                  className={`pages-choice-button${
                    option.id === engineMode ? " is-active" : ""
                  }`}
                  onClick={() => {
                    onModeChange(option.id);
                  }}
                  type="button"
                >
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>

            <div className="pretext-engine-row">
              <span
                className={`pretext-engine-chip${
                  engineMode === "dom" ? " is-dom" : ""
                }`}
              >
                {engineMode === "pretext" ? "textEngine: pretext" : "textEngine: null"}
              </span>
              <p className="pretext-switch-note">
                你指出的问题是对的: 当前主编辑区仍然由浏览器负责文本渲染。这里切换的
                是分页测量后端，不是 paragraph / heading 的实际绘制后端。
              </p>
              <p className="pretext-switch-note">
                切换模式时会重建当前 demo 编辑器，这样可以让 `useEditor()` 重新读取
                `EditorOptions.textEngine`。
              </p>
            </div>
          </section>

          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">运行时快照</div>
                <h3>分页与文本引擎</h3>
              </div>
              <span className="pages-panel__meta">{pagesMeta.engineName}</span>
            </div>

            <div className="pages-stat-grid">
              <article className="pages-stat-card">
                <span>测量模式</span>
                <strong>{engineMode === "pretext" ? "Pretext" : "DOM"}</strong>
                <p>
                  当前 editor.textEngine 为
                  {engineMode === "pretext" ? " pretext" : " null"}。
                </p>
              </article>

              <article className="pages-stat-card">
                <span>页面数量</span>
                <strong>{pagesMeta.pageCount}</strong>
                <p>切换模式后可以直接观察分页结果是否变化。</p>
              </article>

              <article className="pages-stat-card">
                <span>正文高度</span>
                <strong>{roundPixels(pagesMeta.metrics.availableContentHeight)}px</strong>
                <p>正文可用高度保持不变，变化的是文本测量后端。</p>
              </article>

              <article className="pages-stat-card">
                <span>字符数</span>
                <strong>{contentStats.characters}</strong>
                <p>便于确认我们切换的是版式逻辑，而不是内容本身。</p>
              </article>

              <article className="pages-stat-card">
                <span>词数</span>
                <strong>{contentStats.words}</strong>
                <p>同一份内容，分别走两套测量策略。</p>
              </article>

              <article className="pages-stat-card">
                <span>纸张尺寸</span>
                <strong>
                  {roundPixels(pagesMeta.pageFormat.width)} x {roundPixels(pagesMeta.pageFormat.height)}
                </strong>
                <p>固定纸张盒尺寸，更容易对比不同文本引擎的表现。</p>
              </article>
            </div>
          </section>

          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">接入方式</div>
                <h3>代码入口</h3>
              </div>
            </div>

            <pre className="pretext-snippet"><code>{pretextIntegrationSnippet}</code></pre>
          </section>

          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">当前范围</div>
                <h3>你现在能看到什么</h3>
              </div>
            </div>

            <ul className="pages-note-list">
              <li>当前 demo 中，`heading` 和 `paragraph` 会优先走 Pretext 测量。</li>
              <li>列表、引用、表格等块仍然回退到浏览器 DOM 高度读取。</li>
              <li>这页的目标是验证“可切换 textEngine”链路，而不是一次性替换所有版式逻辑。</li>
              <li>如果后续要继续推进，可以从更多 top-level block 的 run 扁平化开始扩展。</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}

export function PretextSection() {
  const [engineMode, setEngineMode] = useState<TextEngineMode>("pretext");

  return (
    <PretextSectionInner
      key={engineMode}
      engineMode={engineMode}
      onModeChange={setEngineMode}
    />
  );
}
