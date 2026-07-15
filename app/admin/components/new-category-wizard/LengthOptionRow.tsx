import { GripVertical, Trash2 } from "lucide-react";
import type { LengthEntry, SizeEntry } from "./model";
import type { NewCategoryWizardController } from "./useNewCategoryWizard";

interface Props {
  subUid: string;
  size: SizeEntry;
  length: LengthEntry;
  index: number;
  controller: NewCategoryWizardController;
}

export function LengthOptionRow({ subUid, size, length, index, controller }: Props) {
  const touched = size.touchedLengths.has(length.uid);
  const {
    updateLengthOption,
    deleteLengthOption,
    startLengthDrag,
    endLengthDrag,
    reorderLengthOptions,
  } = controller;

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => reorderLengthOptions(subUid, size.uid, length.uid)}
      className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 md:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1.5fr)_2.5rem] md:items-center md:border-0 md:bg-transparent md:p-0 dark:border-neutral-700 dark:bg-neutral-800/40 md:dark:bg-transparent"
    >
      <div className="flex items-center justify-between md:block">
        <span className="text-xs font-semibold text-neutral-500 md:hidden">Length option {index + 1}</span>
        <span
          draggable
          onDragStart={() => startLengthDrag(subUid, size.uid, length.uid)}
          onDragEnd={endLengthDrag}
          role="button"
          tabIndex={0}
          aria-label={`Drag ${size.name} length ${index + 1} to reorder`}
          className="inline-flex cursor-grab rounded p-1 text-neutral-300 focus:outline-none focus:ring-2 focus:ring-violet-400 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <label className="space-y-1">
        <span className="text-xs text-neutral-500 md:hidden">Length</span>
        <input value={length.name ?? ""} onChange={(event) => updateLengthOption(subUid, size.uid, length.uid, "name", event.target.value)} aria-label={`${size.name} length ${index + 1}`} placeholder="16 inches" className={`h-11 w-full rounded-lg border bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:bg-neutral-900 ${touched && !(length.name ?? "").trim() ? "border-red-300" : "border-neutral-300 dark:border-neutral-600"}`} />
      </label>
      <label className="space-y-1">
        <span className="text-xs text-neutral-500 md:hidden">Price</span>
        <div className={`flex h-11 overflow-hidden rounded-lg border bg-white dark:bg-neutral-900 ${touched && !(length.price ?? "").trim() ? "border-red-300" : "border-neutral-300 dark:border-neutral-600"}`}>
          <span className="flex items-center border-r border-neutral-200 bg-neutral-50 px-2 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">$</span>
          <input value={(length.price ?? "").replace(/^\$/, "")} onChange={(event) => updateLengthOption(subUid, size.uid, length.uid, "price", event.target.value)} aria-label={`${size.name} price ${index + 1}`} placeholder="120.00" inputMode="decimal" className="min-w-0 flex-1 px-2 text-sm focus:outline-none" />
        </div>
      </label>
      <label className="space-y-1">
        <span className="text-xs text-neutral-500 md:hidden">Deposit / Notes</span>
        <input value={length.notes ?? ""} onChange={(event) => updateLengthOption(subUid, size.uid, length.uid, "notes", event.target.value)} aria-label={`${size.name} notes ${index + 1}`} placeholder="$50.00 deposit required" className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-neutral-600 dark:bg-neutral-900" />
      </label>
      <button type="button" onClick={() => deleteLengthOption(subUid, size.uid, length.uid)} disabled={size.lengths.length === 1} aria-label={`Delete ${size.name} length ${index + 1}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 disabled:opacity-30 md:mx-auto dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}
