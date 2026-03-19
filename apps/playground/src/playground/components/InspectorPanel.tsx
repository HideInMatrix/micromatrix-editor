import type { Editor } from "@mxm-editor/core";
import { useEditorInspector } from "../hooks/useEditorInspector";

export interface InspectorPanelProps {
  editor: Editor | null;
}

export function InspectorPanel({ editor }: InspectorPanelProps) {
  const { html, markdown } = useEditorInspector(editor);

  return (
    <aside className="inspector-panel">
      <h2>HTML 输出</h2>
      <pre>{html}</pre>
      <h2 className="secondary-heading">Markdown 输出</h2>
      <pre>{markdown}</pre>
    </aside>
  );
}
