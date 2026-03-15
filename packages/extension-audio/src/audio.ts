import { Node, mergeAttributes, nodePasteRule } from "@mxm-editor/core";
import { AUDIO_URL_REGEX_GLOBAL, isValidAudioUrl, sanitizeAudioSrc } from "./utils";

export interface AudioOptions {
  addPasteHandler: boolean;
  allowBase64: boolean;
  autoplay: boolean;
  controls: boolean;
  loop: boolean;
  muted: boolean;
  preload: "auto" | "metadata" | "none" | null;
  controlslist?: string;
  crossorigin?: "" | "anonymous" | "use-credentials";
  disableRemotePlayback: boolean;
  HTMLAttributes: Record<string, string>;
  inline: boolean;
}

export interface SetAudioOptions {
  src: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  preload?: "auto" | "metadata" | "none" | null;
  controlslist?: string;
  crossorigin?: "" | "anonymous" | "use-credentials";
  disableremoteplayback?: boolean;
}

function renderBooleanAttribute(
  name: string,
  value: unknown,
): Record<string, string> {
  return value ? { [name]: name } : {};
}

function serializeHTMLAttributes(attributes: Record<string, string | undefined>) {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` ${name}="${String(value).replace(/"/g, "&quot;")}"`)
    .join("");
}

function getBooleanAttribute(element: HTMLElement, name: string) {
  return element.hasAttribute(name);
}

function getStringAttribute(
  element: HTMLElement,
  name: string,
  fallback: string | null | undefined,
) {
  return element.getAttribute(name) ?? fallback ?? null;
}

export const Audio = Node.create<AudioOptions>({
  name: "audio",

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      addPasteHandler: true,
      allowBase64: false,
      autoplay: false,
      controls: true,
      loop: false,
      muted: false,
      preload: "metadata",
      controlslist: undefined,
      crossorigin: undefined,
      disableRemotePlayback: false,
      HTMLAttributes: {},
      inline: false,
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          sanitizeAudioSrc(
            element.getAttribute("src"),
            this.options.allowBase64,
          ),
      },
      controls: {
        default: this.options.controls,
        parseHTML: (element) => getBooleanAttribute(element, "controls"),
        renderHTML: (attributes) =>
          renderBooleanAttribute("controls", attributes.controls),
      },
      autoplay: {
        default: this.options.autoplay,
        parseHTML: (element) => getBooleanAttribute(element, "autoplay"),
        renderHTML: (attributes) =>
          renderBooleanAttribute("autoplay", attributes.autoplay),
      },
      loop: {
        default: this.options.loop,
        parseHTML: (element) => getBooleanAttribute(element, "loop"),
        renderHTML: (attributes) =>
          renderBooleanAttribute("loop", attributes.loop),
      },
      muted: {
        default: this.options.muted,
        parseHTML: (element) => getBooleanAttribute(element, "muted"),
        renderHTML: (attributes) =>
          renderBooleanAttribute("muted", attributes.muted),
      },
      preload: {
        default: this.options.preload,
        parseHTML: (element) =>
          getStringAttribute(element, "preload", this.options.preload),
        renderHTML: (attributes): Record<string, string> =>
          attributes.preload ? { preload: String(attributes.preload) } : {},
      },
      controlslist: {
        default: this.options.controlslist,
        parseHTML: (element) =>
          getStringAttribute(
            element,
            "controlslist",
            this.options.controlslist,
          ),
      },
      crossorigin: {
        default: this.options.crossorigin,
        parseHTML: (element) =>
          getStringAttribute(
            element,
            "crossorigin",
            this.options.crossorigin,
          ),
      },
      disableremoteplayback: {
        default: this.options.disableRemotePlayback,
        parseHTML: (element) =>
          getBooleanAttribute(element, "disableremoteplayback"),
        renderHTML: (attributes) =>
          renderBooleanAttribute(
            "disableremoteplayback",
            attributes.disableremoteplayback,
          ),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? "audio[src]"
          : 'audio[src]:not([src^="data:"])',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) {
            return false;
          }

          return sanitizeAudioSrc(
            node.getAttribute("src"),
            this.options.allowBase64,
          )
            ? null
            : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = sanitizeAudioSrc(
      HTMLAttributes.src,
      this.options.allowBase64,
    );

    return [
      "audio",
      mergeAttributes(this.options.HTMLAttributes, {
        ...HTMLAttributes,
        src: src ?? undefined,
      }),
    ];
  },

  renderMarkdown({ node }) {
    const src = sanitizeAudioSrc(
      typeof node.attrs?.src === "string" ? node.attrs.src : null,
      this.options.allowBase64,
    );

    if (!src) {
      return "";
    }

    const attributes = serializeHTMLAttributes({
      src,
      controls: node.attrs?.controls ? "controls" : undefined,
      autoplay: node.attrs?.autoplay ? "autoplay" : undefined,
      loop: node.attrs?.loop ? "loop" : undefined,
      muted: node.attrs?.muted ? "muted" : undefined,
      preload:
        typeof node.attrs?.preload === "string" ? node.attrs.preload : undefined,
      controlslist:
        typeof node.attrs?.controlslist === "string"
          ? node.attrs.controlslist
          : undefined,
      crossorigin:
        typeof node.attrs?.crossorigin === "string"
          ? node.attrs.crossorigin
          : undefined,
      disableremoteplayback: node.attrs?.disableremoteplayback
        ? "disableremoteplayback"
        : undefined,
    });

    return `<audio${attributes}></audio>\n\n`;
  },

  addCommands() {
    return {
      setAudio:
        (options: SetAudioOptions) =>
        ({ commands }) => {
          if (!isValidAudioUrl(options.src, this.options.allowBase64)) {
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
        find: AUDIO_URL_REGEX_GLOBAL,
        type,
        getAttributes: (match) => ({
          src: match[0],
        }),
      }),
    ];
  },
});
