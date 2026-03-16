import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Extensions, JSONContent } from "@mxm-editor/core";
import { generateHTML as generateBrowserHTML, generateJSON as generateBrowserJSON } from "@mxm-editor/html";
import { generateHTML as generateServerHTML, generateJSON as generateServerJSON } from "@mxm-editor/html/server";
import { Highlight } from "@mxm-editor/extension-highlight";
import { Table } from "@mxm-editor/extension-table";
import { TaskItem } from "@mxm-editor/extension-task-item";
import { TaskList } from "@mxm-editor/extension-task-list";
import { renderToHTMLString } from "@mxm-editor/static-renderer/pm/html-string";
import { renderToMarkdown } from "@mxm-editor/static-renderer/pm/markdown";
import { renderToReactElement } from "@mxm-editor/static-renderer/pm/react";
import { StarterKit } from "@mxm-editor/starter-kit";

function createExtensions(): Extensions {
  return [
    StarterKit.configure({
      undoRedo: false,
    }),
    TaskItem,
    TaskList,
    Table,
    Highlight.configure({
      multicolor: true,
    }),
  ];
}

const sampleDoc: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: {
        level: 1,
      },
      content: [
        {
          type: "text",
          text: "Static rendering",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hello ",
        },
        {
          type: "text",
          text: "world",
          marks: [{ type: "bold" }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Item one",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("P16 html/static-renderer", () => {
  it("renders ProseMirror JSON to HTML and markdown", () => {
    const extensions = createExtensions();
    const html = renderToHTMLString({
      content: sampleDoc,
      extensions,
    });
    const markdown = renderToMarkdown({
      content: sampleDoc,
      extensions,
    });

    expect(html).toContain("<h1>Static rendering</h1>");
    expect(html).toContain("<strong>world</strong>");
    expect(markdown).toContain("# Static rendering");
    expect(markdown).toContain("- Item one");
  });

  it("renders ProseMirror JSON to React elements", () => {
    const extensions = createExtensions();
    const element = renderToReactElement({
      content: sampleDoc,
      extensions,
    });
    const markup = renderToStaticMarkup(
      React.createElement(React.Fragment, {}, element),
    );

    expect(markup).toContain("<h1>Static rendering</h1>");
    expect(markup).toContain("<strong>world</strong>");
  });

  it("converts browser HTML <-> JSON", () => {
    const extensions = createExtensions();
    const html = "<p>Hello <strong>browser</strong></p>";
    const json = generateBrowserJSON(html, extensions) as JSONContent;
    const roundTrip = generateBrowserHTML(json, extensions);

    expect(json.type).toBe("doc");
    expect(roundTrip).toContain("<strong>browser</strong>");
  });

  it("converts server HTML <-> JSON", () => {
    const extensions = createExtensions();
    const html = "<p>Hello <strong>server</strong></p>";
    const json = generateServerJSON(html, extensions) as JSONContent;
    const roundTrip = generateServerHTML(json, extensions);

    expect(json.type).toBe("doc");
    expect(roundTrip).toContain("<strong>server</strong>");
  });
});
