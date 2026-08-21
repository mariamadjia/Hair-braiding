"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronUp, Ruler, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BookingCategory, BookingSubcategory, BookingItem, BookingAddOn } from "@/lib/booking-types";
import Navbar from "@/components/Navbar";
import LengthGuideOverlay from "@/components/LengthGuideOverlay";
import SizeGuideOverlay from "@/components/SizeGuideOverlay";
import { guideImageUrl, guideKeyForSize, useGuideSettings } from "@/lib/guides";
import { formatPrice } from "@/lib/utils/price";
import { toProxyUrl } from "@/lib/utils/image";
import { API_BASE_URL } from "@/lib/config/api";

type ModalQuote = { servicePriceCents: number; depositCents: number; remainingBalanceCents: number };

function sortItemsBySize(items: BookingItem[]): BookingItem[] {
    return [...items].sort((a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER)
        - (b.displayOrder ?? Number.MAX_SAFE_INTEGER));
}

function itemPriceLabel(item: BookingItem): string {
    const prices = (item.lengthOptions ?? []).map(option => Number((option.price ?? "").replace(/[^0-9.]/g, ""))).filter(Number.isFinite);
    if (prices.length === 0) return formatPrice(item.price);
    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);
    return minimum === maximum ? formatPrice(minimum) : `${formatPrice(minimum)} - ${formatPrice(maximum)}`;
}

function optionPrice(item: BookingItem, option: NonNullable<BookingItem["lengthOptions"]>[number], foundation: "REGULAR" | "KNOTLESS" | null) {
    const regular = Number((option.price || "0").replace(/[^0-9.]/g, "")) || 0;
    if (foundation !== "KNOTLESS") return regular;
    if (item.knotlessPricingMode === "SEPARATE") {
        return Number((option.knotlessPrice || "0").replace(/[^0-9.]/g, "")) || 0;
    }
    return regular + (Number((item.knotlessPriceAdjustment || "0").replace(/[^0-9.]/g, "")) || 0);
}

export default function SubcategoryPageClient({ category, subcategory }: { category: BookingCategory; subcategory: BookingSubcategory }) {
    const router = useRouter();

    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [selectedLength, setSelectedLength] = useState<string | null>(null);
    const [photoItemIndex, setPhotoItemIndex] = useState<number | null>(null);
    const [photoImageIndex, setPhotoImageIndex] = useState(0);
    const [selectedTexture, setSelectedTexture] = useState<string | null>(null);
    const [selectedFoundation, setSelectedFoundation] = useState<"REGULAR" | "KNOTLESS" | null>(null);
    const [showLengthGuide, setShowLengthGuide] = useState(false);
    const [showSizeGuide, setShowSizeGuide] = useState(false);
    const guides = useGuideSettings();
    const [availableAddOns, setAvailableAddOns] = useState<BookingAddOn[]>([]);
    const [selectedAddOnIds, setSelectedAddOnIds] = useState<number[]>([]);
    const [loadingAddOns, setLoadingAddOns] = useState(false);
    const [modalQuote, setModalQuote] = useState<ModalQuote | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const items = sortItemsBySize(subcategory.items ?? []);
    const subcategoryGalleryImageUrls =
        subcategory.galleryImages && subcategory.galleryImages.length > 0
            ? subcategory.galleryImages
                  .map((image) => image.imageUrl)
                  .filter((url): url is string => Boolean(url))
            : [];

    const subcategoryImages = (
        subcategory.images && subcategory.images.length > 0
            ? subcategory.images
            : subcategoryGalleryImageUrls.length > 0
                ? subcategoryGalleryImageUrls
                : subcategory.image
                    ? [subcategory.image]
                    : []
    ).filter(Boolean).map(toProxyUrl);
    const heroImage = subcategoryImages[0] ?? null;

    const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;
    const selectedSizeGuide = guides?.sizes.find(size => size.guideKey === (selectedItem?.sizeGuideKey || guideKeyForSize(selectedItem?.name)));
    const lengthOptions = selectedItem?.lengthOptions ?? [];
    const selectedLengthOption = lengthOptions.find((option) => option.id?.toString() === selectedLength);
    const fixedAddOnTotal = availableAddOns.filter(addOn => selectedAddOnIds.includes(addOn.id) && addOn.pricingMode === "FIXED").reduce((sum, addOn) => sum + addOn.priceCents, 0);
    const photoItem = photoItemIndex !== null ? items[photoItemIndex] : null;
    
    const photoGallery = (photoItem?.sizePhotos?.length ? photoItem.sizePhotos : 
        photoItem?.images?.length ? photoItem.images : 
        photoItem?.image ? [photoItem.image] : [])
        .filter(Boolean)
        .map(toProxyUrl);
    
    const hasMultiplePhotos = photoGallery.length > 1;

    const openModalForItem = (index: number) => {
        const item = items[index];
        
        setSelectedItemIndex(index);
        setSelectedLength(item?.lengthOptions?.length ? null : "__fixed__");
        setSelectedTexture(item?.hairTextures?.[0] ?? null);
        setSelectedFoundation(null);
        setModalQuote(null);
        setQuoteError(null);
        setShowLengthGuide(false);
    };

    const closeModal = () => {
        setSelectedItemIndex(null);
        setSelectedLength(null);
        setSelectedTexture(null);
        setSelectedFoundation(null);
        setShowLengthGuide(false);
        setAvailableAddOns([]);
        setSelectedAddOnIds([]);
        setModalQuote(null);
        setQuoteError(null);
    };

    useEffect(() => {
        if (!selectedItem?.id || !selectedLengthOption?.id) { setAvailableAddOns([]); setSelectedAddOnIds([]); return; }
        let active = true;
        setLoadingAddOns(true);
        fetch(`${API_BASE_URL}/api/services/${selectedItem.id}/add-ons?lengthOptionId=${selectedLengthOption.id}`)
            .then(async response => { if (!response.ok) throw new Error("Unable to load add-ons"); return response.json(); })
            .then((result: BookingAddOn[]) => { if (active) { setAvailableAddOns(result); setSelectedAddOnIds(current => current.filter(id => result.some(item => item.id === id))); } })
            .catch(() => { if (active) { setAvailableAddOns([]); setSelectedAddOnIds([]); } })
            .finally(() => { if (active) setLoadingAddOns(false); });
        return () => { active = false; };
    }, [selectedItem?.id, selectedLengthOption?.id]);

    useEffect(() => {
        if (!selectedItem?.id || selectedItem.pricingMode !== "FIXED" || (selectedItem.foundationChoicesEnabled && !selectedFoundation)) return;
        const controller = new AbortController();
        setQuoteLoading(true);
        setQuoteError(null);
        setModalQuote(null);
        fetch("/api/booking/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceId: selectedItem.id, lengthOptionId: null, foundation: selectedFoundation, addOnIds: [] }),
            signal: controller.signal,
        }).then(async response => {
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || payload.message || "Unable to confirm price.");
            return payload;
        }).then(setModalQuote).catch(error => {
            if (!(error instanceof DOMException && error.name === "AbortError")) setQuoteError(error instanceof Error ? error.message : "Unable to confirm price.");
        }).finally(() => setQuoteLoading(false));
        return () => controller.abort();
    }, [selectedItem?.id, selectedItem?.pricingMode, selectedItem?.foundationChoicesEnabled, selectedFoundation]);

    const openPhotoModal = (index: number) => {
        const item = items[index];
        
        if (item?.image || item?.images?.length || item?.sizePhotos?.length) {
            setPhotoItemIndex(index);
            setPhotoImageIndex(0);
        }
    };

    const closePhotoModal = () => {
        setPhotoItemIndex(null);
        setPhotoImageIndex(0);
    };

    const showNextPhoto = () => {
        if (!hasMultiplePhotos) return;
        setPhotoImageIndex((prev) => (prev + 1) % photoGallery.length);
    };

    const showPrevPhoto = () => {
        if (!hasMultiplePhotos) return;
        setPhotoImageIndex((prev) => (prev - 1 + photoGallery.length) % photoGallery.length);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (showSizeGuide) {
                    setShowSizeGuide(false);
                } else if (showLengthGuide) {
                    setShowLengthGuide(false);
                } else if (photoItemIndex !== null) {
                    closePhotoModal();
                } else if (selectedItemIndex !== null) {
                    closeModal();
                }
            }
            if (photoItemIndex !== null && hasMultiplePhotos) {
                if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    showPrevPhoto();
                } else if (e.key === "ArrowRight") {
                    e.preventDefault();
                    showNextPhoto();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [photoItemIndex, selectedItemIndex, hasMultiplePhotos, showLengthGuide, showSizeGuide]);

    const handleModalSelect = () => {
        if (!selectedItem || !selectedLength) return;
        if (selectedItem.foundationChoicesEnabled && !selectedFoundation) return;
        if (selectedItem.hairTextures?.length && !selectedTexture) return;

        const option = lengthOptions.find((opt) => opt.id?.toString() === selectedLength);

        const params = new URLSearchParams({
            categorySlug: category.slug,
            subcategorySlug: subcategory.slug,
            serviceId: selectedItem.id?.toString() ?? "",
            style: subcategory.name,
            size: selectedItem.name,
            length: option?.name ?? "",
            lengthOptionId: option?.id?.toString() ?? "",
            price: option?.price ?? selectedItem.price ?? "",
            description: selectedItem.description ?? "Professional braiding service",
            texture: selectedTexture ?? "",
            foundation: selectedFoundation ?? "",
            image: selectedItem.image || subcategory.image || "",
        });
        if (selectedAddOnIds.length) params.set("addOns", selectedAddOnIds.join(","));

        router.push(`/checkout?${params.toString()}`);
        closeModal();
    };

    return (
        <>
            <Navbar />
            <section className="relative overflow-hidden bg-[#F6F5F1] py-24 md:py-32 text-neutral-900">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
                    {heroImage && (
                        <div className="relative h-64 w-full max-w-xl mx-auto mb-6 rounded-sm overflow-hidden">
                            <img
                                src={heroImage}
                                alt={subcategory.name}
                                className="object-contain w-full h-full"
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 mb-4">{category.name}</p>
                        <h1 className="text-4xl md:text-6xl font-light tracking-tight text-neutral-900">
                            {subcategory.name}
                        </h1>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-none border border-neutral-300 bg-transparent px-6 py-2.5 text-xs font-medium uppercase tracking-[0.25em] text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
                        >
                            <Link href={`/booking/${category.slug}`}>
                                <ChevronLeft className="h-3 w-3 mr-2" />
                                Back to {category.name}
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="pointer-events-none absolute -top-20 right-10 h-56 w-56 rounded-full bg-amber-100/30 blur-3xl" aria-hidden="true" />
            </section>


            <section className="bg-[#F6F5F1] pb-24 md:pb-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-6">
                    {items.map((item, index) => {
                        
                        return (
                        <div
                            key={`${item.name}-${index}`}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-sm border border-neutral-200/60 bg-[#F6F5F1] py-6 px-6 md:px-8 transition-all duration-300 hover:bg-white/50"
                        >
                            <div className="w-full text-neutral-900">
                                <span className="block text-base md:text-lg font-light tracking-wide">
                                    {item.name}
                                </span>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-neutral-600 font-light">
                                    {item.lengthOptions && item.lengthOptions.length > 0 && (
                                        <span className="font-medium">
                                            {itemPriceLabel(item)}
                                        </span>
                                    )}
                                    {item.lengthOptions && item.lengthOptions.length > 0 && (
                                        <span className="text-neutral-500">• {item.lengthOptions.length} length {item.lengthOptions.length === 1 ? 'option' : 'options'}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                {item.sizePhotos && item.sizePhotos.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => openPhotoModal(index)}
                                        className="rounded-none border border-neutral-300 bg-transparent px-4 md:px-5 py-2 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900 whitespace-nowrap"
                                    >
                                        View Photo
                                    </button>
                                )}
                                <Button
                                    className="rounded-none bg-[#2C1810] text-white px-4 py-2 text-[10px] md:text-xs uppercase tracking-wider font-semibold hover:bg-[#1a0f0a] transition-colors shrink-0 whitespace-nowrap"
                                    onClick={() => openModalForItem(index)}
                                >
                                    Book Now
                                </Button>
                            </div>
                        </div>
                    );
                    })}
                </div>
            </section>

            {photoItem && photoGallery.length > 0 && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" 
                    onClick={closePhotoModal}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="photo-modal-title"
                >
                    <div
                        className="relative w-full max-w-lg overflow-hidden rounded-sm bg-white shadow-[0_20px_60px_rgb(0,0,0,0.3)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={closePhotoModal}
                            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-md hover:bg-white transition"
                            aria-label="Close photo"
                        >
                            ×
                        </button>
                        <div className="relative aspect-[3/4] w-full overflow-hidden">
                            <img
                                src={photoGallery[photoImageIndex]}
                                alt={`${photoItem.name} photo ${photoImageIndex + 1}`}
                                className="object-cover w-full h-full"
                            />
                            {hasMultiplePhotos && (
                                <>
                                    <button
                                        type="button"
                                        onClick={showPrevPhoto}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold text-white shadow-md hover:bg-black/50 backdrop-blur-sm"
                                        aria-label="Previous photo"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        type="button"
                                        onClick={showNextPhoto}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold text-white shadow-md hover:bg-black/50 backdrop-blur-sm"
                                        aria-label="Next photo"
                                    >
                                        ›
                                    </button>
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                                        {photoGallery.map((_, idx) => (
                                            <span
                                                key={idx}
                                                className={`h-1.5 w-6 rounded-full transition ${
                                                    idx === photoImageIndex ? "bg-neutral-900" : "bg-neutral-300"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-6 bg-white">
                            <h3 id="photo-modal-title" className="text-base font-light tracking-wide text-neutral-900">{photoItem.name}</h3>
                            {photoItem.description?.includes("\n") && (
                                <p className="mt-2 text-sm text-neutral-600 font-light whitespace-pre-line">{photoItem.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {selectedItem && (selectedItem.pricingMode === "FIXED" || lengthOptions.length > 0) && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4 md:py-8"
                    onClick={closeModal}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="options-modal-title"
                >
                    <div
                        className={`relative flex h-[min(600px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] w-full max-w-[380px] flex-col rounded-xl bg-white text-neutral-900 shadow-[0_20px_60px_rgb(0,0,0,0.3)] transition-transform duration-300 lg:h-[min(720px,calc(100dvh-2rem))] ${showLengthGuide || showSizeGuide ? "overflow-hidden lg:-translate-x-[17rem] lg:overflow-visible" : "overflow-hidden"}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <style jsx>{`
                            .scrollbar-hide::-webkit-scrollbar {
                                display: none;
                            }
                            .scrollbar-hide {
                                -ms-overflow-style: none;
                                scrollbar-width: none;
                            }
                        `}</style>
                        <div className="relative shrink-0 border-b border-neutral-200/60 bg-white px-6 py-5 pr-16 text-left md:px-8 md:py-6">
                            <button type="button" onClick={closeModal} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900" aria-label="Close modal">×</button>
                            <h2 id="options-modal-title" className="text-xl font-light tracking-wide text-neutral-900 md:text-2xl">{selectedItem.name}</h2>
                            {selectedItem.description && (
                                <p className="text-sm text-neutral-600 font-light whitespace-pre-line">
                                    {selectedItem.description}
                                </p>
                            )}
                            <p className="mt-3 text-sm font-medium text-neutral-900">{selectedItem.pricingMode === "FIXED" ? "Confirm your service." : "Choose your preferred length."}</p>
                            <div className="mt-2 flex flex-wrap gap-x-5">
                            {guides?.sizeGuideEnabled && selectedSizeGuide?.imageUrl && <button type="button" onClick={() => setShowSizeGuide(true)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#2C1810] underline underline-offset-4"><Rows3 className="h-4 w-4" /> View size guide</button>}
                            {guides?.lengthGuideEnabled && guides.lengthGuideImageUrl && <button type="button" onClick={() => setShowLengthGuide(true)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#2C1810] underline decoration-[#2C1810]/40 underline-offset-4 transition hover:decoration-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#2C1810] focus:ring-offset-2">
                                <Ruler className="h-4 w-4" /> View length guide
                            </button>}
                            </div>
                        </div>

                        <div className="relative flex-1 space-y-2 overflow-y-auto px-6 py-4 md:px-8 scrollbar-hide">
                            {selectedItem.pricingMode === "FIXED" && <div className="rounded-xl border-2 border-[#2C1810] bg-[#FAF7F2] px-5 py-5"><div className="flex items-center justify-between gap-4"><div className="flex items-start gap-4"><span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#2C1810]"><span className="h-2.5 w-2.5 rounded-full bg-[#2C1810]" /></span><div><p className="font-medium text-neutral-900">{selectedItem.name}</p><p className="mt-1 text-sm text-neutral-500">{quoteLoading ? "Confirming deposit…" : modalQuote ? `${formatPrice(modalQuote.depositCents / 100)} deposit required` : "Deposit required"}</p></div></div><p className="text-xl font-medium text-neutral-900">{modalQuote ? formatPrice(modalQuote.servicePriceCents / 100) : formatPrice(selectedItem.price)}</p></div>{quoteError && <p role="alert" className="mt-4 text-sm text-red-600">{quoteError}</p>}</div>}
                            {selectedItem.foundationChoicesEnabled && <div className="mb-5 space-y-3 border-b border-neutral-200 pb-5"><p className="text-sm font-medium text-neutral-900">Choose your braid foundation.</p><div className="grid grid-cols-2 gap-3">{([['REGULAR', 'Regular'], ['KNOTLESS', 'Knotless']] as const).map(([value, label]) => { const selected = selectedFoundation === value; return <button key={value} type="button" onClick={() => setSelectedFoundation(value)} className={`min-h-16 rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#2C1810] focus:ring-offset-2 ${selected ? 'border-[#2C1810] bg-[#FAF7F2]' : 'border-neutral-200 hover:border-neutral-400'}`}><span className="flex items-center gap-2 text-sm font-semibold"><span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${selected ? 'border-[#2C1810] bg-[#2C1810] text-white' : 'border-neutral-300'}`}>{selected ? '✓' : ''}</span>{label}</span>{value === 'KNOTLESS' && <span className="mt-1 block pl-6 text-xs text-neutral-600">{selectedItem.knotlessPricingMode === "SEPARATE" ? "Individual prices" : `+${formatPrice(selectedItem.knotlessPriceAdjustment || '0')}`}</span>}</button>; })}</div>{selectedFoundation && <p className="text-xs text-neutral-600">{selectedFoundation === 'KNOTLESS' ? 'Knotless' : 'Regular'} selected · Prices updated</p>}</div>}
                            {lengthOptions.map((option, idx) => {
                                const optionKey = option.id?.toString() ?? `option-${idx}`;
                                const isSelected = selectedLength === optionKey;
                                return (
                                    <div key={optionKey} className={`overflow-hidden rounded-xl bg-white transition ${isSelected ? "border-2 border-[#2C1810] shadow-sm" : "border border-neutral-200 hover:border-neutral-400"}`}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedLength(optionKey);
                                                if (selectedItem?.hairTextures?.length) {
                                                    setSelectedTexture((prev) => prev ?? selectedItem.hairTextures?.[0] ?? null);
                                                }
                                            }}
                                            className="flex min-h-20 w-full items-center justify-between px-5 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2C1810]"
                                        >
                                            <div className="flex items-start gap-4">
                                                <span
                                                    className={`mt-[3px] inline-flex h-4 w-4 items-center justify-center rounded-full border-2 transition ${
                                                        isSelected ? "border-neutral-900" : "border-neutral-300"
                                                    }`}
                                                >
                                                    {isSelected && <span className="h-2 w-2 rounded-full bg-neutral-900" />}
                                                </span>
                                                <div className="space-y-1">
                                                    {option.name && (
                                                        <div className="text-sm font-medium tracking-wide text-neutral-900">{option.name === "Arm Pit" ? "Armpit" : option.name}</div>
                                                    )}
                                                    <div className="text-xs font-light text-neutral-500">{option.notes || "Deposit required"}</div>
                                                </div>
                                            </div>
                                            <span className="flex items-center gap-3">{option.price && <span className="text-base font-medium text-neutral-900">{formatPrice(optionPrice(selectedItem, option, selectedFoundation))}</span>}{isSelected && <ChevronUp className="h-5 w-5 text-[#2C1810]" />}</span>
                                        </button>
                                        {isSelected && (loadingAddOns || availableAddOns.length > 0) && (
                                            <div className="mx-5 border-t border-[#E5DDD8] pb-5 pt-5">
                                                <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-neutral-900">Add-ons <span className="font-normal text-neutral-500">(optional)</span></p>{loadingAddOns && <span className="text-xs text-neutral-400">Loading…</span>}</div>
                                                <div className="space-y-0.5">{availableAddOns.map(addOn => <label key={addOn.id} className="flex min-h-12 cursor-pointer items-center gap-3 px-1"><input type="checkbox" checked={selectedAddOnIds.includes(addOn.id)} onChange={event => setSelectedAddOnIds(current => event.target.checked ? [...current, addOn.id] : current.filter(id => id !== addOn.id))} className="h-5 w-5 rounded border-neutral-300 accent-[#2C1810]" /><span className="min-w-0 flex-1"><span className="block text-sm text-neutral-900">{addOn.name}</span>{addOn.description && <span className="block truncate text-xs text-neutral-500">{addOn.description}</span>}</span><span className="text-sm font-medium text-neutral-900">{addOn.pricingMode === "STARTING_AT" ? "From " : ""}{formatPrice(addOn.priceCents / 100)}{addOn.pricingMode === "STARTING_AT" ? "+" : ""}</span></label>)}</div>
                                                {availableAddOns.some(addOn => selectedAddOnIds.includes(addOn.id) && addOn.confirmationRequired) && <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">Starting prices are confirmed by the salon before your appointment.</p>}
                                            </div>
                                        )}
                                        {isSelected && selectedItem?.hairTextures?.length ? (
                                            <div className="mx-5 border-t border-neutral-200 pb-4 pt-4">
                                                <div className="bg-neutral-50 p-4">
                                                    <label className="block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-600 mb-2">
                                                        Select Human Hair Texture
                                                    </label>
                                                    <select
                                                        value={selectedTexture ?? ""}
                                                        onChange={(event) => setSelectedTexture(event.target.value || null)}
                                                        className="w-full rounded-none border border-neutral-300 bg-white px-4 py-2.5 text-sm font-light text-neutral-900 transition focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 hover:border-neutral-400"
                                                    >
                                                        {selectedItem.hairTextures.map((texture) => (
                                                            <option key={texture} value={texture}>
                                                                {texture}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                            {lengthOptions.length === 0 && selectedItem?.hairTextures?.length ? (
                                <div className="rounded-none border border-neutral-200 bg-neutral-50 p-4">
                                    <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-600" htmlFor="texture-only-selection">Select Human Hair Texture</label>
                                    <select id="texture-only-selection" value={selectedTexture ?? ""} onChange={(event) => setSelectedTexture(event.target.value || null)} className="w-full rounded-none border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900">
                                        {selectedItem.hairTextures.map(texture => <option key={texture} value={texture}>{texture}</option>)}
                                    </select>
                                </div>
                            ) : null}
                        </div>

                        <div className="relative shrink-0 border-t border-neutral-200 bg-white p-4 shadow-[0_-12px_24px_rgba(0,0,0,0.08)] md:px-8">
                            {selectedItem.pricingMode === "FIXED" && modalQuote && <p className="mb-3 text-center text-xs text-neutral-600">{formatPrice(modalQuote.depositCents / 100)} due today · {formatPrice(modalQuote.remainingBalanceCents / 100)} remaining</p>}
                            <Button type="button" disabled={!selectedLength || (selectedItem.foundationChoicesEnabled ? !selectedFoundation : false) || (selectedItem.hairTextures?.length ? !selectedTexture : false) || (selectedItem.pricingMode === "FIXED" && (!modalQuote || quoteLoading))} onClick={handleModalSelect} className="w-full rounded-lg bg-[#2C1810] py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#1a0f0a] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:hover:bg-neutral-300">
                                Book Now{selectedItem.pricingMode === "FIXED" && modalQuote ? ` · ${formatPrice(modalQuote.servicePriceCents / 100)}` : selectedLengthOption?.price ? ` · ${formatPrice(optionPrice(selectedItem, selectedLengthOption, selectedFoundation) + fixedAddOnTotal / 100)}` : ""}
                            </Button>
                        </div>
                        {showLengthGuide && guides?.lengthGuideImageUrl && <LengthGuideOverlay imageUrl={guideImageUrl(guides.lengthGuideImageUrl)} onClose={() => setShowLengthGuide(false)} onShowSize={guides.sizeGuideEnabled && selectedSizeGuide?.imageUrl ? () => { setShowLengthGuide(false); setShowSizeGuide(true); } : undefined} />}
                        {showSizeGuide && selectedSizeGuide && <SizeGuideOverlay profile={selectedSizeGuide} onClose={() => setShowSizeGuide(false)} onShowLength={guides?.lengthGuideEnabled && guides.lengthGuideImageUrl ? () => { setShowSizeGuide(false); setShowLengthGuide(true); } : undefined} />}
                    </div>
                </div>
            )}
        </>
    );
}
