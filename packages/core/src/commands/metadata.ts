import type {
  PluginKeySource,
  RawCommands,
} from "../types";

type MetadataCommands = Pick<RawCommands, "setMeta">;

export function createMetadataCommands(): MetadataCommands {
  return {
    setMeta:
      (key: PluginKeySource, value: unknown) =>
      ({ tr }) => {
        tr.setMeta(key, value);
        return true;
      },
  };
}
