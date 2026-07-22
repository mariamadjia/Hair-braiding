import { useCallback, useRef, useState } from "react";
import type { LengthOption } from "@/lib/booking-types";
import { galleryApi } from "@/lib/api/gallery";
import { API_BASE_URL } from "@/lib/config/api";
import { fromProxyUrl } from "@/lib/utils/image";
import { slugify, uploadFile } from "../../utils";
import { validateFile } from "../../utils/fileValidation";
import {
  emptyLengthEntry,
  emptySizeEntry,
  emptySubEntry,
  hasSizeData,
  isSizeComplete,
  type SubEntry,
  type WizardProps,
} from "./model";

export function useNewCategoryWizard({ token, mutate, onDone }: Pick<WizardProps, "token" | "mutate" | "onDone">) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savePhase, setSavePhase] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catNameError, setCatNameError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [subEntries, setSubEntries] = useState<SubEntry[]>([emptySubEntry()]);
  const [subInputError, setSubInputError] = useState("");
  const [createdCat, setCreatedCat] = useState<{ id: number; name: string; slug: string } | null>(null);
  const [openSizeMenu, setOpenSizeMenu] = useState<string | null>(null);
  const [customSizeSubUid, setCustomSizeSubUid] = useState<string | null>(null);
  const [customSizeName, setCustomSizeName] = useState("");
  const persistedSubs = useRef<Map<string, { slug: string; id: number; itemIds: Record<string, number> }>>(new Map());
  const imageObjectUrls = useRef<Map<File, string>>(new Map());
  const objectUrls = useRef<Map<File, string>>(new Map());
  const draggedLength = useRef<{ subUid: string; sizeUid: string; lengthUid: string } | null>(null);

  const clearError = () => setError(null);
  const filledSubs = subEntries.filter((entry) => entry.name.trim().length >= 2);
  const photoOk = imageFiles.length >= 3 && imageFiles.length <= 5;

  const getImageObjectUrl = useCallback((file: File) => {
    if (!imageObjectUrls.current.has(file)) imageObjectUrls.current.set(file, URL.createObjectURL(file));
    return imageObjectUrls.current.get(file)!;
  }, []);

  const getObjectUrl = useCallback((file: File) => {
    if (!objectUrls.current.has(file)) objectUrls.current.set(file, URL.createObjectURL(file));
    return objectUrls.current.get(file)!;
  }, []);

  const addCategoryPhoto = (file?: File) => {
    if (!file) return;
    
    // Validate file before adding
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    // Check if we've reached the maximum
    if (imageFiles.length >= 5) {
      setError("Maximum 5 photos allowed. Remove some photos first.");
      return;
    }
    
    setImageFiles((prev) => [...prev, file]);
    setError(null);
  };

  const removeCategoryPhoto = (index: number) => {
    setImageFiles((prev) => {
      const file = prev[index];
      const url = imageObjectUrls.current.get(file);
      if (url) {
        URL.revokeObjectURL(url);
        imageObjectUrls.current.delete(file);
      }
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const handleStep0Next = async () => {
    const trimmed = catName.trim();
    if (!trimmed) { setCatNameError("Category name is required."); return; }
    if (trimmed.length < 2) { setCatNameError("Name must be at least 2 characters."); return; }
    
    // Check for slug uniqueness on backend
    try {
      const catSlug = slugify(trimmed);

      const response = await fetch(`${API_BASE_URL}/api/categories/exists/${catSlug}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.exists) {
          setCatNameError("A category with this name already exists. Please choose a different name.");
          return;
        }
      }
    } catch (error) {
      // If check fails, allow proceeding (backend will handle duplicate)
      console.error("Slug uniqueness check failed:", error);
    }
    
    setCatNameError("");
    clearError();
    setStep(1);
  };

  const handleStep1Next = () => {
    if (imageFiles.length < 3) { setError("Add at least 3 photos to continue."); return; }
    if (imageFiles.length > 7) { setError("Maximum 7 photos allowed."); return; }
    clearError();
    setStep(2);
  };

  const addSubRow = () => setSubEntries((prev) => [...prev, emptySubEntry()]);

  const removeSubRow = (uid: string) => {
    setSubEntries((prev) => {
      const entry = prev.find((sub) => sub.uid === uid);
      if (entry) {
        [...entry.photos, ...entry.sizes.flatMap((size) => [...size.photos, ...size.lengths.map((length) => length.photo).filter((file): file is File => Boolean(file))])].forEach((file) => {
          const url = objectUrls.current.get(file);
          if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(file); }
        });
      }
      return prev.filter((sub) => sub.uid !== uid);
    });
  };

  const addPhotosToSub = (uid: string, files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    setSubEntries((prev) => prev.map((sub) => sub.uid === uid ? { ...sub, photos: [...sub.photos, ...incoming] } : sub));
  };

  const removePhotoFromSub = (uid: string, index: number) => {
    setSubEntries((prev) => prev.map((sub) => {
      if (sub.uid !== uid) return sub;
      const file = sub.photos[index];
      const url = objectUrls.current.get(file);
      if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(file); }
      return { ...sub, photos: sub.photos.filter((_, currentIndex) => currentIndex !== index) };
    }));
  };

  const updateSubName = (uid: string, name: string) => {
    setSubInputError("");
    setSubEntries((prev) => prev.map((sub) => sub.uid === uid ? { ...sub, name } : sub));
  };

  const activateSize = (subUid: string, name: string) => {
    const size = emptySizeEntry(name);
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: [...sub.sizes, size],
      selectedSizeId: size.uid,
      expandedSizeId: size.uid,
    } : sub));
  };

  const commitCustomSize = (subUid: string) => {
    const name = customSizeName.trim();
    const sub = subEntries.find((entry) => entry.uid === subUid);
    if (!name) return;
    if (sub?.sizes.some((size) => size.name.trim().toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" is already available.`);
      return;
    }
    activateSize(subUid, name);
    setCustomSizeName("");
    setCustomSizeSubUid(null);
    clearError();
  };

  const updateSizeName = (subUid: string, sizeUid: string, name: string) => {
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? { ...size, name } : size),
    } : sub));
  };

  const selectSize = (subUid: string, sizeUid: string) => {
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? { ...sub, selectedSizeId: sizeUid, expandedSizeId: sizeUid } : sub));
  };

  const toggleSize = (subUid: string, sizeUid: string) => {
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      selectedSizeId: sizeUid,
      expandedSizeId: sub.expandedSizeId === sizeUid ? null : sizeUid,
    } : sub));
  };

  const deleteSize = (subUid: string, sizeUid: string) => {
    const removed = subEntries.find((entry) => entry.uid === subUid)?.sizes.find((size) => size.uid === sizeUid);
    if (!removed) return;
    if (hasSizeData(removed) && !window.confirm(`Remove ${removed.name} and all of its pricing details?`)) return;
    removed.lengths.forEach((length) => {
      if (!length.photo) return;
      const url = objectUrls.current.get(length.photo);
      if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(length.photo); }
    });
    removed.photos.forEach((file) => {
      const url = objectUrls.current.get(file);
      if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(file); }
    });
    setSubEntries((prev) => prev.map((entry) => {
      if (entry.uid !== subUid) return entry;
      const sizes = entry.sizes.filter((size) => size.uid !== sizeUid);
      const fallbackId = sizes[0]?.uid ?? "";
      return {
        ...entry,
        sizes,
        selectedSizeId: entry.selectedSizeId === sizeUid ? fallbackId : entry.selectedSizeId,
        expandedSizeId: entry.expandedSizeId === sizeUid ? (fallbackId || null) : entry.expandedSizeId,
      };
    }));
  };

  const togglePresetSize = (subUid: string, name: string) => {
    const active = subEntries.find((sub) => sub.uid === subUid)?.sizes.find((size) => size.name.toLowerCase() === name.toLowerCase());
    if (active) deleteSize(subUid, active.uid);
    else activateSize(subUid, name);
  };

  const addLengthOption = (subUid: string, sizeUid: string) => {
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? { ...size, lengths: [...size.lengths, emptyLengthEntry()] } : size),
    } : sub));
  };

  const updateLengthOption = (subUid: string, sizeUid: string, lengthUid: string, field: keyof LengthOption, value: string) => {
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? {
        ...size,
        touchedLengths: new Set(size.touchedLengths).add(lengthUid),
        lengths: size.lengths.map((length) => length.uid === lengthUid ? { ...length, [field]: value } : length),
      } : size),
    } : sub));
  };

  const deleteLengthOption = (subUid: string, sizeUid: string, lengthUid: string) => {
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
  };

  const setLengthPhoto = (subUid: string, sizeUid: string, lengthUid: string, file?: File) => {
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
  };

  const addPhotosToSize = (subUid: string, sizeUid: string, files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => size.uid === sizeUid ? { ...size, photos: [...size.photos, ...incoming] } : size),
    } : sub));
  };

  const removePhotoFromSize = (subUid: string, sizeUid: string, index: number) => {
    setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
      ...sub,
      sizes: sub.sizes.map((size) => {
        if (size.uid !== sizeUid) return size;
        const file = size.photos[index];
        const url = objectUrls.current.get(file);
        if (url) { URL.revokeObjectURL(url); objectUrls.current.delete(file); }
        return { ...size, photos: size.photos.filter((_, currentIndex) => currentIndex !== index) };
      }),
    } : sub));
  };

  const startLengthDrag = (subUid: string, sizeUid: string, lengthUid: string) => {
    draggedLength.current = { subUid, sizeUid, lengthUid };
  };

  const endLengthDrag = () => { draggedLength.current = null; };

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
    endLengthDrag();
  };

  const revealInvalidSize = (subUid: string, sizeUid?: string) => {
    if (sizeUid) {
      setSubEntries((prev) => prev.map((sub) => sub.uid === subUid ? {
        ...sub,
        selectedSizeId: sizeUid,
        expandedSizeId: sizeUid,
        sizes: sub.sizes.map((size) => size.uid === sizeUid ? { ...size, touchedLengths: new Set(size.lengths.map((length) => length.uid)) } : size),
      } : sub));
    }
    requestAnimationFrame(() => {
      document.getElementById(sizeUid ? `size-panel-${sizeUid}` : `subcategory-${subUid}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const validateSubcategories = () => {
    if (filledSubs.length === 0) { setSubInputError("Add at least one subcategory name (min 2 chars)."); return false; }
    const missingPhoto = filledSubs.find((entry) => entry.photos.length === 0);
    if (missingPhoto) { setError(`Add at least one photo for "${missingPhoto.name.trim()}".`); revealInvalidSize(missingPhoto.uid); return false; }
    const missingSizes = filledSubs.find((entry) => entry.sizes.length === 0);
    if (missingSizes) { setError(`Select at least one available size for "${missingSizes.name.trim()}".`); revealInvalidSize(missingSizes.uid); return false; }
    const invalidSizeEntry = filledSubs.find((entry) => entry.sizes.some((size) => !size.name.trim()));
    if (invalidSizeEntry) {
      const invalidSize = invalidSizeEntry.sizes.find((size) => !size.name.trim());
      setError(`Enter a name for every size under "${invalidSizeEntry.name.trim()}".`);
      revealInvalidSize(invalidSizeEntry.uid, invalidSize?.uid);
      return false;
    }
    const duplicateSizeEntry = filledSubs.find((entry) => {
      const names = entry.sizes.map((size) => size.name.trim().toLowerCase());
      return new Set(names).size !== names.length;
    });
    if (duplicateSizeEntry) {
      const duplicate = duplicateSizeEntry.sizes.find((size, index, sizes) => sizes.findIndex((candidate) => candidate.name.trim().toLowerCase() === size.name.trim().toLowerCase()) !== index);
      setError(`Each size under "${duplicateSizeEntry.name.trim()}" must have a unique name.`);
      revealInvalidSize(duplicateSizeEntry.uid, duplicate?.uid);
      return false;
    }
    const invalidLengthEntry = filledSubs.find((entry) => entry.sizes.some((size) => !isSizeComplete(size)));
    if (invalidLengthEntry) {
      const invalidSize = invalidLengthEntry.sizes.find((size) => !isSizeComplete(size));
      setError(`Complete the missing length and price fields under "${invalidSize?.name || invalidLengthEntry.name.trim()}".`);
      revealInvalidSize(invalidLengthEntry.uid, invalidSize?.uid);
      return false;
    }
    return true;
  };

  const handleStep2Next = async () => {
    if (!validateSubcategories()) return;
    setSubInputError("");
    clearError();
    setBusy(true);
    setSavePhase("Uploading images…");
    try {
      const trimmed = catName.trim();
      const catSlug = slugify(trimmed);

      // Upload all images first (staged, no category association yet)
      const allUploads: { file: File; type: 'category' | 'subcategory' | 'length' | 'size'; subIndex?: number; sizeIndex?: number; lengthIndex?: number }[] = [];

      imageFiles.forEach((file) => allUploads.push({ file, type: 'category' }));

      filledSubs.forEach((sub, subIndex) => {
        sub.photos.forEach((file) => allUploads.push({ file, type: 'subcategory', subIndex }));
        sub.sizes.forEach((size, sizeIndex) => {
          size.photos.forEach((file) => allUploads.push({ file, type: 'size', subIndex, sizeIndex }));
          size.lengths.forEach((length, lengthIndex) => {
            if (length.photo) allUploads.push({ file: length.photo, type: 'length', subIndex, sizeIndex, lengthIndex });
          });
        });
      });

      const totalImages = allUploads.length;
      let uploadedCount = 0;

      type UploadWithId = typeof allUploads[0] & { imageId?: number; imageUrl?: string };

      // Upload images with progress feedback
      const uploadWithProgress = async (upload: typeof allUploads[0]): Promise<UploadWithId> => {
        // Use simple upload for size photos, gallery upload for others
        if (upload.type === 'size') {
          const url = await uploadFile(upload.file, token, {}, true);
          uploadedCount++;
          setSavePhase(`Uploading images… (${uploadedCount}/${totalImages})`);
          return { ...upload, imageUrl: url };
        } else {
          const image = await galleryApi.uploadImage({ file: upload.file });
          uploadedCount++;
          setSavePhase(`Uploading images… (${uploadedCount}/${totalImages})`);
          return { ...upload, imageId: image.id };
        }
      };

      const uploadedImages = await Promise.all(
        allUploads.map((upload) => uploadWithProgress(upload))
      );

      setSavePhase("Creating category structure…");

      // Build the complete category request
      const categoryImageIds = uploadedImages
        .filter((u) => u.type === "category" && typeof u.imageId === "number")
        .map((u) => u.imageId as number);

      const subcategories = filledSubs.map((sub, subIndex) => {
        const subImageIds = uploadedImages
          .filter((u) => u.type === "subcategory" && u.subIndex === subIndex && typeof u.imageId === "number")
          .map((u) => u.imageId as number);

        const sizes = sub.sizes.map((size, sizeIndex) => {
        const sizePhotos = uploadedImages
          .filter((u) => u.type === "size" && u.subIndex === subIndex && u.sizeIndex === sizeIndex)
          .map((u) => u.imageUrl)
          .filter((url): url is string => Boolean(url));

        const lengths = size.lengths.map((length, lengthIndex) => {
          const uploaded = uploadedImages.find(
            (u) => u.type === 'length' && u.subIndex === subIndex && u.sizeIndex === sizeIndex && u.lengthIndex === lengthIndex
          );
          return {
            name: (length.name || '').trim(),
            price: (length.price || '').trim(),
            notes: length.notes || undefined,
            imageId: uploaded?.imageId || null,
          };
        });
        return {
          name: size.name.trim(),
          sizePhotos,
          lengths,
        };
      });

        return {
          name: sub.name.trim(),
          imageIds: subImageIds,
          sizes,
        };
      });

      const completeRequest = {
        name: trimmed,
        slug: catSlug,
        categoryImageIds,
        subcategories,
      };

      // Single transactional call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const created = await fetch(`${API_BASE_URL}/api/categories/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(completeRequest),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!created.ok) {
          const errorText = await created.text();
          throw new Error(errorText || 'Failed to create category');
        }

        const result = await created.json();
        if (!result.id) throw new Error('Server did not return a category ID.');

        setCreatedCat({ id: result.id, name: result.name, slug: result.slug });
        setStep(3);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Save timed out. Please try again with fewer images or check your connection.');
        }
        throw error;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to save. Please try again.');
    } finally {
      setBusy(false);
      setSavePhase(null);
    }
  };

  const finishWizard = () => {
    if (createdCat) onDone(createdCat);
  };

  return {
    step, setStep, error, clearError, busy, savePhase, catName, setCatName, catNameError, setCatNameError,
    imageFiles, photoOk, getImageObjectUrl, addCategoryPhoto, removeCategoryPhoto, subEntries, subInputError,
    createdCat, filledSubs, openSizeMenu, setOpenSizeMenu, customSizeSubUid, setCustomSizeSubUid,
    customSizeName, setCustomSizeName, getObjectUrl, handleStep0Next, handleStep1Next, handleStep2Next,
    addSubRow, removeSubRow, addPhotosToSub, removePhotoFromSub, updateSubName, commitCustomSize,
    updateSizeName, selectSize, toggleSize, deleteSize, togglePresetSize, addLengthOption, updateLengthOption,
    deleteLengthOption, setLengthPhoto, addPhotosToSize, removePhotoFromSize, startLengthDrag, endLengthDrag,
    reorderLengthOptions, finishWizard,
  };
}

export type NewCategoryWizardController = ReturnType<typeof useNewCategoryWizard>;
