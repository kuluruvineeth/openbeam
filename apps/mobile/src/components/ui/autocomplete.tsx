import { File, Folder } from "lucide-react-native";
import { useCallback, useEffect, useRef } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { Theme } from "@/styles/theme";
import { getAutocompleteScrollOffset } from "./autocomplete-utils";

export interface AutocompleteOption {
  id: string;
  label: string;
  detail?: string;
  description?: string;
  kind?: "command" | "file" | "directory";
}

interface AutocompleteProps {
  options: readonly AutocompleteOption[];
  selectedIndex: number;
  onSelect: (option: AutocompleteOption) => void;
  isLoading?: boolean;
  errorMessage?: string;
  loadingText?: string;
  emptyText?: string;
  maxHeight?: number;
}

// biome-ignore lint/suspicious/noMisleadingCharacterClass: necessary for this context
const BOLT_GLYPH_PATTERN = /[\u26A1\uFE0F]/g;

function removeBoltGlyphs(value?: string): string | undefined {
  if (!value) {
    return value;
  }
  const cleaned = value.replace(BOLT_GLYPH_PATTERN, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function Autocomplete({
  options,
  selectedIndex,
  onSelect,
  isLoading = false,
  errorMessage,
  loadingText = "Loading...",
  emptyText = "No results found",
  maxHeight = 220,
}: AutocompleteProps) {
  const { theme } = useUnistyles();
  const scrollRef = useRef<ScrollView>(null);
  const rowLayoutsRef = useRef<Map<number, { top: number; height: number }>>(
    new Map()
  );
  const viewportHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);

  const ensureActiveItemVisible = useCallback(() => {
    if (selectedIndex < 0) {
      return;
    }

    const layout = rowLayoutsRef.current.get(selectedIndex);
    if (!layout) {
      return;
    }

    const nextOffset = getAutocompleteScrollOffset({
      currentOffset: scrollOffsetRef.current,
      viewportHeight: viewportHeightRef.current,
      itemTop: layout.top,
      itemHeight: layout.height,
    });

    if (Math.abs(nextOffset - scrollOffsetRef.current) < 1) {
      return;
    }

    scrollOffsetRef.current = nextOffset;
    scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
  }, [selectedIndex]);

  const pinToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  useEffect(() => {
    rowLayoutsRef.current.clear();
    scrollOffsetRef.current = 0;
  }, []);

  useEffect(() => {
    if (options.length === 0) {
      return;
    }
    pinToBottom();
  }, [options, pinToBottom]);

  useEffect(() => {
    const raf = requestAnimationFrame(ensureActiveItemVisible);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [ensureActiveItemVisible]);

  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      ensureActiveItemVisible();
    },
    [ensureActiveItemVisible]
  );

  const handleRowLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      rowLayoutsRef.current.set(index, {
        top: event.nativeEvent.layout.y,
        height: event.nativeEvent.layout.height,
      });
      ensureActiveItemVisible();
    },
    [ensureActiveItemVisible]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { maxHeight }]}>
        <View style={styles.emptyItem}>
          <Text style={styles.emptyText}>{loadingText}</Text>
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={[styles.container, { maxHeight }]}>
        <View style={styles.emptyItem}>
          <Text style={styles.emptyText}>Error: {errorMessage}</Text>
        </View>
      </View>
    );
  }

  if (options.length === 0) {
    return (
      <View style={[styles.container, { maxHeight }]}>
        <View style={styles.emptyItem}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { maxHeight }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        onContentSizeChange={pinToBottom}
        onLayout={handleScrollViewLayout}
        onScroll={(event) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        ref={scrollRef}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;
          const optionLabel = removeBoltGlyphs(option.label) ?? option.label;
          const optionDetail = removeBoltGlyphs(option.detail);
          const optionDescription = removeBoltGlyphs(option.description);
          return (
            <Pressable
              key={option.id}
              onLayout={(event) => handleRowLayout(index, event)}
              onPress={() => onSelect(option)}
              style={({ hovered = false, pressed }) => [
                styles.item,
                (hovered || pressed || isSelected) && styles.itemActive,
              ]}
            >
              {option.kind === "directory" || option.kind === "file" ? (
                <View style={styles.itemLeading}>
                  {option.kind === "directory" ? (
                    <Folder color={theme.colors.foregroundMuted} size={14} />
                  ) : (
                    <File color={theme.colors.foregroundMuted} size={14} />
                  )}
                </View>
              ) : null}
              <View style={styles.itemMain}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemLabel}>{optionLabel}</Text>
                  {optionDetail ? (
                    <Text style={styles.itemDetail}>{optionDetail}</Text>
                  ) : null}
                </View>
                {optionDescription ? (
                  <Text numberOfLines={1} style={styles.itemDescription}>
                    {optionDescription}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create(((theme: Theme) => ({
  container: {
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing[1],
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  itemLeading: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing[1],
  },
  itemActive: {
    backgroundColor: theme.colors.surface1,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  itemLabel: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
  itemDetail: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
  },
  itemDescription: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  emptyItem: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
})) as any) as Record<string, any>;
