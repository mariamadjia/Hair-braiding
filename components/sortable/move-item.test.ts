import { describe, expect, it } from "vitest";
import { moveItem } from "./move-item";

describe("moveItem", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const getId = (item: { id: string }) => item.id;

  it("moves an item without mutating the source array", () => {
    expect(moveItem(items, "a", "c", getId).map(getId)).toEqual(["b", "c", "a"]);
    expect(items.map(getId)).toEqual(["a", "b", "c"]);
  });

  it("returns an unchanged copy for missing and identical ids", () => {
    expect(moveItem(items, "a", "a", getId)).toEqual(items);
    expect(moveItem(items, "missing", "b", getId)).toEqual(items);
  });
});
