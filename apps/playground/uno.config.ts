import { defineConfig } from "unocss";
import presetWind4 from "@unocss/preset-wind4";

export default defineConfig({
  presets: [presetWind4()],
  shortcuts: {
    "ui-shell":
      "relative overflow-hidden rounded-[32px] backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.45)]",
    "ui-toolbar-strip": "flex min-w-max items-center gap-3",
    "ui-toolbar-group": "flex items-center gap-1",
    "ui-divider": "h-6 w-px shrink-0",
    "ui-icon-button":
      "inline-flex h-9 w-9 items-center justify-center rounded-xl transition duration-150",
    "ui-add-button":
      "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition duration-150",
  },
});
