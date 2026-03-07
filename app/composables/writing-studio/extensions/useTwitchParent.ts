export const useWritingStudioTwitchParent = () => {
  return import.meta.client ? window.location.hostname : "localhost";
};
