# 架构映射

当前仓库按 Tiptap 的核心分层做了最小复刻：

1. `@mxm-editor/pm`
   统一导出 ProseMirror 依赖，避免上层直接散落引用底层包。
2. `@mxm-editor/core`
   提供 `Editor`、`ExtensionManager`、`CommandManager`、`Extension`、`Node`、`Mark` 和 `NodeView` 注册能力。
3. `@mxm-editor/extension-*`
   每个能力一个包，方便独立演进和组合。
4. `@mxm-editor/markdown`
   负责 Markdown 导入导出，当前是“扩展参与序列化 + marked 解析导入”的轻量实现。
5. `@mxm-editor/starter-kit`
   把基础节点、mark、历史能力打包成一个可开箱即用的能力集。
6. `@mxm-editor/react`
   负责把 headless editor 挂到 React 组件树。
7. `apps/playground`
   用 Vite 展示编辑器运行效果。

## 和 Tiptap 的差异

- 这版暂未实现 input rules、paste rules、React/Vue 风格的 portal node view 渲染。
- 包导出当前以“源码优先”开发体验为主，没有先做 npm 发布级别的构建产物。
- 重点是先把 monorepo 与运行时主链路搭稳，后续再逐层补功能。
