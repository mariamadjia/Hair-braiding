import { arrayMove } from "@dnd-kit/sortable";
import type { UniqueIdentifier } from "@dnd-kit/core";

export function moveItem<T>(
  items: readonly T[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  getId: (item: T) => UniqueIdentifier,
): T[] {
  const from = items.findIndex((item) => getId(item) === activeId);
  const to = items.findIndex((item) => getId(item) === overId);
  if (from < 0 || to < 0 || from === to) return [...items];
  return arrayMove([...items], from, to);
}
