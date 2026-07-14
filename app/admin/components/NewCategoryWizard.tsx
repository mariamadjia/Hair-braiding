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
  Lock,
  User,
  SlidersHorizontal,
  GripVertical,
} from "lucide-react";
import type { CategorySummary, LengthOption } from "@/lib/booking-types";
import { slugify, emptyLengthOption, uploadFile } from "../utils";
import { inp, lbl } from "../constants";
import { MultiImageUploader } from "./MultiImageUploader";
import { galleryApi } from "@/lib/api/gallery";
import { fromProxyUrl } from "@/lib/utils/image";

// ─── Types ────────────────────────────────────────────────────────────────────

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
const STEPS = [
  { label: "NAME", sub: "Category name" },
  { label: "PHOTOS", sub: "Add images" },
  { label: "SUBCATEGORIES", sub: "Add details" },
  { label: "DONE", sub: "Review & save" },
];

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
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:border-neutral-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden /> Back
        </button>
      ) : onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-neutral-700 border border-neutral-300 rounded-lg hover:border-neutral-500 transition-colors"
        >
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
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {busy ? "Saving…" : nextLabel}
        {!busy && <ChevronRight className="w-4 h-4" aria-hidden />}
      </button>
    </div>
  );
}

function WizardProgressBar({ step }: { step: number }) {
  return (
    <nav aria-label="Setup progress" className="flex items-start mb-8">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.label} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                aria-current={active ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}${done ? " (completed)" : active ? " (current)" : ""}`}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2 ${
                  done
                    ? "bg-violet-600 border-violet-600 text-white"
                    : active
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-white border-neutral-300 text-neutral-400 dark:bg-neutral-800 dark:border-neutral-600"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" aria-hidden /> : i + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap mt-0.5 ${
                active ? "text-neutral-900 dark:text-white" : "text-neutral-400"
              }`}>
                {s.label}
              </span>
              <span className="text-[10px] text-neutral-400 whitespace-nowrap">{s.sub}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className={`flex-1 h-0.5 mt-4 mx-2 transition-all ${
                  done ? "bg-violet-600" : "bg-neutral-200 dark:bg-neutral-700"
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
          (l) =>
            (l.name ?? "").trim() !== "" &&
            (l.price ?? "").replace(/^\$/, "").trim() !== "",
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
    setSubEntries((prev) => {
      const entry = prev.find((e) => e.uid === uid);
      if (entry) {
        for (const file of entry.photos) {
          const url = objectUrls.current.get(file);
          if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(file); }
        }
        for (const len of entry.lengths) {
          if (len.photo) {
            const url = objectUrls.current.get(len.photo);
            if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(len.photo); }
          }
        }
      }
      return prev.filter((e) => e.uid !== uid);
    });

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
      e.lengths.some(
        (l) => !(l.name ?? "").trim() || !(l.price ?? "").replace(/^\$/, "").trim(),
      ),
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
              const proxyUrl = await uploadFile(photo, token, {
                categoryId: createdCat!.id,
                subcategoryId: subId,
                serviceItemId: itemId,
              });
              imageUrl = fromProxyUrl(proxyUrl) ?? proxyUrl;
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 shadow-md max-w-4xl w-full mx-auto">
      <div className="px-8 pt-8">
        <WizardProgressBar step={step} />
      </div>
      <div className="px-8 pb-8">
        {/* ── Step 0: Name ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
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
                className={`${inp} ${catNameError ? "border-red-400" : "focus:border-violet-500"}`}
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
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
                Add subcategories
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                For each subcategory, enter its name, photos, a size (e.g. Small), and length options with prices.
              </p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />

            <div className="space-y-4">
              {subEntries.map((sub, si) => {
                const cardComplete =
                  sub.name.trim().length >= 2 &&
                  sub.photos.length >= 1 &&
                  sub.sizeName.trim().length >= 1 &&
                  sub.lengths.every(
                    (l) => (l.name ?? "").trim() !== "" && (l.price ?? "").trim() !== "",
                  );

                return (
                  <div
                    key={sub.uid}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900"
                  >
                    <div className="p-5 space-y-5">

                      {/* ── Subcategory name ── */}
                      <div className="flex items-center gap-3">
                        <Lock className="w-4 h-4 text-violet-500 shrink-0" aria-hidden />
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 w-36 shrink-0">Subcategory name</span>
                        <input
                          aria-label={`Subcategory ${si + 1} name`}
                          className={`flex-1 border rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-violet-500 bg-white dark:bg-neutral-800 ${
                            subInputError && !sub.name.trim() ? "border-red-400" : "border-neutral-300 dark:border-neutral-600"
                          }`}
                          value={sub.name}
                          onChange={(e) => updateSubField(sub.uid, "name", e.target.value)}
                          placeholder="e.g. Knotless"
                        />
                        {subEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSubRow(sub.uid)}
                            aria-label={`Remove subcategory ${si + 1}`}
                            className="ml-1 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden />
                          </button>
                        )}
                        {cardComplete && (
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" aria-label="Complete" />
                        )}
                      </div>

                      {/* ── Photos ── */}
                      <div className="flex items-start gap-3">
                        <ImageIcon className="w-4 h-4 text-violet-500 shrink-0 mt-1" aria-hidden />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-2">Photos</p>
                          <div className="flex flex-wrap gap-2" role="list" aria-label={`Photos for subcategory ${si + 1}`}>
                            {sub.photos.map((file, pi) => (
                              <div key={pi} role="listitem" className="relative group shrink-0">
                                <img
                                  src={getObjectUrl(file)}
                                  alt={file.name}
                                  className="h-20 w-20 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePhotoFromSub(sub.uid, pi)}
                                  aria-label={`Remove photo ${pi + 1}`}
                                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-neutral-500 hover:bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <label
                              tabIndex={0}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.querySelector("input")?.click(); } }}
                              className="cursor-pointer h-20 w-20 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
                            >
                              <Plus className="w-5 h-5 text-neutral-400" aria-hidden />
                              <span className="text-[10px] text-neutral-500">Add</span>
                              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotosToSub(sub.uid, e.target.files)} />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* ── Size ── */}
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-violet-500 shrink-0" aria-hidden />
                        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 w-36 shrink-0">Size</span>
                        <input
                          aria-label={`Subcategory ${si + 1} size`}
                          className={`flex-1 border rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-violet-500 bg-white dark:bg-neutral-800 ${
                            sub.touchedSize && !sub.sizeName.trim() ? "border-red-400" : "border-neutral-300 dark:border-neutral-600"
                          }`}
                          value={sub.sizeName}
                          onChange={(e) => updateSubField(sub.uid, "sizeName", e.target.value)}
                          onBlur={() => updateSubField(sub.uid, "touchedSize", true)}
                          placeholder="e.g. Small, Medium, Large…"
                        />
                      </div>
                      {sub.touchedSize && !sub.sizeName.trim() && (
                        <p role="alert" className="ml-7 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" aria-hidden /> Size is required.
                        </p>
                      )}

                      {/* ── Lengths & Prices ── */}
                      <div className="flex items-start gap-3">
                        <SlidersHorizontal className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" aria-hidden />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Lengths &amp; Prices</p>

                          {/* Table header */}
                          <div className="grid grid-cols-[1.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_4rem_2.5rem] gap-x-3 px-1 pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
                            <span />
                            <span className="text-xs font-semibold text-neutral-400 tracking-wide">Length</span>
                            <span className="text-xs font-semibold text-neutral-400 tracking-wide">Price</span>
                            <span className="text-xs font-semibold text-neutral-400 tracking-wide">Notes</span>
                            <span className="text-xs font-semibold text-neutral-400 tracking-wide text-center">Photo</span>
                            <span className="text-xs font-semibold text-neutral-400 tracking-wide text-center">Delete</span>
                          </div>

                          {sub.lengths.map((len, li) => {
                            const touched = sub.touchedLengths.has(len.uid);
                            return (
                              <div
                                key={len.uid}
                                className="grid grid-cols-[1.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_4rem_2.5rem] gap-x-3 gap-y-0 items-center py-1"
                              >
                                <GripVertical className="w-4 h-4 text-neutral-300 cursor-grab" aria-hidden />

                                <input
                                  aria-label={`Sub ${si + 1} length ${li + 1} name`}
                                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 bg-white dark:bg-neutral-800 dark:text-white ${
                                    touched && !(len.name ?? "").trim() ? "border-red-300" : "border-neutral-300 dark:border-neutral-600"
                                  }`}
                                  placeholder='16"'
                                  value={len.name ?? ""}
                                  onChange={(e) => updateLengthInSub(sub.uid, len.uid, "name", e.target.value)}
                                />

                                <div className={`flex items-center border rounded-lg overflow-hidden ${
                                  touched && !(len.price ?? "").trim() ? "border-red-300" : "border-neutral-300 dark:border-neutral-600"
                                }`}>
                                  <span className="px-2 py-2 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-700 border-r border-neutral-200 dark:border-neutral-600 select-none">$</span>
                                  <input
                                    aria-label={`Sub ${si + 1} length ${li + 1} price`}
                                    className="flex-1 px-2 py-2 text-sm focus:outline-none bg-white dark:bg-neutral-800 dark:text-white"
                                    placeholder="120.00"
                                    value={(len.price ?? "").replace(/^\$/, "")}
                                    onChange={(e) => updateLengthInSub(sub.uid, len.uid, "price", e.target.value)}
                                  />
                                </div>

                                <input
                                  aria-label={`Sub ${si + 1} length ${li + 1} notes`}
                                  className="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 bg-white dark:bg-neutral-800 dark:text-white"
                                  placeholder="Deposit required"
                                  value={len.notes ?? ""}
                                  onChange={(e) => updateLengthInSub(sub.uid, len.uid, "notes", e.target.value)}
                                />

                                <div className="flex items-center justify-center">
                                  {len.photo ? (
                                    <div className="relative group h-14 w-14 shrink-0">
                                      <img
                                        src={getObjectUrl(len.photo)}
                                        alt={`Preview ${li + 1}`}
                                        className="h-14 w-14 rounded-lg border border-neutral-200 dark:border-neutral-700 object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setLengthPhoto(sub.uid, len.uid, undefined)}
                                        aria-label={`Remove photo for length ${li + 1}`}
                                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-600 text-xs text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <label
                                      tabIndex={0}
                                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.querySelector("input")?.click(); } }}
                                      className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
                                      aria-label={`Upload photo for length ${li + 1}`}
                                    >
                                      <Plus className="h-4 w-4 text-neutral-400" aria-hidden />
                                      <span className="text-[9px] text-neutral-500 leading-tight text-center">Add photo</span>
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { setLengthPhoto(sub.uid, len.uid, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                                    </label>
                                  )}
                                </div>

                                <div className="flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => removeLengthFromSub(sub.uid, len.uid)}
                                    disabled={sub.lengths.length === 1}
                                    aria-label={`Remove length ${li + 1}`}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => addLengthToSub(sub.uid)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 border border-violet-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden /> Add length
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}

              {subInputError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" aria-hidden />
                  {subInputError}
                </p>
              )}

              <button
                type="button"
                onClick={addSubRow}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-violet-600 border border-violet-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden /> Add another subcategory
              </button>
            </div>

            <WizardNavRow
              onBack={() => setStep(1)}
              onNext={handleStep2Next}
              nextLabel="Save & Finish"
              nextDisabled={!subsValid}
              busy={busy}
            />
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="space-y-5 text-center py-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-800 flex items-center justify-center">
                <CheckCircle
                  className="w-8 h-8 text-violet-600 dark:text-violet-400"
                  aria-hidden
                />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
                "{createdCat?.name}" is ready
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                <span className="block">Category created with {images.length} photos.</span>
                <span className="block">
                  {filledSubs.length} subcategor{filledSubs.length === 1 ? "y" : "ies"} created ({filledSubs.map((e) => e.name.trim()).join(", ")}).
                </span>
                <span className="block">Each subcategory set up with photos, a size, and length options.</span>
                <span className="block mt-2">You can add more subcategories, sizes, and lengths from the editor.</span>
              </p>
            </div>
            <div className="flex items-center justify-center pt-2 border-t border-neutral-100 dark:border-neutral-700">
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Back to list
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}