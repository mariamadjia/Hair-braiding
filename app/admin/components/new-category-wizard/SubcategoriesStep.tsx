import { AlertCircle, Check, CheckCircle, ImageIcon, Lock, Plus, Trash2, X } from "lucide-react";
import { isSizeComplete, PRESET_SIZES, type SubEntry } from "./model";
import type { NewCategoryWizardController } from "./useNewCategoryWizard";
import { SizePricingPanel } from "./SizePricingPanel";
import { WizardErrorBanner, WizardNavRow } from "./WizardChrome";

interface Props {
  controller: NewCategoryWizardController;
}

function SizeSelector({ sub, controller }: { sub: SubEntry; controller: NewCategoryWizardController }) {
  const {
    customSizeSubUid,
    customSizeName,
    setCustomSizeSubUid,
    setCustomSizeName,
    commitCustomSize,
    togglePresetSize,
    deleteSize,
  } = controller;
  const customSizes = sub.sizes.filter((size) => !PRESET_SIZES.some((name) => name.toLowerCase() === size.name.toLowerCase()));

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Available sizes</p>
        <p className="mt-0.5 text-xs text-neutral-400">Select every size offered for this service. Click a selected size again to remove it.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_SIZES.map((name) => {
          const active = sub.sizes.find((size) => size.name.toLowerCase() === name.toLowerCase());
          return (
            <button key={name} type="button" onClick={() => togglePresetSize(sub.uid, name)} aria-pressed={Boolean(active)} className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ${active ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" : "border-neutral-200 bg-white text-neutral-600 hover:border-violet-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"}`}>
              {name}{active && <Check className="h-4 w-4" aria-hidden />}
            </button>
          );
        })}
        {customSizes.map((size) => (
          <button key={size.uid} type="button" onClick={() => deleteSize(sub.uid, size.uid)} aria-pressed="true" className="flex h-10 items-center gap-2 rounded-lg border border-violet-500 bg-violet-50 px-4 text-sm font-medium text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:bg-violet-950/40 dark:text-violet-300">
            {size.name}<Check className="h-4 w-4" aria-hidden />
          </button>
        ))}
        {customSizeSubUid === sub.uid ? (
          <div className="flex items-center gap-1.5">
            <input autoFocus value={customSizeName} onChange={(event) => setCustomSizeName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitCustomSize(sub.uid); } if (event.key === "Escape") { setCustomSizeSubUid(null); setCustomSizeName(""); } }} aria-label="Custom size name" placeholder="Custom size" className="h-10 w-36 rounded-lg border border-violet-300 px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-violet-700 dark:bg-neutral-800" />
            <button type="button" onClick={() => commitCustomSize(sub.uid)} disabled={!customSizeName.trim()} aria-label="Add custom size" className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-violet-400"><Check className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setCustomSizeSubUid(null); setCustomSizeName(""); }} aria-label="Cancel custom size" className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-neutral-700 dark:hover:bg-neutral-800"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => { setCustomSizeSubUid(sub.uid); setCustomSizeName(""); }} className="flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-violet-300 px-4 text-sm font-medium text-violet-600 hover:border-violet-500 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30"><Plus className="h-4 w-4" aria-hidden /> Add custom size</button>
        )}
      </div>
      {sub.sizes.length === 0 && <p className="mt-2 text-xs font-medium text-amber-600">Select at least one size to add pricing.</p>}
    </div>
  );
}

function SubcategoryCard({ sub, index, count, controller }: { sub: SubEntry; index: number; count: number; controller: NewCategoryWizardController }) {
  const { subInputError, removeSubRow, updateSubName, getObjectUrl, removePhotoFromSub, addPhotosToSub } = controller;
  const complete = sub.name.trim().length >= 2 && sub.photos.length >= 1 && sub.sizes.length > 0 && sub.sizes.every(isSizeComplete);

  return (
    <div id={`subcategory-${sub.uid}`} className="border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 scroll-mt-6">
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 gap-6 items-start md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200"><Lock className="w-3.5 h-3.5 text-violet-500" aria-hidden /> Subcategory name</label>
              <div className="flex items-center gap-1">
                {complete && <CheckCircle className="w-4 h-4 text-green-500" aria-label="Complete" />}
                {count > 1 && <button type="button" onClick={() => removeSubRow(sub.uid)} aria-label={`Remove subcategory ${index + 1}`} className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" aria-hidden /></button>}
              </div>
            </div>
            <input aria-label={`Subcategory ${index + 1} name`} className={`w-full border rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-violet-500 bg-white dark:bg-neutral-800 ${subInputError && !sub.name.trim() ? "border-red-400" : "border-neutral-300 dark:border-neutral-600"}`} value={sub.name} onChange={(event) => updateSubName(sub.uid, event.target.value)} placeholder="e.g. Knotless" />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-1.5"><ImageIcon className="w-3.5 h-3.5 text-violet-500" aria-hidden /> Photos</label>
            <div className="flex flex-wrap gap-2" role="list" aria-label={`Photos for subcategory ${index + 1}`}>
              {sub.photos.map((file, photoIndex) => (
                <div key={photoIndex} role="listitem" className="relative group shrink-0">
                  <img src={getObjectUrl(file)} alt={file.name} className="h-16 w-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700" />
                  <button type="button" onClick={() => removePhotoFromSub(sub.uid, photoIndex)} aria-label={`Remove photo ${photoIndex + 1}`} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-neutral-500 hover:bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
              {Array.from({ length: Math.max(1, 3 - sub.photos.length) }, (_, slot) => (
                <label key={slot} tabIndex={0} aria-label={`Add photo ${slot + 1} for subcategory ${index + 1}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.querySelector("input")?.click(); } }} className="cursor-pointer h-16 w-16 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg bg-neutral-50 dark:bg-neutral-800 border-violet-300 dark:border-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <Plus className="w-4 h-4 text-violet-500" aria-hidden /><span className="text-[9px] text-violet-500 font-medium">Add photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => { addPhotosToSub(sub.uid, event.target.files); event.currentTarget.value = ""; }} />
                </label>
              ))}
            </div>
          </div>
        </div>
        <SizeSelector sub={sub} controller={controller} />
        <div className="overflow-visible rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
          <div className="rounded-t-xl border-b border-violet-100 bg-violet-50/70 px-4 py-2.5 text-sm font-semibold text-neutral-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-neutral-100">Size-based pricing</div>
          <div className="space-y-2 p-3">
            {sub.sizes.length === 0 && <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-700">Select a size above to create its pricing panel.</div>}
            {sub.sizes.map((size) => <SizePricingPanel key={size.uid} sub={sub} size={size} controller={controller} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubcategoriesStep({ controller }: Props) {
  const { error, clearError, subEntries, subInputError, addSubRow, savePhase, busy, setStep, handleStep2Next } = controller;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">Add subcategories</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">For each subcategory, add photos, available sizes, and independent length-based pricing.</p>
      </div>
      <WizardErrorBanner error={error} onDismiss={clearError} />
      <div className="space-y-4">
        {subEntries.map((sub, index) => <SubcategoryCard key={sub.uid} sub={sub} index={index} count={subEntries.length} controller={controller} />)}
        {subInputError && <p role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" aria-hidden />{subInputError}</p>}
        <button type="button" onClick={addSubRow} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-violet-600 border border-violet-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-colors"><Plus className="w-4 h-4" aria-hidden /> Add another subcategory</button>
      </div>
      {savePhase && <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300"><span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" aria-hidden />{savePhase}</div>}
      <WizardNavRow onBack={() => setStep(1)} onNext={handleStep2Next} nextLabel="Save & Finish" busy={busy} />
    </div>
  );
}
