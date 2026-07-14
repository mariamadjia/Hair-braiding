import type { CategorySummary, LengthOption } from "@/lib/booking-types";
import { emptyLengthOption } from "../../utils";

export interface WizardProps {
  token: string;
  mutate: (method: string, path: string, body?: object) => Promise<any>;
  onDone: (summary: CategorySummary) => void;
  onCancel: () => void;
  onCategorySummariesRefresh?: () => Promise<unknown>;
}

export interface LengthEntry extends LengthOption {
  uid: string;
  photo?: File;
  imageUrl?: string;
}

export interface SizeEntry {
  uid: string;
  name: string;
  lengths: LengthEntry[];
  touchedLengths: Set<string>;
}

export interface SubEntry {
  uid: string;
  name: string;
  photos: File[];
  sizes: SizeEntry[];
  selectedSizeId: string;
  expandedSizeId: string | null;
}

export const PRESET_SIZES = ["Small", "Medium", "Large"];

export function emptyLengthEntry(): LengthEntry {
  return {
    ...emptyLengthOption(),
    uid: crypto.randomUUID(),
    photo: undefined,
    imageUrl: undefined,
  };
}

export function emptySizeEntry(name: string): SizeEntry {
  return {
    uid: crypto.randomUUID(),
    name,
    lengths: [emptyLengthEntry()],
    touchedLengths: new Set(),
  };
}

export function emptySubEntry(): SubEntry {
  return {
    uid: crypto.randomUUID(),
    name: "",
    photos: [],
    sizes: [],
    selectedSizeId: "",
    expandedSizeId: null,
  };
}

export function isSizeComplete(size: SizeEntry): boolean {
  return Boolean(
    size.name.trim() &&
    size.lengths.length > 0 &&
    size.lengths.every(
      (length) =>
        (length.name ?? "").trim() &&
        (length.price ?? "").replace(/^\$/, "").trim(),
    ),
  );
}

export function hasSizeData(size: SizeEntry): boolean {
  return size.lengths.length > 1 || size.lengths.some(
    (length) =>
      Boolean((length.name ?? "").trim()) ||
      Boolean((length.price ?? "").trim()) ||
      Boolean((length.notes ?? "").trim()) ||
      Boolean(length.photo),
  );
}
