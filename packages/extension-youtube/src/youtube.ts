import { Node, mergeAttributes, nodePasteRule } from "@mxm-editor/core";
import {
  getEmbedUrlFromYoutubeUrl,
  isValidYoutubeUrl,
  YOUTUBE_REGEX_GLOBAL,
} from "./utils";

export interface YoutubeOptions {
  addPasteHandler: boolean;
  allowFullscreen: boolean;
  autoplay: boolean;
  ccLanguage?: string;
  ccLoadPolicy?: boolean;
  controls: boolean;
  disableKBcontrols: boolean;
  enableIFrameApi: boolean;
  endTime: number;
  height: number;
  interfaceLanguage?: string;
  ivLoadPolicy: number;
  loop: boolean;
  modestBranding: boolean;
  HTMLAttributes: Record<string, string>;
  inline: boolean;
  nocookie: boolean;
  origin: string;
  playlist: string;
  progressBarColor?: string;
  width: number;
  rel: number;
}

export interface SetYoutubeVideoOptions {
  src: string;
  width?: number;
  height?: number;
  start?: number;
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

function serializeHTMLAttributes(attributes: Record<string, string | undefined>) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${String(value).replace(/"/g, "&quot;")}"`)
    .join("");
}

export const Youtube = Node.create<YoutubeOptions>({
  name: "youtube",

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
      ccLanguage: undefined,
      ccLoadPolicy: undefined,
      controls: true,
      disableKBcontrols: false,
      enableIFrameApi: false,
      endTime: 0,
      height: 480,
      interfaceLanguage: undefined,
      ivLoadPolicy: 0,
      loop: false,
      modestBranding: false,
      HTMLAttributes: {},
      inline: false,
      nocookie: false,
      origin: "",
      playlist: "",
      progressBarColor: undefined,
      width: 640,
      rel: 1,
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      start: {
        default: 0,
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
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-youtube-video] iframe",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const embedUrl = getEmbedUrlFromYoutubeUrl({
      url: HTMLAttributes.src,
      allowFullscreen: this.options.allowFullscreen,
      autoplay: this.options.autoplay,
      ccLanguage: this.options.ccLanguage,
      ccLoadPolicy: this.options.ccLoadPolicy,
      controls: this.options.controls,
      disableKBcontrols: this.options.disableKBcontrols,
      enableIFrameApi: this.options.enableIFrameApi,
      endTime: this.options.endTime,
      interfaceLanguage: this.options.interfaceLanguage,
      ivLoadPolicy: this.options.ivLoadPolicy,
      loop: this.options.loop,
      modestBranding: this.options.modestBranding,
      nocookie: this.options.nocookie,
      origin: this.options.origin,
      playlist: this.options.playlist,
      progressBarColor: this.options.progressBarColor,
      startAt: Number(HTMLAttributes.start ?? 0),
      rel: this.options.rel,
    });

    return [
      "div",
      { "data-youtube-video": "" },
      [
        "iframe",
        mergeAttributes(
          this.options.HTMLAttributes,
          {
            width: String(this.options.width),
            height: String(this.options.height),
            allowfullscreen: this.options.allowFullscreen ? "true" : undefined,
            autoplay: this.options.autoplay ? "true" : undefined,
            cclanguage: this.options.ccLanguage,
            ccloadpolicy: this.options.ccLoadPolicy ? "true" : undefined,
            disablekbcontrols: this.options.disableKBcontrols
              ? "true"
              : undefined,
            enableiframeapi: this.options.enableIFrameApi ? "true" : undefined,
            endtime: this.options.endTime ? String(this.options.endTime) : undefined,
            interfacelanguage: this.options.interfaceLanguage,
            ivloadpolicy: String(this.options.ivLoadPolicy),
            loop: this.options.loop ? "true" : undefined,
            modestbranding: this.options.modestBranding ? "true" : undefined,
            origin: this.options.origin || undefined,
            playlist: this.options.playlist || undefined,
            progressbarcolor: this.options.progressBarColor,
            rel: String(this.options.rel),
          },
          {
            ...HTMLAttributes,
            src: embedUrl ?? undefined,
          },
        ),
      ],
    ];
  },

  renderMarkdown({ node }) {
    const embedUrl = getEmbedUrlFromYoutubeUrl({
      url: String(node.attrs?.src ?? ""),
      allowFullscreen: this.options.allowFullscreen,
      autoplay: this.options.autoplay,
      ccLanguage: this.options.ccLanguage,
      ccLoadPolicy: this.options.ccLoadPolicy,
      controls: this.options.controls,
      disableKBcontrols: this.options.disableKBcontrols,
      enableIFrameApi: this.options.enableIFrameApi,
      endTime: this.options.endTime,
      interfaceLanguage: this.options.interfaceLanguage,
      ivLoadPolicy: this.options.ivLoadPolicy,
      loop: this.options.loop,
      modestBranding: this.options.modestBranding,
      nocookie: this.options.nocookie,
      origin: this.options.origin,
      playlist: this.options.playlist,
      progressBarColor: this.options.progressBarColor,
      startAt: Number(node.attrs?.start ?? 0),
      rel: this.options.rel,
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
          start: Number(node.attrs?.start ?? 0)
            ? String(node.attrs?.start)
            : undefined,
        },
      ),
    );

    return `<div data-youtube-video=""><iframe${iframeAttributes}></iframe></div>\n\n`;
  },

  addCommands() {
    return {
      setYoutubeVideo:
        (options: SetYoutubeVideoOptions) =>
        ({ commands }) => {
          if (!isValidYoutubeUrl(options.src)) {
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
        find: YOUTUBE_REGEX_GLOBAL,
        type,
        getAttributes: (match) => ({
          src: match.input ?? match[0],
        }),
      }),
    ];
  },
});
