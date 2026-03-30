import { useState, type CSSProperties } from "react";
import type { Editor } from "@mxm-editor/core";
import {
  Pages,
  PAGE_FORMATS,
  type PagesFormatInput,
  type PagesFormatName,
  type PagesHeaderFooterValue,
  type PagesStorage,
} from "@mxm-editor/extension-pages";
import {
  EditorContent,
  useEditor,
  useEditorState,
} from "@mxm-editor/react";
import {
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { pagesDemoContent } from "../constants";
import { createPlaygroundExtensions } from "../extensions";
import { useContentStats } from "../hooks/useContentStats";

interface PagesSectionProps {
  interactive?: boolean;
  showContentStats?: boolean;
}

type PagesPresetId = "editorial" | "briefing";

interface PagesPreset {
  id: PagesPresetId;
  label: string;
  description: string;
  formatName: PagesFormatName;
  pageFormat: PagesFormatInput;
  pageGap: number;
  pageBreakBackground: string;
  headerHeight: number;
  footerHeight: number;
  headerTopMargin: number;
  footerBottomMargin: number;
  differentFirstPage: boolean;
  differentOddEven: boolean;
  header: PagesHeaderFooterValue | null;
  footer: PagesHeaderFooterValue | null;
  headerFirstPage: PagesHeaderFooterValue | null;
  footerFirstPage: PagesHeaderFooterValue | null;
  headerOdd: PagesHeaderFooterValue | null;
  headerEven: PagesHeaderFooterValue | null;
  footerOdd: PagesHeaderFooterValue | null;
  footerEven: PagesHeaderFooterValue | null;
}

const paperOptions: Array<{
  hint: string;
  name: PagesFormatName;
}> = [
  {
    name: "A4",
    hint: "210 x 297 mm",
  },
  {
    name: "Letter",
    hint: "8.5 x 11 in",
  },
  {
    name: "Legal",
    hint: "8.5 x 14 in",
  },
];

const pageBreakBackgrounds = [
  {
    label: "暖灰纸面",
    value: "#d6d0c7",
  },
  {
    label: "蓝灰纸面",
    value: "#d9e3ef",
  },
  {
    label: "苔绿纸面",
    value: "#d7ddd0",
  },
];

function createPageFormat(
  name: PagesFormatName,
  margins: PagesFormatInput["margins"],
): PagesFormatInput {
  const pageFormat = PAGE_FORMATS[name];

  return {
    width: pageFormat.width,
    height: pageFormat.height,
    margins: {
      ...pageFormat.margins,
      ...margins,
    },
  };
}

const pagesPresets: PagesPreset[] = [
  {
    id: "editorial",
    label: "编辑校对稿",
    description: "镜像页眉搭配更宽页边距，适合内容审阅轮次。",
    formatName: "A4",
    pageFormat: createPageFormat("A4", {
      top: 112,
      right: 82,
      bottom: 98,
      left: 82,
    }),
    pageGap: 56,
    pageBreakBackground: "#d6d0c7",
    headerHeight: 30,
    footerHeight: 24,
    headerTopMargin: 44,
    footerBottomMargin: 38,
    differentFirstPage: true,
    differentOddEven: true,
    header: "田野手册总览",
    footer: ({ page, totalPages }) => `第 ${page} 页 / 共 ${totalPages} 页`,
    headerFirstPage: "mxm-editor 分页演示",
    footerFirstPage: "内部工作草稿",
    headerOdd: ({ page }) => `校对稿 · 第 ${page} 页`,
    headerEven: ({ page }) => `mxm-editor 版式研究 · 第 ${page} 页`,
    footerOdd: null,
    footerEven: null,
  },
  {
    id: "briefing",
    label: "简报包",
    description: "更紧凑的页面装饰，把更多纵向空间留给正文。",
    formatName: "Letter",
    pageFormat: createPageFormat("Letter", {
      top: 92,
      right: 74,
      bottom: 88,
      left: 74,
    }),
    pageGap: 40,
    pageBreakBackground: "#d9e3ef",
    headerHeight: 24,
    footerHeight: 24,
    headerTopMargin: 34,
    footerBottomMargin: 30,
    differentFirstPage: true,
    differentOddEven: false,
    header: "季度简报包",
    footer: ({ page, totalPages }) => `审阅副本 · ${page} / ${totalPages}`,
    headerFirstPage: "发布评审简报",
    footerFirstPage: "供产品与编辑评审使用",
    headerOdd: null,
    headerEven: null,
    footerOdd: null,
    footerEven: null,
  },
];

function getPresetById(id: PagesPresetId) {
  return pagesPresets.find((preset) => preset.id === id) ?? pagesPresets[0]!;
}

function roundPixels(value: number) {
  return Math.round(value);
}

function getHeaderVariants(preset: PagesPreset) {
  return {
    default: preset.header,
    first: preset.headerFirstPage,
    odd: preset.headerOdd,
    even: preset.headerEven,
  };
}

function getFooterVariants(preset: PagesPreset) {
  return {
    default: preset.footer,
    first: preset.footerFirstPage,
    odd: preset.footerOdd,
    even: preset.footerEven,
  };
}

function applyPreset(editor: Editor, preset: PagesPreset) {
  editor.commands.setPageFormat({
    pageFormat: preset.pageFormat,
  });
  editor.commands.setPageGap(preset.pageGap);
  editor.commands.setPageBreakBackground(preset.pageBreakBackground);
  editor.commands.setHeaderHeight(preset.headerHeight);
  editor.commands.setFooterHeight(preset.footerHeight);
  editor.commands.setHeaderTopMargin(preset.headerTopMargin);
  editor.commands.setFooterBottomMargin(preset.footerBottomMargin);
  editor.commands.setDifferentFirstPage(preset.differentFirstPage);
  editor.commands.setDifferentOddEven(preset.differentOddEven);
  editor.commands.setHeader({
    value: preset.header,
  });
  editor.commands.setFooter({
    value: preset.footer,
  });
  editor.commands.setHeaderFirstPage(preset.headerFirstPage);
  editor.commands.setFooterFirstPage(preset.footerFirstPage);
  editor.commands.setHeaderOdd(preset.headerOdd);
  editor.commands.setHeaderEven(preset.headerEven);
  editor.commands.setFooterOdd(preset.footerOdd);
  editor.commands.setFooterEven(preset.footerEven);
  editor.commands.repaginate();
}

function applyPaperFormat(
  editor: Editor,
  name: PagesFormatName,
  margins: PagesStorage["pageFormat"]["margins"],
) {
  const pageFormat = PAGE_FORMATS[name];

  editor.commands.setPageFormat({
    pageFormat: {
      width: pageFormat.width,
      height: pageFormat.height,
      margins: {
        ...margins,
      },
    },
  });
  editor.commands.repaginate();
}

export function PagesSection({
  interactive = false,
  showContentStats = false,
}: PagesSectionProps) {
  const initialPreset = getPresetById("editorial");
  const [activePresetId, setActivePresetId] = useState<PagesPresetId>(initialPreset.id);
  const [selectedFormat, setSelectedFormat] = useState<PagesFormatName>(initialPreset.formatName);
  const [pageGap, setPageGap] = useState(initialPreset.pageGap);
  const [pageBreakBackground, setPageBreakBackground] = useState(
    initialPreset.pageBreakBackground,
  );
  const [differentFirstPage, setDifferentFirstPage] = useState(
    initialPreset.differentFirstPage,
  );
  const [differentOddEven, setDifferentOddEven] = useState(
    initialPreset.differentOddEven,
  );
  const editor = useEditor({
    extensions: [
      ...createPlaygroundExtensions({
        interactive,
      }),
      Pages.configure({
        pageFormat: initialPreset.pageFormat,
        pageGap: initialPreset.pageGap,
        pageBreakBackground: initialPreset.pageBreakBackground,
        headerHeight: initialPreset.headerHeight,
        footerHeight: initialPreset.footerHeight,
        headerTopMargin: initialPreset.headerTopMargin,
        footerBottomMargin: initialPreset.footerBottomMargin,
        differentFirstPage: initialPreset.differentFirstPage,
        differentOddEven: initialPreset.differentOddEven,
        header: getHeaderVariants(initialPreset),
        footer: getFooterVariants(initialPreset),
      }),
    ],
    autofocus: true,
    content: pagesDemoContent,
  });
  const pagesMeta = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const storage = currentEditor?.storage.pages as
        | PagesStorage
        | undefined;
      const pageFormat = storage?.pageFormat ?? PAGE_FORMATS.A4;
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
        pageCount: storage?.pageCount ?? 1,
        pageFormat,
        metrics,
        pageGap: storage?.pageGap ?? initialPreset.pageGap,
        pageBreakBackground:
          storage?.pageBreakBackground ?? initialPreset.pageBreakBackground,
        differentFirstPage: storage?.differentFirstPage ?? initialPreset.differentFirstPage,
        differentOddEven: storage?.differentOddEven ?? initialPreset.differentOddEven,
        selectionPage,
      };
    },
  });
  const contentStats = useContentStats(editor);

  if (!editor) {
    return null;
  }

  const activePreset = getPresetById(activePresetId);

  const usePreset = (presetId: PagesPresetId) => {
    const preset = getPresetById(presetId);

    setActivePresetId(preset.id);
    setSelectedFormat(preset.formatName);
    setPageGap(preset.pageGap);
    setPageBreakBackground(preset.pageBreakBackground);
    setDifferentFirstPage(preset.differentFirstPage);
    setDifferentOddEven(preset.differentOddEven);
    applyPreset(editor, preset);
  };

  const resetDemo = () => {
    editor.commands.setContent(pagesDemoContent);
    usePreset("editorial");
  };

  return (
    <section className="pages-demo">
      <div className="pages-demo__grid">
        <div className="ui-shell pages-editor-card border border-[var(--panel-border)]">
          <div className="pages-card__header">
            <div>
              <div className="panel-eyebrow">分页</div>
              <h2>纸张感布局演示</h2>
              <p>
                这页专门演示 `Pages` 的格式切换、分页间距、页眉页脚和不同首页 /
                奇偶页版式。直接编辑左侧文档，右侧控制会实时驱动版式。
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
              onClick={() => usePreset(activePreset.id)}
              type="button"
            >
              <Sparkles size={16} strokeWidth={2} />
              <span>重新应用 {activePreset.label}</span>
            </button>
            <button
              className="pages-toolbar-button"
              onClick={resetDemo}
              type="button"
            >
              <RotateCcw size={16} strokeWidth={2} />
              <span>重置演示</span>
            </button>
          </div>

          <EditorContent
            editor={editor}
            className="editor-surface pages-editor-surface min-h-0 flex-1"
          />
        </div>

        <aside className="pages-sidebar">
          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">版式快照</div>
                <h3>当前布局</h3>
              </div>
              <span className="pages-panel__meta">
                {roundPixels(pagesMeta.pageFormat.width)} x {roundPixels(pagesMeta.pageFormat.height)} px
              </span>
            </div>

            <div className="pages-stat-grid">
              <article className="pages-stat-card">
                <span>页数</span>
                <strong>{pagesMeta.pageCount}</strong>
                <p>当前光标位于第 {pagesMeta.selectionPage} 页。</p>
              </article>

              <article className="pages-stat-card">
                <span>页面间距</span>
                <strong>{roundPixels(pagesMeta.pageGap)}px</strong>
                <p>分页缝隙会影响整页阅读节奏。</p>
              </article>

              <article className="pages-stat-card">
                <span>页边距</span>
                <strong>
                  {roundPixels(pagesMeta.pageFormat.margins.top)} / {roundPixels(pagesMeta.pageFormat.margins.right)}
                </strong>
                <p>
                  上 / 右，左为 {roundPixels(pagesMeta.pageFormat.margins.left)}px，
                  下为 {roundPixels(pagesMeta.pageFormat.margins.bottom)}px。
                </p>
              </article>

              <article className="pages-stat-card">
                <span>正文高度</span>
                <strong>{roundPixels(pagesMeta.metrics.availableContentHeight)}px</strong>
                <p>可用于正文的纵向空间。</p>
              </article>

              {showContentStats ? (
                <article className="pages-stat-card">
                  <span>词数</span>
                  <strong>{contentStats.words}</strong>
                  <p>基于当前文档正文实时统计。</p>
                </article>
              ) : null}

              {showContentStats ? (
                <article className="pages-stat-card">
                  <span>字符</span>
                  <strong>{contentStats.characters}</strong>
                  <p>用于观察长文编辑时的内容体量。</p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">控制面板</div>
                <h3>预设与纸张</h3>
              </div>
              <span className="pages-panel__meta">
                {activePreset.label}
              </span>
            </div>

            <div className="pages-choice-grid">
              {pagesPresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`pages-choice-button${
                    preset.id === activePresetId ? " is-active" : ""
                  }`}
                  onClick={() => usePreset(preset.id)}
                  type="button"
                >
                  <strong>{preset.label}</strong>
                  <small>{preset.description}</small>
                </button>
              ))}
            </div>

            <div className="pages-choice-grid pages-choice-grid--formats">
              {paperOptions.map((option) => (
                <button
                  key={option.name}
                  className={`pages-choice-button${
                    option.name === selectedFormat ? " is-active" : ""
                  }`}
                  onClick={() => {
                    setSelectedFormat(option.name);
                    applyPaperFormat(
                      editor,
                      option.name,
                      pagesMeta.pageFormat.margins,
                    );
                  }}
                  type="button"
                >
                  <strong>{option.name}</strong>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>

            <label className="pages-control-block" htmlFor="pages-gap-range">
              <div className="pages-control-label">
                <span>页面间距</span>
                <output>{pageGap}px</output>
              </div>
              <input
                id="pages-gap-range"
                className="pages-range"
                max={96}
                min={24}
                onChange={(event) => {
                  const nextPageGap = event.currentTarget.valueAsNumber;

                  setPageGap(nextPageGap);
                  editor.commands.setPageGap(nextPageGap);
                }}
                step={2}
                type="range"
                value={pageGap}
              />
            </label>

            <div className="pages-control-block">
              <div className="pages-control-label">
                <span>分页背景</span>
                <output>{pageBreakBackground}</output>
              </div>
              <div className="pages-swatch-row">
                {pageBreakBackgrounds.map((item) => (
                  <button
                    key={item.value}
                    aria-label={item.label}
                    className={`pages-swatch${
                      item.value === pageBreakBackground ? " is-active" : ""
                    }`}
                    onClick={() => {
                      setPageBreakBackground(item.value);
                      editor.commands.setPageBreakBackground(item.value);
                    }}
                    style={{
                      "--pages-swatch": item.value,
                    } as CSSProperties}
                    title={item.label}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <label className="pages-toggle">
              <input
                checked={differentFirstPage}
                onChange={(event) => {
                  const nextValue = event.currentTarget.checked;

                  setDifferentFirstPage(nextValue);
                  editor.commands.setDifferentFirstPage(nextValue);
                }}
                type="checkbox"
              />
              <div>
                <strong>首页使用独立版式</strong>
                <small>首页可以单独展示封面级页眉和页脚。</small>
              </div>
            </label>

            <label className="pages-toggle">
              <input
                checked={differentOddEven}
                onChange={(event) => {
                  const nextValue = event.currentTarget.checked;

                  setDifferentOddEven(nextValue);
                  editor.commands.setDifferentOddEven(nextValue);
                }}
                type="checkbox"
              />
              <div>
                <strong>区分奇偶页</strong>
                <small>打开后可以为左页和右页使用不同的镜像页眉。</small>
              </div>
            </label>
          </section>

          <section className="ui-shell pages-panel border border-[var(--panel-border)]">
            <div className="pages-panel__header">
              <div>
                <div className="panel-eyebrow">说明</div>
                <h3>观察要点</h3>
              </div>
            </div>

            <ul className="pages-note-list">
              <li>切换纸张尺寸时，正文会保持当前页边距设定，只改变页面盒尺寸。</li>
              <li>
                当前预设会同时设置 `pageFormat`、`pageGap`、`pageBreakBackground`
                和页眉页脚变体。
              </li>
              <li>
                这个实现仍然按顶层块分页，不会把单个超高块自动拆到两页。
              </li>
              <li>
                当前版式状态：首页独立版式为
                {pagesMeta.differentFirstPage ? " 开" : " 关"}，
                奇偶页区分为 {pagesMeta.differentOddEven ? " 开" : " 关"}。
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
