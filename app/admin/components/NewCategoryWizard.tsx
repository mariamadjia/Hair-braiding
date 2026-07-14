"use client";

import { useState, useRef, useCallback } from "react";
import {
  Check,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Trash2,
  ImageIcon,
} from "lucide-react";
import type { CategorySummary, LengthOption } from "@/lib/booking-types";
import { slugify, emptyLengthOption, uploadFile } from "../utils";
import { inp, lbl, btnP, btnS, btnD } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl } from "@/lib/utils/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MutateResult {
  id?: number;
  slug?: string;
  name?: string;
}

interface Props {
  token: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: (method: string, path: string, body?: object) => Promise<any>;
  onDone: (summary: CategorySummary) => void;
  onCancel: () => void;
  onCategorySummariesRefresh?: () => Promise<unknown>;
}

interface LengthEntry extends LengthOption {
  uid: string;
  photo?: File;
  imageUrl?: string;
}
interface SubEntry {
  uid: string;
  name: string; // #10: renamed from value → name
  photos: File[]; // staged locally, uploaded after sub is created
  sizeName: string; // #11: sizeNameError removed — derived per-card in JSX
  lengths: LengthEntry[];
  touchedLengths: Set<string>;
  touchedSize: boolean; // #11: track whether size field was touched
}

// #12: helper replaces inline IIFE for Set-minus-one
function setWithout<T>(s: Set<T>, item: T): Set<T> {
  const next = new Set(s);
  next.delete(item);
  return next;
}

function emptySubEntry(): SubEntry {
  return {
    uid: crypto.randomUUID(),
    name: "",
    photos: [],
    sizeName: "",
    lengths: [
      {
        ...emptyLengthOption(),
        uid: crypto.randomUUID(),
        photo: undefined,
        imageUrl: undefined,
      },
    ],
    touchedLengths: new Set(),
    touchedSize: false,
  };
}

// #9: Done added so progress bar reflects all 4 states
const STEPS = ["Name", "Photos", "Subcategories", "Done"];

// ─── Shared sub-components (module-level — no remount on parent re-render) ────

function WizardErrorBanner({
  error,
  onDismiss,
}: {
  error: string | null;
  onDismiss: () => void;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm text-red-700 dark:text-red-300 text-sm"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
      <span className="flex-1">{error}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="text-red-400 hover:text-red-600"
      >
        ×
      </button>
    </div>
  );
}

function WizardNavRow({
  onBack,
  onCancel,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
  busy = false,
}: {
  onBack?: () => void;
  onCancel?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={`${btnS} flex items-center gap-1.5`}
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Back
        </button>
      ) : onCancel ? (
        <button type="button" onClick={onCancel} className={btnS}>
          Cancel
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || busy}
        aria-disabled={nextDisabled || busy}
        className={`${btnP} flex items-center gap-2`}
      >
        {busy ? "Saving…" : nextLabel}
        {!busy && <ChevronRight className="w-3.5 h-3.5" aria-hidden />}
      </button>
    </div>
  );
}

function WizardProgressBar({ step }: { step: number }) {
  return (
    <nav aria-label="Setup progress" className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${label}${done ? " (completed)" : active ? " (current)" : ""}`}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  done
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    : active
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 ring-4 ring-neutral-200 dark:ring-neutral-700"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" aria-hidden /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium uppercase tracking-widest whitespace-nowrap ${
                  active
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className={`flex-1 h-px mx-2 mb-5 transition-all ${
                  done
                    ? "bg-neutral-900 dark:bg-white"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NewCategoryWizard({
  token,
  mutate,
  onDone,
  onCancel,
  onCategorySummariesRefresh,
}: Props) {
  // ── Shared ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clearError = () => setError(null);

  // ── Form data ────────────────────────────────────────────────────────────
  const [catName, setCatName] = useState("");
  const [catNameError, setCatNameError] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [subEntries, setSubEntries] = useState<SubEntry[]>([emptySubEntry()]);
  const [subInputError, setSubInputError] = useState("");

  // ── Server IDs ───────────────────────────────────────────────────────────
  const [createdCat, setCreatedCat] = useState<CategorySummary | null>(null);

  // #3: maps subName -> { slug, id, itemId? } — prevents duplicates on retry
  const persistedSubs = useRef<
    Map<string, { slug: string; id: number; itemId?: number }>
  >(new Map());

  // #1: object URL cache — one URL per File instance, revoked on remove
  const objectUrls = useRef<Map<File, string>>(new Map());
  const getObjectUrl = useCallback((file: File) => {
    if (!objectUrls.current.has(file)) {
      objectUrls.current.set(file, URL.createObjectURL(file));
    }
    return objectUrls.current.get(file)!;
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const photoOk = images.length >= 3 && images.length <= 5;
  // #10: filter on .name (renamed from .value)
  const filledSubs = subEntries.filter((e) => e.name.trim().length >= 2);
  // #5: canAdvanceSubs removed — subsValid subsumes it
  const subsValid =
    filledSubs.length > 0 &&
    filledSubs.every(
      (e) =>
        e.photos.length >= 1 &&
        e.sizeName.trim().length >= 1 &&
        e.lengths.length > 0 &&
        e.lengths.every(
          (l) => (l.name ?? "").trim() !== "" && (l.price ?? "").trim() !== "",
        ),
    );

  // ── Step 0: Category name ────────────────────────────────────────────────
  const handleStep0Next = async () => {
    const trimmed = catName.trim();
    if (!trimmed) {
      setCatNameError("Category name is required.");
      return;
    }
    if (trimmed.length < 2) {
      setCatNameError("Name must be at least 2 characters.");
      return;
    }
    setCatNameError("");
    clearError();
    setBusy(true);
    try {
      const created = await mutate("POST", "", {
        name: trimmed,
        slug: slugify(trimmed),
        subcategories: [],
      });
      if (!created.id) throw new Error("Server did not return a category ID.");
      setCreatedCat({ id: created.id, name: trimmed, slug: slugify(trimmed) });
      setStep(1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to create category. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  // ── Step 1: Photos ───────────────────────────────────────────────────────
  const handleStep1Next = async () => {
    if (!createdCat?.id) {
      setError("Category ID missing.");
      return;
    }
    if (images.length < 3) {
      setError("Upload at least 3 photos to continue.");
      return;
    }
    if (images.length > 5) {
      setError("Maximum 5 photos allowed.");
      return;
    }
    clearError();
    setBusy(true);
    try {
      const backendUrls = images
        .map(fromProxyUrl)
        .filter((u): u is string => Boolean(u));
      await galleryApi.updateCategoryFlippingImages(createdCat.id, backendUrls);
      setStep(2);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to save photos. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  // ── Step 2: Subcategory field handlers ───────────────────────────────────
  const addSubRow = () => setSubEntries((prev) => [...prev, emptySubEntry()]);
  const removeSubRow = (uid: string) =>
    setSubEntries((prev) => prev.filter((e) => e.uid !== uid));

  // #1: revoke blob URL on photo remove
  const addPhotosToSub = (uid: string, files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    setSubEntries((prev) =>
      prev.map((e) =>
        e.uid === uid ? { ...e, photos: [...e.photos, ...incoming] } : e,
      ),
    );
  };
  const removePhotoFromSub = (uid: string, idx: number) =>
    setSubEntries((prev) =>
      prev.map((e) => {
        if (e.uid !== uid) return e;
        const file = e.photos[idx];
        const url = objectUrls.current.get(file);
        if (url) {
          URL.revokeObjectURL(url);
          objectUrls.current.delete(file);
        }
        return { ...e, photos: e.photos.filter((_, i) => i !== idx) };
      }),
    );

  // #10: field is now "name" not "value"
  const updateSubField = <K extends keyof SubEntry>(
    uid: string,
    field: K,
    val: SubEntry[K],
  ) => {
    if (field === "name") setSubInputError("");
    setSubEntries((prev) =>
      prev.map((e) => (e.uid === uid ? { ...e, [field]: val } : e)),
    );
  };

  const addLengthToSub = (subUid: string) =>
    setSubEntries((prev) =>
      prev.map((e) =>
        e.uid === subUid
          ? {
              ...e,
              lengths: [
                ...e.lengths,
                {
                  ...emptyLengthOption(),
                  uid: crypto.randomUUID(),
                  photo: undefined,
                  imageUrl: undefined,
                },
              ],
            }
          : e,
      ),
    );

  // #12: use setWithout helper instead of IIFE
  const removeLengthFromSub = (subUid: string, lenUid: string) =>
    setSubEntries((prev) =>
      prev.map((e) =>
        e.uid === subUid
          ? {
              ...e,
              lengths: e.lengths.filter((l) => l.uid !== lenUid),
              touchedLengths: setWithout(e.touchedLengths, lenUid),
            }
          : e,
      ),
    );

  const updateLengthInSub = (
    subUid: string,
    lenUid: string,
    field: keyof LengthOption,
    val: string,
  ) =>
    setSubEntries((prev) =>
      prev.map((e) =>
        e.uid === subUid
          ? {
              ...e,
              touchedLengths: new Set(e.touchedLengths).add(lenUid),
              lengths: e.lengths.map((l) =>
                l.uid === lenUid ? { ...l, [field]: val } : l,
              ),
            }
          : e,
      ),
    );

  const setLengthPhoto = (
    subUid: string,
    lenUid: string,
    file: File | undefined,
  ) =>
    setSubEntries((prev) =>
      prev.map((sub) =>
        sub.uid === subUid
          ? {
              ...sub,
              lengths: sub.lengths.map((length) => {
                if (length.uid !== lenUid) return length;
                if (length.photo) {
                  const oldUrl = objectUrls.current.get(length.photo);
                  if (oldUrl) {
                    URL.revokeObjectURL(oldUrl);
                    objectUrls.current.delete(length.photo);
                  }
                }
                return {
                  ...length,
                  photo: file,
                  imageUrl: file ? undefined : length.imageUrl,
                };
              }),
            }
          : sub,
      ),
    );

  const getUploadedUrl = (result: unknown): string | undefined => {
    if (typeof result === "string") return result;
    if (result && typeof result === "object") {
      const value = result as {
        url?: string;
        imageUrl?: string;
        fileUrl?: string;
      };
      return value.url ?? value.imageUrl ?? value.fileUrl;
    }
    return undefined;
  };

  const handleStep2Next = async () => {
    const filled = filledSubs;
    if (filled.length === 0) {
      setSubInputError("Add at least one subcategory name (min 2 chars).");
      return;
    }
    // #4: handler independently validates photos
    const missingPhoto = filled.find((e) => e.photos.length === 0);
    if (missingPhoto) {
      setError(`Add at least one photo for "${missingPhoto.name.trim()}".`);
      return;
    }
    const invalidSize = filled.find((e) => !e.sizeName.trim());
    if (invalidSize) {
      setError(`Enter a size name for "${invalidSize.name.trim()}".`);
      return;
    }
    const invalidLengths = filled.find((e) =>
      e.lengths.some((l) => !(l.name ?? "").trim() || !(l.price ?? "").trim()),
    );
    if (invalidLengths) {
      setError(
        `Each length under "${invalidLengths.name.trim()}" needs a name and price.`,
      );
      return;
    }
    setSubInputError("");
    clearError();
    setBusy(true);
    try {
      for (const sub of filled) {
        const subName = sub.name.trim();
        let subSlug: string;
        let subId: number;

        const already = persistedSubs.current.get(subName);
        if (already) {
          subSlug = already.slug;
          subId = already.id;
        } else {
          const createdSub = await mutate(
            "POST",
            `/${createdCat!.slug}/subcategories`,
            {
              name: subName,
              categoryId: createdCat!.id,
            },
          );
          if (!createdSub.slug || !createdSub.id)
            throw new Error(`Server did not return slug/id for "${subName}".`);
          subSlug = createdSub.slug;
          subId = createdSub.id;
          persistedSubs.current.set(subName, { slug: subSlug, id: subId });

          // #2: upload all photos in parallel now that we have the subcategory ID
          await Promise.all(
            sub.photos.map((file) =>
              uploadFile(file, token, {
                categoryId: createdCat!.id,
                subcategoryId: subId,
              }),
            ),
          );
        }

        const sizeLabel = sub.sizeName.trim();

        // #3: skip item POST if already created on a previous attempt
        let itemId = already?.itemId;
        if (!itemId) {
          const createdItem = await mutate(
            "POST",
            `/${createdCat!.slug}/subcategories/${subSlug}/items`,
            {
              name: sizeLabel,
              price: "",
              description: "",
              subcategoryId: subId,
            },
          );
          if (!createdItem.id)
            throw new Error(
              `Server did not return an item ID for "${sizeLabel}".`,
            );
          itemId = createdItem.id;
          persistedSubs.current.set(subName, {
            slug: subSlug,
            id: subId,
            itemId,
          });
        }

        // Upload each optional length photo, then store its URL on that length option.
        // The backend LengthOption DTO/entity must include an `imageUrl` field for this to persist.
        const lengthOptions = await Promise.all(
          sub.lengths.map(async ({ uid, photo, ...length }) => {
            let imageUrl = length.imageUrl;
            if (photo) {
              const uploaded = await uploadFile(photo, token, {
                categoryId: createdCat!.id,
                subcategoryId: subId,
                itemId,
              });
              imageUrl = getUploadedUrl(uploaded);
              if (!imageUrl) {
                throw new Error(
                  `The photo for length "${length.name}" uploaded, but no image URL was returned.`,
                );
              }
            }
            return { ...length, imageUrl };
          }),
        );

        await mutate(
          "PUT",
          `/${createdCat!.slug}/subcategories/${subSlug}/items`,
          {
            itemId,
            subcategoryId: subId,
            item: {
              name: sizeLabel,
              price: "",
              description: "",
              subcategory: { id: subId },
              lengthOptions,
            },
          },
        );
      }
      setStep(3);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  // ── Step 3: Done ─────────────────────────────────────────────────────────
  const handleFinish = () => {
    if (createdCat) onDone(createdCat);
    else onCategorySummariesRefresh?.();
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-sm bg-white dark:bg-neutral-900">
      <div className="px-5 pt-5">
        <WizardProgressBar step={step} />
      </div>
      <div className="px-5 pb-5">
        {/* ── Step 0: Name ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                What is this category called?
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Choose a clear, descriptive name — you can change it later.
              </p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />
            <div>
              <label htmlFor="cat-name" className={lbl}>
                Category Name{" "}
                <span className="text-red-500" aria-hidden>
                  *
                </span>
              </label>
              <input
                id="cat-name"
                className={`${inp} ${catNameError ? "border-red-400" : ""}`}
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  setCatNameError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleStep0Next()}
                placeholder="e.g. Box Braids, Twists, Locs"
                aria-required
                aria-describedby={catNameError ? "cat-name-error" : undefined}
                autoFocus
              />
              {catNameError && (
                <p
                  id="cat-name-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" aria-hidden />
                  {catNameError}
                </p>
              )}
              <p className="mt-1.5 text-xs text-neutral-400">
                URL slug:{" "}
                <span className="font-mono">
                  {catName.trim() ? slugify(catName.trim()) : "—"}
                </span>
              </p>
            </div>
            <WizardNavRow
              onCancel={onCancel}
              onNext={handleStep0Next}
              nextDisabled={!catName.trim()}
              busy={busy}
            />
          </div>
        )}

        {/* ── Step 1: Photos ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                Add gallery photos
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Upload <strong>3 to 5</strong> photos for{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {createdCat?.name}
                </span>
                . These appear in the public gallery.
              </p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />
            <MultiImageUploader
              images={images}
              token={token}
              categoryId={createdCat?.id}
              onChange={setImages}
            />
            {images.length > 0 && (
              <div
                role="status"
                className={`flex items-center gap-2 text-sm ${photoOk ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}
              >
                {photoOk ? (
                  <CheckCircle
                    className="w-4 h-4 text-green-600 dark:text-green-400"
                    aria-hidden
                  />
                ) : (
                  <AlertTriangle
                    className="w-4 h-4 text-amber-500"
                    aria-hidden
                  />
                )}
                {images.length < 3
                  ? `${images.length} uploaded — add ${3 - images.length} more`
                  : images.length > 5
                    ? `${images.length} uploaded — remove ${images.length - 5} (max 5)`
                    : `${images.length} photos ready`}
              </div>
            )}
            {/* #7: back disabled once category is created — prevents re-POST on the same name */}
            <WizardNavRow
              onBack={createdCat ? undefined : () => setStep(0)}
              onCancel={createdCat ? undefined : onCancel}
              onNext={handleStep1Next}
              nextLabel="Save & Continue"
              nextDisabled={!photoOk}
              busy={busy}
            />
          </div>
        )}

        {/* ── Step 2: Subcategories (with size + lengths inline) ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                Add subcategories
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                For each subcategory, enter its name, photos, a size (e.g.
                Small), and length options with prices.
              </p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />

            <div className="space-y-4">
              {subEntries.map((sub, si) => {
                // #6: per-card completion indicator
                const cardComplete =
                  sub.name.trim().length >= 2 &&
                  sub.photos.length >= 1 &&
                  sub.sizeName.trim().length >= 1 &&
                  sub.lengths.every(
                    (l) =>
                      (l.name ?? "").trim() !== "" &&
                      (l.price ?? "").trim() !== "",
                  );

                return (
                  <div
                    key={sub.uid}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-sm p-3 space-y-3"
                  >
                    {/* Subcategory name row + completion indicator (#6) */}
                    <div className="flex items-center gap-2">
                      {cardComplete ? (
                        <CheckCircle
                          className="w-4 h-4 text-green-500 shrink-0"
                          aria-label="Complete"
                        />
                      ) : (
                        <AlertCircle
                          className="w-4 h-4 text-amber-400 shrink-0"
                          aria-label="Incomplete"
                        />
                      )}
                      <input
                        aria-label={`Subcategory ${si + 1} name`}
                        className={`${inp} flex-1 ${subInputError && !sub.name.trim() ? "border-red-400" : ""}`}
                        value={sub.name}
                        onChange={(e) =>
                          updateSubField(sub.uid, "name", e.target.value)
                        }
                        placeholder={
                          si === 0
                            ? "Subcategory name, e.g. Knotless"
                            : "e.g. Goddess"
                        }
                      />
                      {subEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubRow(sub.uid)}
                          className={btnD}
                          aria-label={`Remove subcategory ${si + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      )}
                    </div>

                    {/* Photos */}
                    <div>
                      <p className={`${lbl} text-[11px]`}>
                        Photos{" "}
                        <span className="text-red-500" aria-hidden>
                          *
                        </span>
                      </p>
                      <div
                        className="flex flex-wrap gap-2 mt-1"
                        role="list"
                        aria-label={`Photos for subcategory ${si + 1}`}
                      >
                        {sub.photos.map((file, pi) => (
                          <div
                            key={pi}
                            role="listitem"
                            className="relative group shrink-0"
                          >
                            <img
                              src={getObjectUrl(file)}
                              alt={file.name}
                              className="h-16 w-16 object-cover rounded border border-neutral-200 dark:border-neutral-700"
                            />
                            <button
                              type="button"
                              onClick={() => removePhotoFromSub(sub.uid, pi)}
                              aria-label={`Remove photo ${pi + 1} from subcategory ${si + 1}`}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {/* #8: keyboard-accessible photo tile */}
                        <label
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.currentTarget.querySelector("input")?.click();
                            }
                          }}
                          className={`cursor-pointer h-16 w-16 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded bg-neutral-50 dark:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 ${sub.photos.length === 0 ? "border-red-300 dark:border-red-700 hover:border-red-400" : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-500"}`}
                        >
                          <ImageIcon
                            className="w-4 h-4 text-neutral-400"
                            aria-hidden
                          />
                          <span className="text-[10px] text-neutral-500">
                            Add
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) =>
                              addPhotosToSub(sub.uid, e.target.files)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    {/* Size name — #11: inline error from touchedSize */}
                    <div>
                      <label className={`${lbl} text-[11px]`}>
                        Size{" "}
                        <span className="text-red-500" aria-hidden>
                          *
                        </span>
                      </label>
                      <input
                        aria-label={`Subcategory ${si + 1} size name`}
                        className={`${inp} ${sub.touchedSize && !sub.sizeName.trim() ? "border-red-400" : ""}`}
                        value={sub.sizeName}
                        onChange={(e) =>
                          updateSubField(sub.uid, "sizeName", e.target.value)
                        }
                        onBlur={() =>
                          updateSubField(sub.uid, "touchedSize", true)
                        }
                        placeholder="e.g. Small, Medium, Large"
                      />
                      {sub.touchedSize && !sub.sizeName.trim() && (
                        <p
                          role="alert"
                          className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" aria-hidden />
                          Size name is required.
                        </p>
                      )}
                    </div>

                    {/* Length options */}
                    <div className="space-y-1.5">
                      <p className={`${lbl} text-[11px]`}>
                        Lengths{" "}
                        <span className="text-red-500" aria-hidden>
                          *
                        </span>
                      </p>
                      <div
                        className="hidden md:grid grid-cols-[1fr_1fr_1.35fr_5rem_2rem] gap-2 px-1"
                        aria-hidden
                      >
                        <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                          Length
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                          Price
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                          Notes
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                          Photo
                        </span>
                        <span />
                      </div>
                      {sub.lengths.map((len, li) => {
                        const touched = sub.touchedLengths.has(len.uid);
                        return (
                          <div
                            key={len.uid}
                            className="rounded-sm border border-neutral-100 dark:border-neutral-800 p-2 md:border-0 md:p-0 grid grid-cols-1 md:grid-cols-[1fr_1fr_1.35fr_5rem_2rem] gap-2 items-center"
                          >
                            <input
                              aria-label={`Sub ${si + 1} length ${li + 1} name`}
                              className={`${inp} ${touched && !(len.name ?? "").trim() ? "border-red-300" : ""}`}
                              placeholder='e.g. 16"'
                              value={len.name ?? ""}
                              onChange={(e) =>
                                updateLengthInSub(
                                  sub.uid,
                                  len.uid,
                                  "name",
                                  e.target.value,
                                )
                              }
                            />
                            <input
                              aria-label={`Sub ${si + 1} length ${li + 1} price`}
                              className={`${inp} ${touched && !(len.price ?? "").trim() ? "border-red-300" : ""}`}
                              placeholder="e.g. $180"
                              value={len.price ?? ""}
                              onChange={(e) =>
                                updateLengthInSub(
                                  sub.uid,
                                  len.uid,
                                  "price",
                                  e.target.value,
                                )
                              }
                            />
                            <input
                              aria-label={`Sub ${si + 1} length ${li + 1} notes`}
                              className={inp}
                              placeholder="e.g. $50 deposit"
                              value={len.notes ?? ""}
                              onChange={(e) =>
                                updateLengthInSub(
                                  sub.uid,
                                  len.uid,
                                  "notes",
                                  e.target.value,
                                )
                              }
                            />

                            <div className="flex items-center gap-2 md:justify-center">
                              {len.photo ? (
                                <div className="relative group h-12 w-12 shrink-0">
                                  <img
                                    src={getObjectUrl(len.photo)}
                                    alt={`Preview for ${len.name || `length ${li + 1}`}`}
                                    className="h-12 w-12 rounded-sm border border-neutral-200 dark:border-neutral-700 object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLengthPhoto(
                                        sub.uid,
                                        len.uid,
                                        undefined,
                                      )
                                    }
                                    aria-label={`Remove photo for length ${li + 1}`}
                                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 focus:opacity-100"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <label
                                  className="flex h-12 w-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm border-2 border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-neutral-500 dark:border-neutral-600 dark:bg-neutral-800"
                                  aria-label={`Upload photo for length ${li + 1}`}
                                >
                                  <ImageIcon
                                    className="h-4 w-4 text-neutral-400"
                                    aria-hidden
                                  />
                                  <span className="text-[9px] text-neutral-500">
                                    Add
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      setLengthPhoto(
                                        sub.uid,
                                        len.uid,
                                        e.target.files?.[0],
                                      );
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                              )}
                              <span className="text-xs text-neutral-400 md:hidden">
                                Length photo (optional)
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeLengthFromSub(sub.uid, len.uid)
                              }
                              disabled={sub.lengths.length === 1}
                              aria-label={`Remove length ${li + 1} from subcategory ${si + 1}`}
                              className={`${btnD} disabled:opacity-30`}
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => addLengthToSub(sub.uid)}
                        className={`${btnS} flex items-center gap-1.5 text-xs`}
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden /> Add length
                      </button>
                    </div>
                  </div>
                );
              })}
              {subInputError && (
                <p
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" aria-hidden />
                  {subInputError}
                </p>
              )}
              <button
                type="button"
                onClick={addSubRow}
                className={`${btnS} flex items-center gap-1.5 text-xs`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden /> Add another
                subcategory
              </button>
            </div>

            {/* #5: only subsValid needed — canAdvanceSubs was redundant */}
            <WizardNavRow
              onBack={() => setStep(1)}
              onNext={handleStep2Next}
              nextLabel="Save & Finish"
              nextDisabled={!subsValid}
              busy={busy}
            />
          </div>
        )}

        {/* ── Step 3: Done (#9: progress bar now shows this as 4th step) ── */}
        {step === 3 && (
          <div className="space-y-5 text-center py-4">
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center justify-center">
                <CheckCircle
                  className="w-7 h-7 text-green-600 dark:text-green-400"
                  aria-hidden
                />
              </div>
            </div>
            <div>
              <h2 className="text-base font-medium text-neutral-900 dark:text-white mb-1">
                "{createdCat?.name}" is ready
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                <span className="block">
                  Category created with {images.length} photos.
                </span>
                <span className="block">
                  {filledSubs.length} subcategor
                  {filledSubs.length === 1 ? "y" : "ies"} created (
                  {filledSubs.map((e) => e.name.trim()).join(", ")}).
                </span>
                <span className="block">
                  Each subcategory set up with photos, a size, and length
                  options.
                </span>
                <span className="block mt-2">
                  You can add more subcategories, sizes, and lengths from the
                  editor.
                </span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-700">
              <button type="button" onClick={onCancel} className={btnS}>
                Back to list
              </button>
              <button type="button" onClick={handleFinish} className={btnP}>
                Open editor →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}