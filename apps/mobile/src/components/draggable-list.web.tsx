import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  type Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactElement, useCallback, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import type {
  DraggableListProps,
  DraggableRenderItemInfo,
} from "./draggable-list.types";
import {
  useWebDesktopScrollbarMetrics,
  WebDesktopScrollbarOverlay,
} from "./web-desktop-scrollbar";

export type { DraggableListProps, DraggableRenderItemInfo };

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface SortableItemProps<T> {
  id: string;
  item: T;
  index: number;
  renderItem: (info: DraggableRenderItemInfo<T>) => ReactElement;
  activeId: string | null;
}

function SortableItem<T>({
  id,
  item,
  index,
  renderItem,
  activeId,
}: SortableItemProps<T>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const dragRef = useRef<(() => void) | null>(null);

  const drag = useCallback(() => {
    // dnd-kit handles drag initiation via listeners
    // This is a no-op but matches the mobile API
  }, []);

  // Store listeners in ref so drag handle can access them
  dragRef.current = () => {
    // Trigger drag - handled by dnd-kit's listeners
  };

  const baseTransform = CSS.Transform.toString(transform);
  const scaleTransform = isDragging ? "scale(1.02)" : "";
  const combinedTransform = [baseTransform, scaleTransform]
    .filter(Boolean)
    .join(" ");

  const style = {
    transform: combinedTransform || undefined,
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const info: DraggableRenderItemInfo<T> = {
    item,
    index,
    drag,
    isActive: activeId === id,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderItem(info)}
    </div>
  );
}

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
  enableDesktopWebScrollbar = false,
  // simultaneousGestureRef is native-only, ignored on web
}: DraggableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState(data);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollbarMetrics = useWebDesktopScrollbarMetrics();

  // Sync items with data prop
  if (data !== items && !activeId) {
    setItems(data);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex(
          (item, i) => keyExtractor(item, i) === active.id
        );
        const newIndex = items.findIndex(
          (item, i) => keyExtractor(item, i) === over.id
        );

        const newItems = arrayMove(items, oldIndex, newIndex);
        setItems(newItems);
        onDragEnd(newItems);
      }
    },
    [items, keyExtractor, onDragEnd]
  );

  const ids = items.map((item, index) => keyExtractor(item, index));
  const showCustomScrollbar = enableDesktopWebScrollbar;

  return (
    <View style={{ flex: 1, minHeight: 0, position: "relative" }}>
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        onContentSizeChange={
          showCustomScrollbar ? scrollbarMetrics.onContentSizeChange : undefined
        }
        onLayout={showCustomScrollbar ? scrollbarMetrics.onLayout : undefined}
        onScroll={showCustomScrollbar ? scrollbarMetrics.onScroll : undefined}
        ref={scrollViewRef}
        scrollEventThrottle={showCustomScrollbar ? 16 : undefined}
        showsVerticalScrollIndicator={
          showCustomScrollbar ? false : showsVerticalScrollIndicator
        }
        style={style}
        testID={testID}
      >
        {ListHeaderComponent}
        {items.length === 0 && ListEmptyComponent}
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => {
              const id = keyExtractor(item, index);
              return (
                <SortableItem
                  activeId={activeId}
                  id={id}
                  index={index}
                  item={item}
                  key={id}
                  renderItem={renderItem}
                />
              );
            })}
          </SortableContext>
        </DndContext>
        {ListFooterComponent}
      </ScrollView>
      <WebDesktopScrollbarOverlay
        enabled={showCustomScrollbar}
        metrics={scrollbarMetrics}
        onScrollToOffset={(nextOffset) => {
          scrollViewRef.current?.scrollTo({ y: nextOffset, animated: false });
        }}
      />
    </View>
  );
}
