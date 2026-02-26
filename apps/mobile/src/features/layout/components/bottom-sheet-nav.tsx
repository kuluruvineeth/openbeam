import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useRef } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type BottomSheetNavProps = {
  children: React.ReactNode;
  snapPoints?: Array<string | number>;
  onClose?: () => void;
  enablePanDownToClose?: boolean;
};

export function BottomSheetNav({
  children,
  snapPoints = ["50%", "90%"],
  onClose,
  enablePanDownToClose = true,
}: BottomSheetNavProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheet
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      enablePanDownToClose={enablePanDownToClose}
      handleIndicatorStyle={styles.indicator}
      onClose={onClose}
      ref={bottomSheetRef}
      snapPoints={snapPoints}
    >
      <View style={styles.content}>{children}</View>
    </BottomSheet>
  );
}

export { BottomSheet };
export type { BottomSheetNavProps };

const styles = StyleSheet.create((theme) => ({
  background: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  indicator: {
    backgroundColor: theme.colors.border,
    width: 36,
  },
  content: {
    flex: 1,
  },
}));
