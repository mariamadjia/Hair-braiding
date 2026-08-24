import { AlertCircle, Check, ChevronRight, ChevronUp, MoreVertical, Plus, X } from "lucide-react";
import { isSizeComplete, type SizeEntry, type SubEntry } from "./model";
import type { NewCategoryWizardController } from "./useNewCategoryWizard";
import { LengthOptionRow } from "./LengthOptionRow";
import { useRef } from "react";

interface Props {
  sub: SubEntry;
  size: SizeEntry;
  controller: NewCategoryWizardController;
}

export function SizePricingPanel({ sub, size, controller }: Props) {
  const {
    openSizeMenu,
    setOpenSizeMenu,
    toggleSize,
    selectSize,
    updateSizeName,
    deleteSize,
    addLengthOption,
    addPhotosToSize,
    removePhotoFromSize,
    getObjectUrl,
  } = controller;
  const expanded = sub.expandedSizeId === size.uid;
  const complete = isSizeComplete(size);
  const missingFields = Number(!size.name.trim()) + size.lengths.reduce((count, length) => count + Number(!(length.name ?? "").trim()) + Number(!(length.price ?? "").replace(/^\$/, "").trim()), 0);
  const summary = size.lengths.filter((length) => (length.name ?? "").trim() || (length.price ?? "").trim());
  const nextIncomplete = sub.sizes.find((candidate) => candidate.uid !== size.uid && !isSizeComplete(candidate));
  const sizePhotoInputRef = useRef<HTMLInputElement>(null);

  return (
    <div id={`size-panel-${size.uid}`} className={`relative scroll-mt-6 rounded-xl border transition-colors ${expanded ? "border-violet-200 shadow-sm dark:border-violet-800" : "border-neutral-200 dark:border-neutral-700"}`}>
      <div className="flex min-h-14 items-center gap-3 px-3 py-2">
        <button type="button" onClick={() => toggleSize(sub.uid, size.uid)} aria-expanded={expanded} aria-label={`${expanded ? "Collapse" : "Expand"} ${size.name}`} className="rounded-md p-1 text-violet-600 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:hover:bg-violet-950/30">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => selectSize(sub.uid, size.uid)} className="min-w-0 rounded text-left focus:outline-none focus:ring-2 focus:ring-violet-400">
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{size.name || "Untitled size"}</span>
        </button>
        <span className="shrink-0 text-xs text-neutral-400">{size.lengths.length} {size.lengths.length === 1 ? "length" : "lengths"}</span>
        <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium sm:flex ${complete ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}`}>
          {complete ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {complete ? "Complete" : `${missingFields} ${missingFields === 1 ? "field" : "fields"} missing`}
        </span>
        {!expanded && (
          <div className="hidden min-w-0 flex-1 items-center gap-3 overflow-hidden lg:flex">
            {summary.slice(0, 2).map((length, index) => (
              <div key={length.uid} className="flex min-w-0 items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                {index > 0 && <span className="text-neutral-300">•</span>}
                <span className="truncate">{length.name || "Length"}</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-100">${(length.price || "0.00").replace(/^\$/, "")}</span>
              </div>
            ))}
            {summary.length > 2 && <span className="shrink-0 text-xs font-medium text-violet-600">+{summary.length - 2} more</span>}
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {expanded ? (
            <>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">photo for this size</span>
              <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-violet-300 text-violet-500 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30">
                <Plus className="h-5 w-5" />
                <input
                  ref={sizePhotoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    addPhotosToSize(sub.uid, size.uid, event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {size.photos.slice(0, 3).map((photo, index) => (
                <div key={index} className="relative group">
                  <img src={getObjectUrl(photo)} alt="" className="h-10 w-10 rounded-md border border-neutral-200 object-cover dark:border-neutral-700" />
                  <button
                    type="button"
                    onClick={() => removePhotoFromSize(sub.uid, size.uid, index)}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-white opacity-0 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {size.photos.length > 3 && (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  +{size.photos.length - 3}
                </span>
              )}
            </>
          ) : (
            <>
              {size.photos.slice(0, 2).map((photo, index) => (
                <img key={index} src={getObjectUrl(photo)} alt="" className="h-8 w-8 rounded-md border border-neutral-200 object-cover dark:border-neutral-700" />
              ))}
              {size.photos.length > 2 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  +{size.photos.length - 2}
                </span>
              )}
            </>
          )}
          <button type="button" onClick={() => setOpenSizeMenu(openSizeMenu === size.uid ? null : size.uid)} aria-label={`Actions for ${size.name}`} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:hover:bg-neutral-800"><MoreVertical className="h-4 w-4" aria-hidden /></button>
        </div>
      </div>

      {openSizeMenu === size.uid && (
        <div className="absolute right-3 top-12 z-20 w-56 space-y-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500">Size name</span>
            <button type="button" onClick={() => setOpenSizeMenu(null)} aria-label="Close size menu" className="rounded p-0.5 text-neutral-400 hover:text-neutral-700"><X className="h-4 w-4" /></button>
          </div>
          <input value={size.name} onChange={(event) => updateSizeName(sub.uid, size.uid, event.target.value)} aria-label={`Rename ${size.name}`} className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-neutral-600 dark:bg-neutral-800" />
          <button type="button" onClick={() => { deleteSize(sub.uid, size.uid); setOpenSizeMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"><MoreVertical className="h-4 w-4" /> Delete size</button>
        </div>
      )}

      {expanded && (
        <div className="border-t border-neutral-100 px-3 pb-3 pt-2 dark:border-neutral-800">
          <div className="hidden grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1.5fr)_2.5rem] gap-3 px-1 pb-1.5 text-xs font-medium text-neutral-400 md:grid">
            <span /><span>Length</span><span>Price</span><span>Deposit / Notes</span><span className="text-center">Delete</span>
          </div>
          <div className="space-y-2">
            {size.lengths.map((length, index) => <LengthOptionRow key={length.uid} subUid={sub.uid} size={size} length={length} index={index} controller={controller} />)}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => addLengthOption(sub.uid, size.uid)} className="flex h-9 items-center gap-1.5 rounded-lg border border-violet-300 px-3 text-sm font-medium text-violet-600 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30"><Plus className="h-4 w-4" /> Add length option</button>
            {complete && nextIncomplete && (
              <button type="button" onClick={() => selectSize(sub.uid, nextIncomplete.uid)} className="flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400">Continue to {nextIncomplete.name} <ChevronRight className="h-4 w-4" /></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
