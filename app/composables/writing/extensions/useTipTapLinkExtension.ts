import { Link } from "@tiptap/extension-link";

export const useTipTapLinkExtension = () => {
  return Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: "ws-link",
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    },
  });
};
