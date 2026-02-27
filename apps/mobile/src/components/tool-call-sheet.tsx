import {
  BottomSheetBackdrop,
  type BottomSheetBackgroundProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { ToolCallDetail } from "@server/server/agent/agent-sdk-types";
import { X } from "lucide-react-native";
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { resolveToolCallIcon } from "@/utils/tool-call-icon";
import { ToolCallDetailsContent } from "./tool-call-details";

// ----- Types -----

export type ToolCallSheetData = {
  toolName: string;
  displayName: string;
  summary?: string;
  detail?: ToolCallDetail;
  errorText?: string;
};

interface ToolCallSheetContextValue {
  openToolCall: (data: ToolCallSheetData) => void;
  closeToolCall: () => void;
}

// ----- Context -----

const ToolCallSheetContext = createContext<ToolCallSheetContextValue | null>(
  null
);

export function useToolCallSheet(): ToolCallSheetContextValue {
  const context = useContext(ToolCallSheetContext);
  if (!context) {
    throw new Error(
      "useToolCallSheet must be used within a ToolCallSheetProvider"
    );
  }
  return context;
}

// ----- Custom Background Component -----

function _CustomSheetBackground({ style }: BottomSheetBackgroundProps) {
  const { theme } = useUnistyles();
  const containerStyle = useMemo(
    () => [style, { backgroundColor: theme.colors.surface2, borderRadius: 16 }],
    [style, theme.colors.surface2]
  );
  return <Animated.View pointerEvents="none" style={containerStyle} />;
}

// ----- Provider Component -----

interface ToolCallSheetProviderProps {
  children: ReactNode;
}

export function ToolCallSheetProvider({
  children,
}: ToolCallSheetProviderProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [sheetData, setSheetData] = React.useState<ToolCallSheetData | null>(
    null
  );

  const snapPoints = useMemo(() => ["60%", "95%"], []);

  const openToolCall = useCallback((data: ToolCallSheetData) => {
    setSheetData(data);
    bottomSheetRef.current?.present();
  }, []);

  const closeToolCall = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      setSheetData(null);
    }
  }, []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  const contextValue = useMemo(
    () => ({ openToolCall, closeToolCall }),
    [openToolCall, closeToolCall]
  );

  return (
    <ToolCallSheetContext.Provider value={contextValue}>
      {children}
      <BottomSheetModal
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        enableDynamicSizing={false}
        enablePanDownToClose
        handleIndicatorStyle={styles.handleIndicator}
        index={0}
        onChange={handleSheetChange}
        ref={bottomSheetRef}
        snapPoints={snapPoints}
      >
        {sheetData && (
          <ToolCallSheetContent data={sheetData} onClose={closeToolCall} />
        )}
      </BottomSheetModal>
    </ToolCallSheetContext.Provider>
  );
}

// ----- Sheet Content Component -----

interface ToolCallSheetContentProps {
  data: ToolCallSheetData;
  onClose: () => void;
}

function ToolCallSheetContent({ data, onClose }: ToolCallSheetContentProps) {
  const { toolName, displayName, detail, errorText } = data;

  const IconComponent = resolveToolCallIcon(toolName, detail);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconComponent color={styles.headerIcon.color} size={20} />
          <Text numberOfLines={1} style={styles.headerTitle}>
            {displayName}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X color={styles.closeIcon.color} size={20} />
        </Pressable>
      </View>

      {/* Content */}
      <BottomSheetScrollView
        contentContainerStyle={styles.contentContainer}
        style={styles.content}
      >
        <ToolCallDetailsContent
          detail={detail}
          errorText={errorText}
          fillAvailableHeight
        />
      </BottomSheetScrollView>
    </View>
  );
}

// ----- Styles -----

const styles = StyleSheet.create((theme) => ({
  sheetBackground: {
    backgroundColor: theme.colors.surface2,
  },
  handleIndicator: {
    backgroundColor: theme.colors.palette.zinc[600],
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: theme.borderWidth[1],
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flex: 1,
  },
  headerIcon: {
    color: theme.colors.foreground,
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing[2],
  },
  closeIcon: {
    color: theme.colors.foregroundMuted,
  },
  content: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.surface2,
  },
  contentContainer: {
    padding: 0,
    flexGrow: 1,
  },
}));
