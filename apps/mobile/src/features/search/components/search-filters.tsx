import { Calendar, ChevronDown, FileText, X } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import {
  DATE_RANGE_LABELS,
  DATE_RANGE_OPTIONS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_OPTIONS,
} from "../constants";
import type { DateRangeType } from "../types";
import { FilterChip } from "./filter-chip";

type SearchFiltersProps = {
  documentTypes: string[];
  onDocumentTypesChange: (value: string[]) => void;
  authors: string[];
  onAuthorsChange: (value: string[]) => void;
  dateRange: DateRangeType | null;
  onDateRangeChange: (value: DateRangeType | null) => void;
  onClearAll: () => void;
  activeFilterCount: number;
};

type FilterDropdownProps = {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
};

function FilterDropdown({
  label,
  icon,
  isActive,
  onPress,
}: FilterDropdownProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
    >
      {icon}
      <Text
        style={isActive ? styles.filterTextActive : styles.filterText}
        variant="caption"
      >
        {label}
      </Text>
      <ChevronDown
        color={isActive ? "#3b82f6" : "#9ca3af"}
        size={12}
        strokeWidth={1.5}
      />
    </Pressable>
  );
}

export function SearchFilters({
  documentTypes,
  onDocumentTypesChange,
  dateRange,
  onDateRangeChange,
  onClearAll,
  activeFilterCount,
}: SearchFiltersProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.filtersRow}>
          <FilterDropdown
            icon={
              <FileText
                color={
                  documentTypes.length > 0
                    ? theme.colors.primary
                    : theme.colors.mutedForeground
                }
                size={14}
                strokeWidth={1.5}
              />
            }
            isActive={documentTypes.length > 0}
            label={
              documentTypes.length > 0
                ? `Type (${documentTypes.length})`
                : "Type"
            }
            onPress={() => {
              if (documentTypes.length > 0) {
                onDocumentTypesChange([]);
              } else {
                onDocumentTypesChange([DOCUMENT_TYPE_OPTIONS[0]]);
              }
            }}
          />

          <FilterDropdown
            icon={
              <Calendar
                color={
                  dateRange
                    ? theme.colors.primary
                    : theme.colors.mutedForeground
                }
                size={14}
                strokeWidth={1.5}
              />
            }
            isActive={!!dateRange}
            label={dateRange ? DATE_RANGE_LABELS[dateRange] : "Date"}
            onPress={() => {
              if (dateRange) {
                const currentIndex = DATE_RANGE_OPTIONS.indexOf(dateRange);
                const nextIndex =
                  (currentIndex + 1) % DATE_RANGE_OPTIONS.length;
                onDateRangeChange(DATE_RANGE_OPTIONS[nextIndex]);
              } else {
                onDateRangeChange("last_7_days");
              }
            }}
          />

          {activeFilterCount > 0 && (
            <Pressable onPress={onClearAll} style={styles.clearButton}>
              <X
                color={theme.colors.mutedForeground}
                size={12}
                strokeWidth={1.5}
              />
              <Text muted variant="caption">
                Clear ({activeFilterCount})
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {activeFilterCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScrollView}
        >
          <View style={styles.chipsRow}>
            {documentTypes.map((type) => (
              <FilterChip
                key={`doctype-${type}`}
                label={DOCUMENT_TYPE_LABELS[type] ?? type}
                onRemove={() =>
                  onDocumentTypesChange(documentTypes.filter((t) => t !== type))
                }
              />
            ))}
            {dateRange && (
              <FilterChip
                label={DATE_RANGE_LABELS[dateRange]}
                onRemove={() => onDateRangeChange(null)}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[2],
  },
  scrollView: {
    flexGrow: 0,
  },
  filtersRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  filterText: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  chipsScrollView: {
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.spacing[4],
  },
}));
