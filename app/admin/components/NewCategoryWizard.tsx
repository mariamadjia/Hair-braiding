"use client";

import { useState, useRef, useCallback } from "react";
import {
  Check,
  ChevronRight,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Trash2,
  ImageIcon,
  ImagePlus,
  Lock,
  GripVertical,
  MoreVertical,
  X,
} from "lucide-react";
import type { CategorySummary, LengthOption } from "@/lib/booking-types";
import { slugify, emptyLengthOption, uploadFile } from "../utils";
import { inp, lbl } from "../constants";
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
interface SizeEntry {
  uid: string;
  name: string;
  lengths: LengthEntry[];
  touchedLengths: Set<string>;
}
interface SubEntry {
  uid: string;
  name: string;
  photos: File[];
  sizes: SizeEntry[];
  selectedSizeId: string;
  expandedSizeId: string | null;
}

function emptyLengthEntry(): LengthEntry {
  return {
    ...emptyLengthOption(),
    uid: crypto.randomUUID(),
    photo: undefined,
    imageUrl: undefined,
  };
}

function emptySizeEntry(name: string): SizeEntry {
  return {
    uid: crypto.randomUUID(),
    name,
    lengths: [emptyLengthEntry()],
    touchedLengths: new Set(),
  };
}

function emptySubEntry(): SubEntry {
  const sizes = ["Small", "Medium", "Large"].map(emptySizeEntry);
  return {
    uid: crypto.randomUUID(),
    name: "",
    photos: [],
    sizes,
    selectedSizeId: sizes[0].uid,
    expandedSizeId: sizes[0].uid,
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const imageObjectUrls = useRef<Map<File, string>>(new Map());
  const getImageObjectUrl = useCallback((file: File) => {
    if (!imageObjectUrls.current.has(file)) {
      imageObjectUrls.current.set(file, URL.createObjectURL(file));
    }
    return imageObjectUrls.current.get(file)!;
  }, []);
  const [subEntries, setSubEntries] = useState<SubEntry[]>([emptySubEntry()]);
  const [subInputError, setSubInputError] = useState("");

  // ── Server IDs ───────────────────────────────────────────────────────────
  // Only set after final save — kept for retry dedup on subcategories
  const [createdCat, setCreatedCat] = useState<CategorySummary | null>(null);

  const persistedSubs = useRef<
    Map<string, { slug: string; id: number; itemIds: Record<string, number> }>
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
  const photoOk = imageFiles.length >= 3 && imageFiles.length <= 7;
  const filledSubs = subEntries.filter((entry) => entry.name.trim().length >= 2);
  const subsValid =
    filledSubs.length > 0 &&
    filledSubs.every(
      (entry) =>
        entry.photos.length >= 1 &&
        entry.sizes.length > 0 &&
        entry.sizes.every(
          (size) =>
            size.name.trim().length > 0 &&
            size.lengths.length > 0 &&
            size.lengths.every(
              (length) =>
                (length.name ?? "").trim() !== "" &&
                (length.price ?? "").replace(/^\$/, "").trim() !== "",
            ),
        ),
    );

  // ── Step 0: Category name — client-side only ─────────────────────────────
  const handleStep0Next = () => {
    const trimmed = catName.trim();
    if (!trimmed) { setCatNameError("Category name is required."); return; }
    if (trimmed.length < 2) { setCatNameError("Name must be at least 2 characters."); return; }
    setCatNameError("");
    clearError();
    setStep(1);
  };

  // ── Step 1: Photos — client-side only ───────────────────────────────────
  const handleStep1Next = () => {
    if (imageFiles.length < 3) { setError("Add at least 3 photos to continue."); return; }
    if (imageFiles.length > 7) { setError("Maximum 7 photos allowed."); return; }
    clearError();
    setStep(2);
  };

  // ── Step 2: Subcategory and nested pricing handlers ──────────────────────
  const [openSizeMenu, setOpenSizeMenu] = useState<string | null>(null);
  const draggedLength = useRef<{ subUid: string; sizeUid: string; lengthUid: string } | null>(null);

  const addSubRow = () => setSubEntries((prev) => [...prev, emptySubEntry()]);
  const removeSubRow = (uid: string) =>
    setSubEntries((prev) => {
      const entry = prev.find((sub) => sub.uid === uid);
      if (entry) {
        [...entry.photos, ...entry.sizes.flatMap((size) => size.lengths.map((length) => length.photo).filter((file): file is File => Boolean(file)))].forEach((file) => {
          const url = objectUrls.current.get(file);
          if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(file); }
        });
      }
      return prev.filter((sub) => sub.uid !== uid);
    });

  const addPhotosToSub = (uid: string, files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    setSubEntries((prev) => prev.map((sub) => sub.uid === uid ? { ...sub, photos: [...sub.photos, ...incoming] } : sub));
  };

  const removePhotoFromSub = (uid: string, idx: number) =>
    setSubEntries((prev) => prev.map((sub) => {
      if (sub.uid !== uid) return sub;
      const file = sub.photos[idx];
      const url = objectUrls.current.get(file);
      if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(file); }
      return { ...sub, photos: sub.photos.filter((_, index) => index !== idx) };
    }));

  const updateSubField = <K extends keyof SubEntry>(uid: string, field: K, value: SubEntry[K]) => {
    if (field === "name") setSubInputError("");
    setSubEntries((prev) => prev.map((sub) => sub.uid === uid ? { ...sub, [field]: value } : sub));
  };

  const addSize = (subUid: string) => {
    const size = emptySizeEntry("New size");
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: [...sub.sizes, size],
      selectedSizeId: size.uid,
      expandedSizeId: size.uid,
    } : sub));
  };

  const updateSizeName = (subUid: string, sizeUid: string, name: string) =>
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? { ...size, name } : size),
    } : sub));

  const selectSize = (subUid: string, sizeUid: string) =>
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      selectedSizeId: sizeUid,
      expandedSizeId: sizeUid,
    } : sub));

  const toggleSize = (subUid: string, sizeUid: string) =>
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      selectedSizeId: sizeUid,
      expandedSizeId: sub.expandedSizeId === sizeUid ? null : sizeUid,
    } : sub));

  const deleteSize = (subUid: string, sizeUid: string) =>
    setSubEntries((prev) => prev.map((sub) => {
      if (sub.uid !== subUid || sub.sizes.length === 1) return sub;
      const removed = sub.sizes.find((size) => size.uid === sizeUid);
      removed?.lengths.forEach((length) => {
        if (!length.photo) return;
        const url = objectUrls.current.get(length.photo);
        if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(length.photo); }
      });
      const sizes = sub.sizes.filter((size) => size.uid !== sizeUid);
      const fallbackId = sizes[0].uid;
      return {
        ...sub,
        sizes,
        selectedSizeId: sub.selectedSizeId === sizeUid ? fallbackId : sub.selectedSizeId,
        expandedSizeId: sub.expandedSizeId === sizeUid ? fallbackId : sub.expandedSizeId,
      };
    }));

  const addLengthOption = (subUid: string, sizeUid: string) =>
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? { ...size, lengths: [...size.lengths, emptyLengthEntry()] } : size),
    } : sub));

  const updateLengthOption = (subUid: string, sizeUid: string, lengthUid: string, field: keyof LengthOption, value: string) =>
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? {
        ...size,
        touchedLengths: new Set(size.touchedLengths).add(lengthUid),
        lengths: size.lengths.map((length) => length.uid === lengthUid ? { ...length, [field]: value } : length),
      } : size),
    } : sub));

  const deleteLengthOption = (subUid: string, sizeUid: string, lengthUid: string) =>
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => {
        if (size.uid !== sizeUid || size.lengths.length === 1) return size;
        const removed = size.lengths.find((length) => length.uid === lengthUid);
        if (removed?.photo) {
          const url = objectUrls.current.get(removed.photo);
          if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(removed.photo); }
        }
        const touchedLengths = new Set(size.touchedLengths);
        touchedLengths.delete(lengthUid);
        return { ...size, lengths: size.lengths.filter((length) => length.uid !== lengthUid), touchedLengths };
      }),
    } : sub));

  const setLengthPhoto = (subUid: string, sizeUid: string, lengthUid: string, file: File | undefined) =>
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? {
        ...size,
        lengths: size.lengths.map((length) => {
          if (length.uid !== lengthUid) return length;
          if (length.photo) {
            const oldUrl = objectUrls.current.get(length.photo);
            if (oldUrl) { URL.revokeObjectURL(oldUrl); objectUrls.current.delete(length.photo); }
          }
          return { ...length, photo: file, imageUrl: file ? undefined : length.imageUrl };
        }),
      } : size),
    } : sub));

  const reorderLengthOptions = (subUid: string, sizeUid: string, targetLengthUid: string) => {
    const dragged = draggedLength.current;
    if (!dragged || dragged.subUid !== subUid || dragged.sizeUid !== sizeUid || dragged.lengthUid === targetLengthUid) return;
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => {
        if (size.uid !== sizeUid) return size;
        const from = size.lengths.findIndex((length) => length.uid === dragged.lengthUid);
        const to = size.lengths.findIndex((length) => length.uid === targetLengthUid);
        if (from < 0 || to < 0) return size;
        const lengths = [...size.lengths];
        const [moved] = lengths.splice(from, 1);
        lengths.splice(to, 0, moved);
        return { ...size, lengths };
      }),
    } : sub));
    draggedLength.current = null;
  };

  const handleStep2Next = async () => {
    const filled = filledSubs;
    if (filled.length === 0) {
      setSubInputError("Add at least one subcategory name (min 2 chars).");
      return;
    }
    const missingPhoto = filled.find((e) => e.photos.length === 0);
    if (missingPhoto) {
      setError(`Add at least one photo for "${missingPhoto.name.trim()}".`);
      return;
    }
    const invalidSize = filled.find((entry) => entry.sizes.some((size) => !size.name.trim()));
    if (invalidSize) {
      setError(`Enter a name for every size under "${invalidSize.name.trim()}".`);
      return;
    }
    const invalidLengths = filled.find((entry) =>
      entry.sizes.some((size) => size.lengths.some(
        (length) => !(length.name ?? "").trim() || !(length.price ?? "").replace(/^\$/, "").trim(),
      )),
    );
    if (invalidLengths) {
      setError(`Each length under "${invalidLengths.name.trim()}" needs a name and price.`);
      return;
    }
    setSubInputError("");
    clearError();
    setBusy(true);
    try {
      // ── 1. Create category ───────────────────────────────────────────────
      let cat = createdCat;
      if (!cat) {
        const trimmed = catName.trim();
        const created = await mutate("POST", "", {
          name: trimmed,
          slug: slugify(trimmed),
          subcategories: [],
        });
        if (!created.id) throw new Error("Server did not return a category ID.");
        cat = { id: created.id, name: trimmed, slug: slugify(trimmed) };
        setCreatedCat(cat);
      }

      // ── 2. Upload & save flipping images ────────────────────────────────
      const catId = cat!.id as number;
      const proxyUrls = await Promise.all(
        imageFiles.map((file) => uploadFile(file, token, { categoryId: catId }))
      );
      const backendUrls = proxyUrls.map(fromProxyUrl).filter((u): u is string => Boolean(u));
      await galleryApi.updateCategoryFlippingImages(catId, backendUrls);

      // ── 3. Create subcategories ──────────────────────────────────────────
      for (const sub of filled) {
        const subName = sub.name.trim();
        let subSlug: string;
        let subId: number;

        let persisted = persistedSubs.current.get(subName);
        if (persisted) {
          subSlug = persisted.slug;
          subId = persisted.id;
        } else {
          const createdSub = await mutate(
            "POST",
            `/${cat!.slug}/subcategories`,
            { name: subName, categoryId: catId },
          );
          if (!createdSub.slug || !createdSub.id) throw new Error(`Server did not return slug/id for "${subName}".`);
          subSlug = createdSub.slug;
          subId = createdSub.id;
          persisted = { slug: subSlug, id: subId, itemIds: {} };
          persistedSubs.current.set(subName, persisted);

          await Promise.all(
            sub.photos.map((file) => uploadFile(file, token, { categoryId: catId, subcategoryId: subId })),
          );
        }

        for (const size of sub.sizes) {
          const sizeLabel = size.name.trim();
          let itemId = persisted.itemIds[size.uid];
          if (!itemId) {
            const createdItem = await mutate(
              "POST",
              `/${cat!.slug}/subcategories/${subSlug}/items`,
              { name: sizeLabel, price: "", description: "", subcategoryId: subId },
            );
            if (!createdItem.id) throw new Error(`Server did not return an item ID for "${sizeLabel}".`);
            itemId = createdItem.id;
            persisted.itemIds[size.uid] = itemId;
            persistedSubs.current.set(subName, { ...persisted, itemIds: { ...persisted.itemIds } });
          }

          const lengthOptions = await Promise.all(
            size.lengths.map(async ({ uid, photo, ...length }) => {
              let imageUrl = length.imageUrl;
              if (photo) {
                const proxyUrl = await uploadFile(photo, token, {
                  categoryId: catId,
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
            `/${cat!.slug}/subcategories/${subSlug}/items`,
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
      }
      onDone({ id: cat!.id, name: cat!.name, slug: cat!.slug });
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
                Upload <strong>3 to 7</strong> photos for{" "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {catName.trim()}
                </span>
                . These appear in the public gallery.
              </p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />
            {/* Local file picker — no upload until Save & Finish */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {imageFiles.map((file, i) => (
                  <div key={i} className="relative shrink-0 group">
                    <img src={getImageObjectUrl(file)} alt={`photo ${i + 1}`} className="h-24 w-24 object-cover border-2 border-neutral-200 dark:border-neutral-700 rounded-lg shadow-sm" />
                    <button
                      type="button"
                      onClick={() => setImageFiles((prev) => {
                        const f = prev[i];
                        const url = imageObjectUrls.current.get(f);
                        if (url) { URL.revokeObjectURL(url); imageObjectUrls.current.delete(f); }
                        return prev.filter((_, idx) => idx !== i);
                      })}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {Array.from({ length: imageFiles.length >= 7 ? 0 : Math.max(1, 3 - imageFiles.length) }, (_, slot) => slot).map((slot) => (
                  <label
                    key={slot}
                    tabIndex={0}
                    aria-label={`Add category photo ${slot + 1}`}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.querySelector("input")?.click(); } }}
                    className="cursor-pointer h-24 w-24 flex flex-col items-center justify-center gap-1 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-violet-500 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <Plus className="w-5 h-5 text-neutral-400 group-hover:text-violet-500" aria-hidden />
                    <span className="text-xs text-neutral-500 group-hover:text-violet-600 font-medium">Add Photo</span>
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setImageFiles((prev) => [...prev, file]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
            {imageFiles.length > 0 && (
              <div
                role="status"
                className={`flex items-center gap-2 text-sm ${photoOk ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-400"}`}
              >
                {photoOk ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" aria-hidden />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden />
                )}
                {imageFiles.length < 3
                  ? `${imageFiles.length} selected — add ${3 - imageFiles.length} more`
                  : imageFiles.length > 7
                    ? `${imageFiles.length} selected — remove ${imageFiles.length - 7} (max 7)`
                    : `${imageFiles.length} photos ready`}
              </div>
            )}
            <WizardNavRow
              onBack={() => setStep(0)}
              onCancel={onCancel}
              onNext={handleStep1Next}
              nextLabel="Next"
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
                For each subcategory, add photos, available sizes, and independent length-based pricing.
              </p>
            </div>
            <WizardErrorBanner error={error} onDismiss={clearError} />

            <div className="space-y-4">
              {subEntries.map((sub, si) => {
                const cardComplete =
                  sub.name.trim().length >= 2 &&
                  sub.photos.length >= 1 &&
                  sub.sizes.length > 0 &&
                  sub.sizes.every((size) =>
                    size.name.trim() && size.lengths.every((length) =>
                      (length.name ?? "").trim() !== "" && (length.price ?? "").trim() !== "",
                    ),
                  );

                return (
                  <div
                    key={sub.uid}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900"
                  >
                    <div className="p-5 space-y-5">

                      {/* ── Name + Photos side by side ── */}
                      <div className="grid grid-cols-2 gap-6 items-start">
                        {/* Left: name */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                              <Lock className="w-3.5 h-3.5 text-violet-500" aria-hidden /> Subcategory name
                            </label>
                            <div className="flex items-center gap-1">
                              {cardComplete && <CheckCircle className="w-4 h-4 text-green-500" aria-label="Complete" />}
                              {subEntries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSubRow(sub.uid)}
                                  aria-label={`Remove subcategory ${si + 1}`}
                                  className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                                </button>
                              )}
                            </div>
                          </div>
                          <input
                            aria-label={`Subcategory ${si + 1} name`}
                            className={`w-full border rounded-lg px-3 py-2.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-violet-500 bg-white dark:bg-neutral-800 ${
                              subInputError && !sub.name.trim() ? "border-red-400" : "border-neutral-300 dark:border-neutral-600"
                            }`}
                            value={sub.name}
                            onChange={(e) => updateSubField(sub.uid, "name", e.target.value)}
                            placeholder="e.g. Knotless"
                          />
                        </div>

                        {/* Right: photos */}
                        <div>
                          <label className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-violet-500" aria-hidden /> Photos
                          </label>
                          <div className="flex flex-wrap gap-2" role="list" aria-label={`Photos for subcategory ${si + 1}`}>
                            {sub.photos.map((file, pi) => (
                              <div key={pi} role="listitem" className="relative group shrink-0">
                                <img
                                  src={getObjectUrl(file)}
                                  alt={file.name}
                                  className="h-16 w-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
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
                            {Array.from({ length: Math.max(1, 3 - sub.photos.length) }, (_, slot) => slot).map((slot) => (
                              <label
                                key={slot}
                                tabIndex={0}
                                aria-label={`Add photo ${slot + 1} for subcategory ${si + 1}`}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.querySelector("input")?.click(); } }}
                                className="cursor-pointer h-16 w-16 flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg bg-neutral-50 dark:bg-neutral-800 border-violet-300 dark:border-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
                              >
                                <Plus className="w-4 h-4 text-violet-500" aria-hidden />
                                <span className="text-[9px] text-violet-500 font-medium">Add photo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => { addPhotosToSub(sub.uid, e.target.files); e.currentTarget.value = ""; }} />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Available sizes</p>
                        <div className="flex flex-wrap gap-2">
                          {sub.sizes.map((size) => {
                            const selected = sub.selectedSizeId === size.uid;
                            return (
                              <button
                                key={size.uid}
                                type="button"
                                onClick={() => selectSize(sub.uid, size.uid)}
                                aria-pressed={selected}
                                className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ${selected ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300" : "border-neutral-200 bg-white text-neutral-600 hover:border-violet-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"}`}
                              >
                                {size.name || "Untitled"}
                                {selected && <Check className="h-4 w-4" aria-hidden />}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => addSize(sub.uid)}
                            className="flex h-10 items-center gap-1.5 rounded-lg border border-dashed border-violet-300 px-4 text-sm font-medium text-violet-600 hover:border-violet-500 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30"
                          >
                            <Plus className="h-4 w-4" aria-hidden /> Add size
                          </button>
                        </div>
                      </div>

                      <div className="overflow-visible rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                        <div className="rounded-t-xl border-b border-violet-100 bg-violet-50/70 px-4 py-2.5 text-sm font-semibold text-neutral-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-neutral-100">
                          Size-based pricing
                        </div>
                        <div className="space-y-2 p-3">
                          {sub.sizes.map((size) => {
                            const expanded = sub.expandedSizeId === size.uid;
                            const summary = size.lengths.filter((length) => (length.name ?? "").trim() || (length.price ?? "").trim());
                            const firstEmptyPhoto = size.lengths.find((length) => !length.photo);
                            return (
                              <div key={size.uid} className={`relative rounded-xl border transition-colors ${expanded ? "border-violet-200 shadow-sm dark:border-violet-800" : "border-neutral-200 dark:border-neutral-700"}`}>
                                <div className="flex min-h-14 items-center gap-3 px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleSize(sub.uid, size.uid)}
                                    aria-expanded={expanded}
                                    aria-label={`${expanded ? "Collapse" : "Expand"} ${size.name}`}
                                    className="rounded-md p-1 text-violet-600 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:hover:bg-violet-950/30"
                                  >
                                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <button type="button" onClick={() => selectSize(sub.uid, size.uid)} className="min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-violet-400 rounded">
                                    <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{size.name || "Untitled size"}</span>
                                  </button>
                                  <span className="shrink-0 text-xs text-neutral-400">{size.lengths.length} {size.lengths.length === 1 ? "length" : "lengths"}</span>
                                  {!expanded && (
                                    <div className="hidden min-w-0 flex-1 items-center gap-3 overflow-hidden lg:flex">
                                      {summary.slice(0, 2).map((length, index) => (
                                        <div key={length.uid} className="flex min-w-0 items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                                          {index > 0 && <span className="text-neutral-300">•</span>}
                                          <span className="truncate">{length.name || "Length"}</span>
                                          <span className="font-medium text-neutral-800 dark:text-neutral-100">${(length.price || "0.00").replace(/^\$/, "")}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="ml-auto flex shrink-0 items-center gap-1.5">
                                    {size.lengths.filter((length) => length.photo).slice(0, 2).map((length) => (
                                      <img key={length.uid} src={getObjectUrl(length.photo!)} alt="" className="h-8 w-8 rounded-md border border-neutral-200 object-cover dark:border-neutral-700" />
                                    ))}
                                    {firstEmptyPhoto && (
                                      <label tabIndex={0} aria-label={`Add a photo to ${size.name}`} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-dashed border-violet-300 text-violet-500 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30">
                                        <ImagePlus className="h-4 w-4" aria-hidden />
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { setLengthPhoto(sub.uid, size.uid, firstEmptyPhoto.uid, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                                      </label>
                                    )}
                                    <button type="button" onClick={() => setOpenSizeMenu(openSizeMenu === size.uid ? null : size.uid)} aria-label={`Actions for ${size.name}`} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:hover:bg-neutral-800">
                                      <MoreVertical className="h-4 w-4" aria-hidden />
                                    </button>
                                  </div>
                                </div>

                                {openSizeMenu === size.uid && (
                                  <div className="absolute right-3 top-12 z-20 w-56 space-y-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-neutral-500">Size name</span>
                                      <button type="button" onClick={() => setOpenSizeMenu(null)} aria-label="Close size menu" className="rounded p-0.5 text-neutral-400 hover:text-neutral-700"><X className="h-4 w-4" /></button>
                                    </div>
                                    <input value={size.name} onChange={(e) => updateSizeName(sub.uid, size.uid, e.target.value)} aria-label={`Rename ${size.name}`} className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-neutral-600 dark:bg-neutral-800" />
                                    <button type="button" disabled={sub.sizes.length === 1} onClick={() => { deleteSize(sub.uid, size.uid); setOpenSizeMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30">
                                      <Trash2 className="h-4 w-4" /> Delete size
                                    </button>
                                  </div>
                                )}

                                {expanded && (
                                  <div className="border-t border-neutral-100 px-3 pb-3 pt-2 dark:border-neutral-800">
                                    <div className="hidden grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1.5fr)_4.5rem_2.5rem] gap-3 px-1 pb-1.5 text-xs font-medium text-neutral-400 md:grid">
                                      <span /><span>Length</span><span>Price</span><span>Deposit / Notes</span><span className="text-center">Photo</span><span className="text-center">Delete</span>
                                    </div>
                                    <div className="space-y-2">
                                      {size.lengths.map((length, li) => {
                                        const touched = size.touchedLengths.has(length.uid);
                                        return (
                                          <div
                                            key={length.uid}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => reorderLengthOptions(sub.uid, size.uid, length.uid)}
                                            className="grid grid-cols-1 gap-2 rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 md:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1.5fr)_4.5rem_2.5rem] md:items-center md:border-0 md:bg-transparent md:p-0 dark:border-neutral-700 dark:bg-neutral-800/40 md:dark:bg-transparent"
                                          >
                                            <div className="flex items-center justify-between md:block">
                                              <span className="text-xs font-semibold text-neutral-500 md:hidden">Length option {li + 1}</span>
                                              <span
                                                draggable
                                                onDragStart={() => { draggedLength.current = { subUid: sub.uid, sizeUid: size.uid, lengthUid: length.uid }; }}
                                                onDragEnd={() => { draggedLength.current = null; }}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Drag ${size.name} length ${li + 1} to reorder`}
                                                className="inline-flex cursor-grab rounded p-1 text-neutral-300 focus:outline-none focus:ring-2 focus:ring-violet-400 active:cursor-grabbing"
                                              >
                                                <GripVertical className="h-4 w-4" aria-hidden />
                                              </span>
                                            </div>
                                            <label className="space-y-1"><span className="text-xs text-neutral-500 md:hidden">Length</span><input value={length.name ?? ""} onChange={(e) => updateLengthOption(sub.uid, size.uid, length.uid, "name", e.target.value)} aria-label={`${size.name} length ${li + 1}`} placeholder="16 inches" className={`h-11 w-full rounded-lg border bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:bg-neutral-900 ${touched && !(length.name ?? "").trim() ? "border-red-300" : "border-neutral-300 dark:border-neutral-600"}`} /></label>
                                            <label className="space-y-1"><span className="text-xs text-neutral-500 md:hidden">Price</span><div className={`flex h-11 overflow-hidden rounded-lg border bg-white dark:bg-neutral-900 ${touched && !(length.price ?? "").trim() ? "border-red-300" : "border-neutral-300 dark:border-neutral-600"}`}><span className="flex items-center border-r border-neutral-200 bg-neutral-50 px-2 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800">$</span><input value={(length.price ?? "").replace(/^\$/, "")} onChange={(e) => updateLengthOption(sub.uid, size.uid, length.uid, "price", e.target.value)} aria-label={`${size.name} price ${li + 1}`} placeholder="120.00" inputMode="decimal" className="min-w-0 flex-1 px-2 text-sm focus:outline-none" /></div></label>
                                            <label className="space-y-1"><span className="text-xs text-neutral-500 md:hidden">Deposit / Notes</span><input value={length.notes ?? ""} onChange={(e) => updateLengthOption(sub.uid, size.uid, length.uid, "notes", e.target.value)} aria-label={`${size.name} notes ${li + 1}`} placeholder="$50.00 deposit required" className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-neutral-600 dark:bg-neutral-900" /></label>
                                            <div className="flex items-center gap-2 md:justify-center">
                                              <span className="text-xs text-neutral-500 md:hidden">Photo</span>
                                              {length.photo ? (
                                                <div className="relative group"><img src={getObjectUrl(length.photo)} alt={`${size.name} ${length.name} preview`} className="h-11 w-11 rounded-lg border border-neutral-200 object-cover dark:border-neutral-700" /><button type="button" onClick={() => setLengthPhoto(sub.uid, size.uid, length.uid, undefined)} aria-label="Remove photo" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-700 text-white opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button></div>
                                              ) : (
                                                <label tabIndex={0} aria-label={`Upload photo for ${size.name} ${length.name || li + 1}`} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-violet-300 text-violet-500 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30"><Plus className="h-4 w-4" /><input type="file" accept="image/*" className="hidden" onChange={(e) => { setLengthPhoto(sub.uid, size.uid, length.uid, e.target.files?.[0]); e.currentTarget.value = ""; }} /></label>
                                              )}
                                            </div>
                                            <button type="button" onClick={() => deleteLengthOption(sub.uid, size.uid, length.uid)} disabled={size.lengths.length === 1} aria-label={`Delete ${size.name} length ${li + 1}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:border-red-400 hover:bg-red-50 disabled:opacity-30 md:mx-auto dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <button type="button" onClick={() => addLengthOption(sub.uid, size.uid)} className="mt-3 flex h-9 items-center gap-1.5 rounded-lg border border-violet-300 px-3 text-sm font-medium text-violet-600 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-violet-700 dark:hover:bg-violet-950/30">
                                      <Plus className="h-4 w-4" /> Add length option
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                <span className="block">Category created with {imageFiles.length} photos.</span>
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