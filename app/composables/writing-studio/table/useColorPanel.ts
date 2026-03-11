import type { MaybeRefOrGetter } from "vue";
import { computed, toValue } from "vue";
import {
  useWritingStudioTableColumnColors,
  type WritingStudioTableCellColorValue,
  type WritingStudioTableColorKind,
} from "./useTableOperations";

export type WritingStudioTableColorPanelEntry = {
  kind: WritingStudioTableColorKind;
  value: WritingStudioTableCellColorValue;
  label: string;
  labelKey: string;
  textColor: string | null;
  backgroundColor: string | null;
};

export type WritingStudioTableColorPanelSection = {
  kind: WritingStudioTableColorKind;
  title: string;
  titleKey: string;
  entries: WritingStudioTableColorPanelEntry[];
};

const TABLE_COLOR_PANEL_KIND_ORDER = ["text", "background"] as const satisfies WritingStudioTableColorKind[];

const TABLE_COLOR_PANEL_TITLE_KEYS = {
  text: "writingStudio.toolbar.table.columnMenu.colors.text.title",
  background: "writingStudio.toolbar.table.columnMenu.colors.background.title",
} satisfies Record<WritingStudioTableColorKind, string>;

export const useWritingStudioTableColorPanel = (options?: {
  searchQuery?: MaybeRefOrGetter<string | undefined>;
  kinds?: MaybeRefOrGetter<WritingStudioTableColorKind[] | undefined>;
}) => {
  const { t } = useI18n();
  const colorPresets = useWritingStudioTableColumnColors();

  const enabledKinds = computed<WritingStudioTableColorKind[]>(() => {
    const providedKinds = toValue(options?.kinds);

    if (!providedKinds || providedKinds.length === 0) {
      return [...TABLE_COLOR_PANEL_KIND_ORDER];
    }

    return TABLE_COLOR_PANEL_KIND_ORDER.filter(kind => providedKinds.includes(kind));
  });

  const normalizedSearchQuery = computed(() => {
    return (toValue(options?.searchQuery) ?? "").trim().toLowerCase();
  });

  const resolveEntriesForKind = (kind: WritingStudioTableColorKind): WritingStudioTableColorPanelEntry[] => {
    const query = normalizedSearchQuery.value;
    const entries = Object.entries(colorPresets[kind]) as Array<
      [WritingStudioTableCellColorValue, (typeof colorPresets)[typeof kind][WritingStudioTableCellColorValue]]
    >;

    return entries
      .filter(([, preset]) => {
        if (!query) {
          return true;
        }

        return t(preset.labelKey).toLowerCase().includes(query);
      })
      .map(([value, preset]) => ({
        kind,
        value,
        label: t(preset.labelKey),
        labelKey: preset.labelKey,
        textColor: preset.textColor,
        backgroundColor: preset.backgroundColor,
      }));
  };

  const entriesByKind = computed(() => {
    return {
      text: resolveEntriesForKind("text"),
      background: resolveEntriesForKind("background"),
    } satisfies Record<WritingStudioTableColorKind, WritingStudioTableColorPanelEntry[]>;
  });

  const colorSections = computed<WritingStudioTableColorPanelSection[]>(() => {
    return enabledKinds.value
      .map(kind => ({
        kind,
        title: t(TABLE_COLOR_PANEL_TITLE_KEYS[kind]),
        titleKey: TABLE_COLOR_PANEL_TITLE_KEYS[kind],
        entries: entriesByKind.value[kind],
      }))
      .filter(section => section.entries.length > 0);
  });

  const hasVisibleEntries = (kind: WritingStudioTableColorKind) => {
    return entriesByKind.value[kind].length > 0;
  };

  return {
    colorSections,
    entriesByKind,
    hasVisibleEntries,
  };
};
