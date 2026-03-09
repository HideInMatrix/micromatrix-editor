import { Mathematics } from "@tiptap/extension-mathematics";

export const useWritingStudioMathematicsExtension = () => {
  return Mathematics.configure({
    katexOptions: {
      throwOnError: false,
      strict: "ignore",
    },
  });
};
