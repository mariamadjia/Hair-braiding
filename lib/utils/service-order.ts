import type { BookingItem, LengthOption } from "@/lib/booking-types";

export const SERVICE_SIZE_ORDER = ["xsmall", "small", "smedium", "medium", "large", "jumbo"] as const;
export const SERVICE_LENGTH_ORDER = ["shoulder", "arm pit", "bra strap", "mid back", "waist", "hip", "tailbone", "classic", "mid thigh"] as const;

const normalize = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[-_]+/g, " ")
  .replace(/\barmpit\b/g, "arm pit")
  .replace(/\bmid thight\b/g, "mid thigh")
  .replace(/\s+/g, " ");

const rank = (value: string, order: readonly string[]) => {
  const index = order.indexOf(normalize(value));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export const sortServiceItems = <T extends Pick<BookingItem, "name" | "displayOrder">>(items: T[]): T[] =>
  items.map((item, originalIndex) => ({ item, originalIndex })).sort((left, right) => {
    const leftRank = rank(left.item.name, SERVICE_SIZE_ORDER);
    const rightRank = rank(right.item.name, SERVICE_SIZE_ORDER);
    if (leftRank !== rightRank) return leftRank - rightRank;
    const displayOrderDifference = (left.item.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.item.displayOrder ?? Number.MAX_SAFE_INTEGER);
    return displayOrderDifference || left.originalIndex - right.originalIndex;
  }).map(entry => entry.item);

export const sortLengthOptions = <T extends Pick<LengthOption, "name" | "displayOrder">>(options: T[]): T[] =>
  options.map((option, originalIndex) => ({ option, originalIndex })).sort((left, right) => {
    const leftRank = rank(left.option.name ?? "", SERVICE_LENGTH_ORDER);
    const rightRank = rank(right.option.name ?? "", SERVICE_LENGTH_ORDER);
    if (leftRank !== rightRank) return leftRank - rightRank;
    const displayOrderDifference = (left.option.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.option.displayOrder ?? Number.MAX_SAFE_INTEGER);
    return displayOrderDifference || left.originalIndex - right.originalIndex;
  }).map(entry => entry.option);

export const sortLengthNames = (names: string[]): string[] =>
  names.map((name, originalIndex) => ({ name, originalIndex })).sort((left, right) => {
    const difference = rank(left.name, SERVICE_LENGTH_ORDER) - rank(right.name, SERVICE_LENGTH_ORDER);
    return difference || left.originalIndex - right.originalIndex;
  }).map(entry => entry.name);
