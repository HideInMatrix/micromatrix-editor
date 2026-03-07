import type { WritingStudioImageUploader } from "../actions/useOtherActions";

const resolveUploadResponseUrl = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const topLevelUrl = record.url ?? record.src;

  if (typeof topLevelUrl === "string" && topLevelUrl.trim().length > 0) {
    return topLevelUrl;
  }

  const nestedData = record.data;
  if (nestedData && typeof nestedData === "object") {
    const nestedRecord = nestedData as Record<string, unknown>;
    const nestedUrl = nestedRecord.url ?? nestedRecord.src;

    if (typeof nestedUrl === "string" && nestedUrl.trim().length > 0) {
      return nestedUrl;
    }
  }

  return null;
};

const createImageApiUploader = (endpoint: string): WritingStudioImageUploader => {
  return (file, onProgress) =>
    new Promise((resolve, reject) => {
      if (!import.meta.client) {
        reject(new Error("Image upload API is only available on client."));
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);
      xhr.responseType = "json";

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }

        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      };

      xhr.onerror = () => {
        reject(new Error("Image upload request failed."));
      };

      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(`Image upload failed with status ${xhr.status}.`));
          return;
        }

        let payload: unknown = xhr.response;
        if (!payload && xhr.responseText) {
          try {
            payload = JSON.parse(xhr.responseText);
          } catch {
            payload = null;
          }
        }

        const imageUrl = resolveUploadResponseUrl(payload);
        if (!imageUrl) {
          reject(new Error("Image upload response does not contain url/src."));
          return;
        }

        onProgress(100);
        resolve({
          src: imageUrl,
          alt: file.name || undefined,
        });
      };

      const formData = new FormData();
      formData.append("file", file);
      xhr.send(formData);
    });
};

export const useWritingStudioImageApiUploader = () => {
  const runtimeConfig = useRuntimeConfig();
  const endpointValue = (runtimeConfig.public as Record<string, unknown>).writingStudioImageUploadEndpoint;
  const endpoint = typeof endpointValue === "string" ? endpointValue.trim() : "";

  if (!import.meta.client || !endpoint) {
    return {
      uploader: undefined as WritingStudioImageUploader | undefined,
      isApiUploadEnabled: false,
    };
  }

  return {
    uploader: createImageApiUploader(endpoint),
    isApiUploadEnabled: true,
  };
};
