# mxm-editor

`mxm-editor` 是一个用 `pnpm workspace + vite + typescript` 搭建的 Tiptap 风格编辑器 monorepo。

仓库当前目标不是简单做一个 demo，而是把编辑器能力拆成清晰的分层：

- `@mxm-editor/pm`: ProseMirror 依赖收敛层
- `@mxm-editor/core`: headless editor 内核
- `@mxm-editor/extension-*`: 节点、mark、插件扩展层
- `@mxm-editor/*-kit`: 预组装能力集合
- `@mxm-editor/markdown`: Markdown 编解码层
- `@mxm-editor/react`: React 适配层
- `@mxm-editor/suggestion`: mention / slash command 等建议系统
- `apps/playground`: Vite 示例应用
- `tests`: 面向能力分批补完的 smoke tests

## 快速开始

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 在线预览

仓库已经包含 GitHub Pages 自动部署工作流：

- Workflow 文件：`.github/workflows/deploy-playground-pages.yml`
- 触发方式：推送到 `master`，或手动执行 `workflow_dispatch`
- 构建目标：`apps/playground`

首次启用时，请在 GitHub 仓库设置中把 Pages 的 Source 设为 `GitHub Actions`。之后每次推送到 `master`，Actions 都会自动构建并发布 playground，方便开发者在线预览。

默认情况下，`apps/playground/vite.config.ts` 会根据 `GITHUB_REPOSITORY` 自动推导 Pages 的 `base` 路径；如果你使用自定义域名或想手动覆盖路径，可以在仓库的 GitHub Variables 里设置 `VITE_BASE_PATH`。

## 项目架构

当前仓库可以按下面的方式理解：

```text
mxm-editor/
├─ apps/
│  └─ playground/              # 本地调试、功能演示、集成验证
├─ packages/
│  ├─ pm/                      # ProseMirror 包统一出口
│  ├─ core/                    # Editor / CommandManager / ExtensionManager / NodeView
│  ├─ markdown/                # MarkdownManager 与 markdown 扩展
│  ├─ react/                   # useEditor / EditorContent / 菜单适配
│  ├─ suggestion/              # mention、slash command 等 suggestion 基础设施
│  ├─ starter-kit/             # 基础编辑能力集合
│  ├─ list-kit/                # 列表能力集合
│  ├─ table-kit/               # 表格能力集合
│  ├─ text-style-kit/          # 文字样式能力集合
│  └─ extension-*/             # 独立扩展包
└─ tests/                      # smoke tests，按批次验证对齐能力
```

### 1. ProseMirror 适配层

`packages/pm` 不承载业务逻辑，职责是把 `prosemirror-*` 相关依赖收敛成统一出口，避免上层包直接分散依赖多个 ProseMirror 包。

这层的价值是：

- 统一依赖入口
- 降低上层 import 噪音
- 方便后续内核层与扩展层复用同一套 PM 类型

### 2. Headless 内核层

`packages/core` 是整个仓库的中心。

这里提供的核心对象包括：

- `Editor`: 编辑器实例、内容设置、序列化、命令入口
- `CommandManager`: `commands / chain / can` 调度
- `ExtensionManager`: 解析扩展、组装 schema、plugins、nodeViews
- `Extension / Node / Mark`: 扩展抽象
- `InputRule / PasteRule / NodeView` 等底层能力

运行时大致流程是：

```text
Editor
  -> ExtensionManager
  -> schema / plugins / nodeViews / commands
  -> ProseMirror EditorView
```

也就是说，`core` 负责“把扩展声明转成真正可运行的编辑器实例”。

### 3. 扩展层

`packages/extension-*` 是能力最丰富的一层。每个扩展包保持独立职责，按需组合。

当前仓库已经覆盖的扩展类型包括：

- 基础文档结构：`document`、`paragraph`、`text`、`heading`
- 常用 marks：`bold`、`italic`、`strike`、`underline`、`code`、`link`
- 列表：`bullet-list`、`ordered-list`、`task-list`、`task-item`、`list-keymap`
- 块级内容：`blockquote`、`code-block`、`horizontal-rule`
- 视觉样式：`text-style`、`color`、`background-color`、`font-family`、`font-size`、`line-height`、`highlight`、`text-align`
- 媒体与嵌入：`image`、`audio`、`youtube`、`twitch`
- 复杂能力：`table`、`table-cell`、`table-header`、`table-row`
- 交互增强：`placeholder`、`selection`、`focus`、`drag-handle`、`bubble-menu`、`floating-menu`
- 协作与辅助：`collaboration`、`collaboration-caret`、`character-count`、`file-handler`、`trailing-node`
- 富文本补完能力：`emoji`、`mention`、`callout`、`details`
- 最近补完的对齐能力：`mathematics`

这层的设计原则是：

- 每个包只做一个能力点
- 尽量保持和 Tiptap 风格接近的 API 形状
- 优先让扩展可以单独消费，而不是只能通过大礼包使用

### 4. Kit 层

`starter-kit`、`list-kit`、`table-kit`、`text-style-kit` 是“组合层”。

它们不负责新的编辑行为，而是负责：

- 把常用扩展打包成更方便的入口
- 统一默认配置
- 降低业务接入时的扩展装配成本

例如：

- `starter-kit` 负责基础富文本编辑能力
- `list-kit` 负责列表相关扩展组合
- `table-kit` 负责表格相关扩展组合
- `text-style-kit` 负责文字样式类扩展组合

### 5. Markdown 层

`packages/markdown` 负责把编辑器内容和 Markdown 之间打通。

当前实现方式是：

- 扩展通过 `renderMarkdown` 描述自己的输出
- `MarkdownManager` 统一做序列化与解析调度
- `Markdown` 扩展负责把 markdown 能力接入 `Editor`

这意味着 Markdown 能力不是独立游离的，而是和扩展系统保持同一套模型。

### 6. Framework 适配层

`packages/react` 是面向 React 的适配层。

它把 headless 内核包装成更适合 React 使用的 API，例如：

- `useEditor`
- `EditorContent`
- 菜单相关导出

这层的职责是“适配框架”，不是重写编辑器逻辑。

### 7. Playground 与测试层

`apps/playground` 是当前最重要的集成验证入口，承担三类角色：

- 本地开发调试
- 新扩展接入验证
- 复杂交互能力的可视化演示

`tests` 目录则使用 smoke test 的方式按批次覆盖关键对齐能力，例如：

- 对齐与文本样式
- media/embed
- menu / drag handle
- rich parity
- table package parity
- mathematics
- link parity

## 当前能力范围

当前仓库已经不是“最小可运行壳子”，而是具备了比较完整的编辑器骨架与一批富文本能力：

- 基于 ProseMirror 的 headless editor
- `Extension / Node / Mark` 分层
- `commands / chain / can` 模式
- NodeView 注册与运行
- Markdown 导入导出
- React 集成
- 协作能力接入
- 表格、菜单、拖拽手柄、媒体、emoji、mention、数学公式等扩展能力

## 推荐阅读顺序

如果第一次进入这个仓库，建议按下面顺序看代码：

1. `packages/core/src/Editor.ts`
2. `packages/core/src/ExtensionManager.ts`
3. `packages/core/src/CommandManager.ts`
4. `packages/starter-kit/src/starter-kit.ts`
5. 任意一个扩展包，例如 `packages/extension-link` 或 `packages/extension-table`
6. `apps/playground/src/playground/extensions.tsx`

这样会比较容易建立从“内核 -> 扩展 -> 组合 -> 应用”的整体认知。
