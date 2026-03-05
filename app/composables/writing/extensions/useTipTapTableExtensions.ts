import { TableKit } from "@tiptap/extension-table";

export const useTipTapTableExtensions = () => {
    return [
        TableKit.configure({
            table: {
                resizable: true,
                HTMLAttributes: {
                    class: "ws-table",
                },
            },
        }),
    ];
};
