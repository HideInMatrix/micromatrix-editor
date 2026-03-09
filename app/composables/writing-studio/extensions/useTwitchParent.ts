// Twitch 嵌入要求 parent 参数，客户端使用当前域名
export const useWritingStudioTwitchParent = () => {
  return import.meta.client ? window.location.hostname : "localhost";
};
