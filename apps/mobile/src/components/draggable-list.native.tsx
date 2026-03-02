import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useUnistyles } from "react-native-unistyles";
import type {
  DraggableListProps,
  DraggableRenderItemInfo,
} from "./draggable-list.types";

export type { DraggableListProps, DraggableRenderItemInfo };

export function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  style,
  contentContainerStyle,
  testID,
  ListFooterComponent,
  ListHeaderComponent,
  ListEmptyComponent,
  showsVerticalScrollIndicator = true,
  enableDesktopWebScrollbar: _enableDesktopWebScrollbar = false,
  refreshing,
  onRefresh,
  simultaneousGestureRef,
  waitFor,
}: DraggableListProps<T>) {
  const { theme } = useUnistyles();
  const [isDragging, setIsDragging] = useState(false);

  // Pass the ref directly to DraggableFlatList - it handles the gesture coordination
  // The ref may not have .current set yet, but that's okay - DraggableFlatList will
  // read it when the gesture is being recognized
  const simultaneousHandlers = simultaneousGestureRef
    ? [simultaneousGestureRef]
    : undefined;

  const handleRenderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<T>) => {
      const index = getIndex() ?? 0;
      const info: DraggableRenderItemInfo<T> = {
        item,
        index,
        drag,
        isActive,
      };
      return renderItem(info);
    },
    [renderItem]
  );

  const handleDragEnd = useCallback(
    ({ data: newData }: { data: T[] }) => {
      setIsDragging(false);
      onDragEnd(newData);
    },
    [onDragEnd]
  );

  const handleDragBegin = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleRelease = useCallback(() => {
    setIsDragging(false);
  }, []);

  const showRefreshControl =
    Boolean(onRefresh) && (!isDragging || Boolean(refreshing));
  const waitForProps = waitFor ? ({ waitFor } as const) : {};

  return (
    <DraggableFlatList
      activationDistance={20}
      containerStyle={{ flex: 1 }}
      contentContainerStyle={contentContainerStyle}
      data={data}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      ListHeaderComponent={ListHeaderComponent}
      onDragBegin={handleDragBegin}
      onDragEnd={handleDragEnd}
      onRelease={handleRelease}
      refreshControl={
        showRefreshControl ? (
          <RefreshControl
            colors={[theme.colors.foregroundMuted]}
            onRefresh={onRefresh}
            refreshing={refreshing ?? false}
            tintColor={theme.colors.foregroundMuted}
          />
        ) : undefined
      }
      renderItem={handleRenderItem}
      // Higher activationDistance prevents drag from interfering with nested onLongPress handlers
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      simultaneousHandlers={simultaneousHandlers}
      style={style}
      testID={testID}
      {...waitForProps}
    />
  );
}
