import { Mathematics } from "@tiptap/extension-mathematics";
import { useWritingStudioMathEditor } from "../math/useMathEditor";

export const useWritingStudioMathematicsExtension = () => {
  const { openMathEditor } = useWritingStudioMathEditor();

  return Mathematics.configure({
    blockOptions: {
      onClick: (node, pos) => {
        openMathEditor({
          kind: "block",
          latex: node.attrs.latex,
          pos,
        });
      },
    },
    inlineOptions: {
      onClick: (node, pos) => {
        openMathEditor({
          kind: "inline",
          latex: node.attrs.latex,
          pos,
        });
      },
    },
    katexOptions: {
      throwOnError: false,
      strict: "ignore",
    },
  });
};
