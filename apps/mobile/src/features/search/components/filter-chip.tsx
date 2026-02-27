import { X } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";

type FilterChipProps = {
  label: string;
  onRemove: () => void;
};

export function FilterChip({ label, onRemove }: FilterChipProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.chip}>
      <Text style={styles.label} variant="caption">
        {label}
      </Text>
      <Pressable hitSlop={8} onPress={onRemove}>
        <X color={theme.colors.mutedForeground} size={10} strokeWidth={1.5} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: theme.spacing[1],
    borderRadius: 6,
    backgroundColor: `${theme.colors.primary}10`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}20`,
  },
  label: {
    color: theme.colors.primary,
    fontSize: 11,
  },
}));
