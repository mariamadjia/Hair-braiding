import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortableHandle, SortableList } from "./SortableList";

describe("SortableList", () => {
  it("supports direct keyboard reordering and announces the result", () => {
    const onReorder = vi.fn();
    const items = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }];
    render(
      <SortableList items={items} getId={(item) => item.id} getLabel={(item) => item.name} onReorder={onReorder}>
        {(item) => <><SortableHandle /><span>{item.name}</span></>}
      </SortableList>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: /reorder alpha/i }), { key: "ArrowDown" });
    expect(onReorder).toHaveBeenCalledWith([items[1], items[0]], expect.objectContaining({ fromIndex: 0, toIndex: 1 }));
    expect(screen.getByText("Alpha moved to position 2 of 2.")).toBeInTheDocument();
  });
});
