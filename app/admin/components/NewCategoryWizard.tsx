"use client";

import { AlertCircle, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { slugify } from "../utils";
import { inp, lbl } from "../constants";
import type { WizardProps } from "./new-category-wizard/model";
import { useNewCategoryWizard } from "./new-category-wizard/useNewCategoryWizard";
import { SubcategoriesStep } from "./new-category-wizard/SubcategoriesStep";
import { WizardErrorBanner, WizardNavRow, WizardProgressBar } from "./new-category-wizard/WizardChrome";

export function NewCategoryWizard(props: WizardProps) {
  const controller = useNewCategoryWizard(props);
  const {
    step,
    setStep,
    error,
    clearError,
    busy,
    catName,
    setCatName,
    catNameError,
    setCatNameError,
    imageFiles,
    photoOk,
    getImageObjectUrl,
    addCategoryPhoto,
    removeCategoryPhoto,
    handleStep0Next,
    handleStep1Next,
    createdCat,
    filledSubs,
    finishWizard,
  } = controller;

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 shadow-md max-w-4xl w-full mx-auto">
      <div className="px-4 pt-5 sm:px-8 sm:pt-8">
        <WizardProgressBar step={step} />
      </div>
      <div className="px-4 pb-5 sm:px-8 sm:pb-8">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">What is this category called?</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Choose a clear, descriptive name — you can change it later.</p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />
            <div>
              <label htmlFor="cat-name" className={lbl}>Category Name <span className="text-red-500" aria-hidden>*</span></label>
              <input
                id="cat-name"
                className={`${inp} ${catNameError ? "border-red-400" : "focus:border-neutral-950 focus-visible:ring-2 focus-visible:ring-neutral-950/15"}`}
                value={catName}
                onChange={(event) => { setCatName(event.target.value); setCatNameError(""); }}
                onKeyDown={(event) => event.key === "Enter" && handleStep0Next()}
                placeholder="e.g. Box Braids, Twists, Locs"
                aria-required
                aria-describedby={catNameError ? "cat-name-error" : undefined}
                autoFocus
              />
              {catNameError && (
                <p id="cat-name-error" role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" aria-hidden />{catNameError}</p>
              )}
              <p className="mt-1.5 text-xs text-neutral-400">URL slug: <span className="font-mono">{catName.trim() ? slugify(catName.trim()) : "—"}</span></p>
            </div>
            <WizardNavRow onCancel={props.onCancel} onNext={handleStep0Next} nextDisabled={!catName.trim()} busy={busy} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">Add gallery photos</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Upload <strong>3 to 5</strong> photos for <span className="font-medium text-neutral-700 dark:text-neutral-300">{catName.trim()}</span>. These appear in the public gallery.</p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {imageFiles.map((file, index) => (
                  <div key={index} className="relative shrink-0 group">
                    <img src={getImageObjectUrl(file)} alt={`photo ${index + 1}`} className="h-24 w-24 object-cover border-2 border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm" />
                    <button type="button" aria-label={`Remove category photo ${index + 1}`} onClick={() => removeCategoryPhoto(index)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm text-white opacity-100 shadow-md transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">×</button>
                  </div>
                ))}
                {Array.from({ length: imageFiles.length >= 5 ? 0 : Math.max(1, 3 - imageFiles.length) }, (_, slot) => (
                  <label key={slot} tabIndex={0} aria-label={`Add category photo ${slot + 1}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.querySelector("input")?.click(); } }} className="group flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 text-center transition hover:border-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-950 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:focus:ring-white">
                    <Plus className="h-5 w-5 text-neutral-500" aria-hidden />
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Add photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => { addCategoryPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                  </label>
                ))}
              </div>
            </div>
            {imageFiles.length > 0 && (
              <div role="status" className={`flex items-center gap-2 text-sm ${photoOk ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}>
                {photoOk ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden /> : <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden />}
                {imageFiles.length < 3 ? `${imageFiles.length} selected — add ${3 - imageFiles.length} more` : imageFiles.length > 5 ? `${imageFiles.length} selected — remove ${imageFiles.length - 5} (max 5)` : `${imageFiles.length} photos ready`}
              </div>
            )}
            <WizardNavRow onBack={() => setStep(0)} onCancel={props.onCancel} onNext={handleStep1Next} nextLabel="Next" nextDisabled={!photoOk} busy={busy} />
          </div>
        )}

        {step === 2 && <SubcategoriesStep controller={controller} />}

        {step === 3 && (
          <div className="space-y-5 text-center py-4">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"><CheckCircle className="h-8 w-8 text-neutral-700 dark:text-neutral-200" aria-hidden /></div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">"{createdCat?.name}" is ready</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                <span className="block">Category created with {imageFiles.length} photos.</span>
                <span className="block">{filledSubs.length} subcategor{filledSubs.length === 1 ? "y" : "ies"} created ({filledSubs.map((entry) => entry.name.trim()).join(", ")}).</span>
                <span className="block">Each subcategory is set up with photos, selected sizes, and independent length pricing.</span>
                <span className="block mt-2">You can add more subcategories, sizes, and lengths from the editor.</span>
              </p>
            </div>
            <div className="flex items-center justify-center pt-2 border-t border-neutral-100 dark:border-neutral-700">
              <button type="button" onClick={finishWizard} className="flex items-center gap-2 rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200">Back to list</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
