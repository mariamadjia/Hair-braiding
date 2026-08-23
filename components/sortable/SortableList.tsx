"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  createContext,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { moveItem } from "./move-item";

type ReorderMeta = {
  activeId: UniqueIdentifier;
  overId: UniqueIdentifier;
  fromIndex: number;
  toIndex: number;
};

type ItemState = {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
  disabled: boolean;
  index: number;
  count: number;
  label: string;
  move: (delta: number) => void;
};

const SortableItemContext = createContext<ItemState | null>(null);

export type SortableListProps<T> = {
  items: readonly T[];
  getId: (item: T) => UniqueIdentifier;
  getLabel?: (item: T) => string;
  onReorder: (items: T[], meta: ReorderMeta) => void | Promise<void>;
  children: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string | ((item: T, index: number, dragging: boolean) => string);
  disabled?: boolean;
  strategy?: "vertical" | "grid";
  ariaLabel?: string;
};

function SortableRow<T>({ item, index, count, id, label, disabled, className, onMove, children }: {
  item: T;
  index: number;
  count: number;
  id: UniqueIdentifier;
  label: string;
  disabled: boolean;
  className?: string | ((item: T, index: number, dragging: boolean) => string);
  onMove: (id: UniqueIdentifier, delta: number) => void;
  children: ReactNode;
}) {
  const sortable = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    zIndex: sortable.isDragging ? 20 : undefined,
  };
  const value = useMemo<ItemState>(() => ({
    attributes: sortable.attributes,
    listeners: sortable.listeners,
    setActivatorNodeRef: sortable.setActivatorNodeRef,
    disabled,
    index,
    count,
    label,
    move: (delta) => onMove(id, delta),
  }), [sortable.attributes, sortable.listeners, sortable.setActivatorNodeRef, disabled, index, count, label, id, onMove]);

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={typeof className === "function" ? className(item, index, sortable.isDragging) : className}
      data-sortable-item={String(id)}
    >
      <SortableItemContext.Provider value={value}>{children}</SortableItemContext.Provider>
    </div>
  );
}

export function SortableHandle({ className = "", label, children }: { className?: string; label?: string; children?: ReactNode }) {
  const context = useContext(SortableItemContext);
  if (!context) throw new Error("SortableHandle must be used inside SortableList");

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      context.move(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      context.move(1);
      return;
    }
    context.listeners?.onKeyDown?.(event);
  };

  return (
    <button
      type="button"
      ref={context.setActivatorNodeRef}
      {...context.attributes}
      {...context.listeners}
      onKeyDown={onKeyDown}
      disabled={context.disabled}
      aria-label={label ?? `Reorder ${context.label}. Use arrow keys to move.`}
      className={`touch-none cursor-grab rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 ${className}`}
    >
      {children ?? <GripVertical aria-hidden="true" className="h-4 w-4" />}
    </button>
  );
}

export function SortableList<T>({ items, getId, getLabel, onReorder, children, className, itemClassName, disabled = false, strategy = "vertical", ariaLabel = "Sortable list" }: SortableListProps<T>) {
  const [announcement, setAnnouncement] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);

  const commit = (activeId: UniqueIdentifier, overId: UniqueIdentifier) => {
    const fromIndex = items.findIndex((item) => getId(item) === activeId);
    const toIndex = items.findIndex((item) => getId(item) === overId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const next = moveItem(items, activeId, overId, getId);
    const item = items[fromIndex];
    setAnnouncement(`${getLabel?.(item) ?? "Item"} moved to position ${toIndex + 1} of ${items.length}.`);
    void onReorder(next, { activeId, overId, fromIndex, toIndex });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) commit(active.id, over.id);
  };

  const move = (id: UniqueIdentifier, delta: number) => {
    const index = items.findIndex((item) => getId(item) === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= items.length) return;
    commit(id, getId(items[target]));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={strategy === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={className} role="list" aria-label={ariaLabel}>
          {items.map((item, index) => (
            <SortableRow key={getId(item)} item={item} index={index} count={items.length} id={getId(item)} label={getLabel?.(item) ?? "item"} disabled={disabled} className={itemClassName} onMove={move}>
              {children(item, index)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
    </DndContext>
  );
}
