import { Node, mergeAttributes, nodePasteRule } from "@mxm-editor/core";
import {
  getEmbedUrlFromTwitchUrl,
  isValidTwitchUrl,
  TWITCH_REGEX_GLOBAL,
} from "./utils";

export interface TwitchOptions {
  addPasteHandler: boolean;
  allowFullscreen: boolean;
  autoplay: boolean;
  muted: boolean;
  time?: string;
  parent: string;
  height: number;
  width: number;
  HTMLAttributes: Record<string, string>;
  inline: boolean;
}

export interface SetTwitchVideoOptions {
  src: string;
  width?: number;
  height?: number;
  autoplay?: boolean;
  muted?: boolean;
  time?: string;
}

function parseNumberAttribute(
  element: HTMLElement,
  name: string,
  fallback: number,
) {
  const value = element.getAttribute(name);

  if (value === null) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanAttribute(element: HTMLElement, name: string) {
  return element.hasAttribute(name) || element.getAttribute(name) === "true";
}

function renderBooleanAttribute(
  name: string,
  value: unknown,
): Record<string, string> {
  return value ? { [name]: "true" } : {};
}

function serializeHTMLAttributes(attributes: Record<string, string | undefined>) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${String(value).replace(/"/g, "&quot;")}"`)
    .join("");
}

export const Twitch = Node.create<TwitchOptions>({
  name: "twitch",

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  draggable: true,

  addOptions() {
    return {
      addPasteHandler: true,
      allowFullscreen: true,
      autoplay: false,
      muted: false,
      time: undefined,
      parent: "localhost",
      height: 480,
      width: 640,
      HTMLAttributes: {},
      inline: false,
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: this.options.width,
        parseHTML: (element) =>
          parseNumberAttribute(element, "width", this.options.width),
      },
      height: {
        default: this.options.height,
        parseHTML: (element) =>
          parseNumberAttribute(element, "height", this.options.height),
      },
      autoplay: {
        default: this.options.autoplay,
        parseHTML: (element) => parseBooleanAttribute(element, "autoplay"),
        renderHTML: (attributes) =>
          renderBooleanAttribute("autoplay", attributes.autoplay),
      },
      muted: {
        default: this.options.muted,
        parseHTML: (element) => parseBooleanAttribute(element, "muted"),
        renderHTML: (attributes) =>
          renderBooleanAttribute("muted", attributes.muted),
      },
      time: {
        default: this.options.time,
        parseHTML: (element) => element.getAttribute("time") ?? this.options.time,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-twitch-video] iframe",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const embedUrl = getEmbedUrlFromTwitchUrl({
      url: HTMLAttributes.src,
      allowFullscreen: this.options.allowFullscreen,
      autoplay: HTMLAttributes.autoplay === "true" || this.options.autoplay,
      muted: HTMLAttributes.muted === "true" || this.options.muted,
      time: HTMLAttributes.time ?? this.options.time,
      parent: this.options.parent,
    });

    if (!embedUrl) {
      return ["div", "Invalid Twitch URL"];
    }

    return [
      "div",
      { "data-twitch-video": "" },
      [
        "iframe",
        mergeAttributes(
          this.options.HTMLAttributes,
          {
            width: String(this.options.width),
            height: String(this.options.height),
            allowfullscreen: this.options.allowFullscreen ? "true" : undefined,
            scrolling: "no",
            frameborder: "0",
          },
          {
            ...HTMLAttributes,
            src: embedUrl,
          },
        ),
      ],
    ];
  },

  renderMarkdown({ node }) {
    const embedUrl = getEmbedUrlFromTwitchUrl({
      url: String(node.attrs?.src ?? ""),
      allowFullscreen: this.options.allowFullscreen,
      autoplay: Boolean(node.attrs?.autoplay ?? this.options.autoplay),
      muted: Boolean(node.attrs?.muted ?? this.options.muted),
      time:
        typeof node.attrs?.time === "string" ? node.attrs.time : this.options.time,
      parent: this.options.parent,
    });

    if (!embedUrl) {
      return "";
    }

    const iframeAttributes = serializeHTMLAttributes(
      mergeAttributes(
        this.options.HTMLAttributes,
        {
          src: embedUrl,
          width: String(node.attrs?.width ?? this.options.width),
          height: String(node.attrs?.height ?? this.options.height),
          allowfullscreen: this.options.allowFullscreen ? "true" : undefined,
          scrolling: "no",
          frameborder: "0",
          autoplay: node.attrs?.autoplay ? "true" : undefined,
          muted: node.attrs?.muted ? "true" : undefined,
          time:
            typeof node.attrs?.time === "string" ? node.attrs.time : undefined,
        },
      ),
    );

    return `<div data-twitch-video=""><iframe${iframeAttributes}></iframe></div>\n\n`;
  },

  addCommands() {
    return {
      setTwitchVideo:
        (options: SetTwitchVideoOptions) =>
        ({ commands }) => {
          if (!isValidTwitchUrl(options.src)) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addPasteRules() {
    if (!this.options.addPasteHandler) {
      return [];
    }

    const type = this.editor.schema.nodes[this.name];

    if (!type) {
      return [];
    }

    return [
      nodePasteRule({
        find: TWITCH_REGEX_GLOBAL,
        type,
        getAttributes: (match) => ({
          src: match.input ?? match[0],
        }),
      }),
    ];
  },
});
