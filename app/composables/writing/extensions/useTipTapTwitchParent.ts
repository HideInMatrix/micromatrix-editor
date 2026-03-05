export const useTipTapTwitchParent = () => {
    return import.meta.client ? window.location.hostname : "localhost";
};
