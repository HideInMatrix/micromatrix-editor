export const TWITCH_REGEX =
  /^(https?:\/\/)?(www\.)?(twitch\.tv|clips\.twitch\.tv)\/(?:videos\/(\d+)|(\w+)\/clip\/([\w-]+)|([\w-]+)(?:\/)?)?(\?.*)?$/;

export const TWITCH_REGEX_GLOBAL =
  /^(https?:\/\/)?(www\.)?(twitch\.tv|clips\.twitch\.tv)\/(?:videos\/(\d+)|(\w+)\/clip\/([\w-]+)|([\w-]+)(?:\/)?)?(\?.*)?$/g;

export function isValidTwitchUrl(url: string) {
  return url.match(TWITCH_REGEX);
}

export interface GetEmbedUrlOptions {
  url: string;
  allowFullscreen?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  time?: string;
  parent?: string;
}

export function getTwitchIdentifier(url: string) {
  if (!isValidTwitchUrl(url)) {
    return null;
  }

  const cleanUrl = url.split("?")[0];

  if (cleanUrl.includes("clips.twitch.tv/")) {
    const clipRegex = /clips\.twitch\.tv\/([\w-]+)/;
    const match = cleanUrl.match(clipRegex);

    return match ? { type: "clip" as const, id: match[1] } : null;
  }

  if (cleanUrl.includes("twitch.tv/")) {
    const videoRegex = /twitch\.tv\/videos\/(\d+)/;
    const videoMatch = cleanUrl.match(videoRegex);

    if (videoMatch) {
      return { type: "video" as const, id: videoMatch[1] };
    }

    const channelClipRegex = /twitch\.tv\/([\w-]+)\/clip\/([\w-]+)/;
    const clipMatch = cleanUrl.match(channelClipRegex);

    if (clipMatch) {
      return { type: "clip" as const, id: clipMatch[2] };
    }

    const channelRegex = /twitch\.tv\/([\w-]+)(?:\/)?$/;
    const channelMatch = cleanUrl.match(channelRegex);

    if (channelMatch) {
      return { type: "channel" as const, id: channelMatch[1] };
    }
  }

  return null;
}

export function getEmbedUrlFromTwitchUrl(options: GetEmbedUrlOptions) {
  const {
    url,
    allowFullscreen = true,
    autoplay = false,
    muted = false,
    time,
    parent,
  } = options;
  const identifier = getTwitchIdentifier(url);

  if (!identifier) {
    return null;
  }

  const parentDomain = parent || "localhost";

  if (identifier.type === "clip") {
    const clipUrl = new URL("https://clips.twitch.tv/embed");

    clipUrl.searchParams.set("clip", identifier.id);
    clipUrl.searchParams.set("parent", parentDomain);

    if (autoplay) {
      clipUrl.searchParams.set("autoplay", "true");
    }

    if (muted) {
      clipUrl.searchParams.set("muted", "true");
    }

    return clipUrl.toString();
  }

  if (identifier.type === "video") {
    const videoUrl = new URL("https://player.twitch.tv/");

    videoUrl.searchParams.set("video", identifier.id);
    videoUrl.searchParams.set("parent", parentDomain);

    if (allowFullscreen) {
      videoUrl.searchParams.set("allowfullscreen", "true");
    }

    if (autoplay) {
      videoUrl.searchParams.set("autoplay", "true");
    }

    if (muted) {
      videoUrl.searchParams.set("muted", "true");
    }

    if (time) {
      videoUrl.searchParams.set("time", time);
    }

    return videoUrl.toString();
  }

  const channelUrl = new URL("https://player.twitch.tv/");

  channelUrl.searchParams.set("channel", identifier.id);
  channelUrl.searchParams.set("parent", parentDomain);

  if (allowFullscreen) {
    channelUrl.searchParams.set("allowfullscreen", "true");
  }

  if (autoplay) {
    channelUrl.searchParams.set("autoplay", "true");
  }

  if (muted) {
    channelUrl.searchParams.set("muted", "true");
  }

  return channelUrl.toString();
}
