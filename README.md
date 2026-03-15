# mxm-editor

`mxm-editor` 是一个用 `pnpm workspace + vite + typescript` 搭建的 Tiptap 风格编辑器 monorepo。

当前仓库先复刻了最小可运行的核心分层：

- `@mxm-editor/pm`: ProseMirror 依赖收敛层
- `@mxm-editor/core`: headless editor 内核
- `@mxm-editor/extension-*`: 节点 / mark 扩展
- `@mxm-editor/markdown`: Markdown 编解码层
- `@mxm-editor/starter-kit`: 预组装扩展集合
- `@mxm-editor/react`: React 适配层
- `apps/playground`: Vite 示例应用

## 快速开始

```bash
pnpm install
pnpm dev
```

## 当前范围

这版是“架构复刻”优先的最小实现，不追求 Tiptap 全量能力，但已经具备：

- 基于 ProseMirror 的 headless editor
- Extension / Node / Mark 分层
- command / chain / can 模式
- 独立的 `history / italic / link / collaboration` 扩展包
- Markdown 导入导出
- NodeView 注册能力
- starter-kit 组装
- React `useEditor` + `EditorContent`
- Vite playground 示例
