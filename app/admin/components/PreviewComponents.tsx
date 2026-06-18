"use client";

import { useState } from "react";
import { Edit2, Trash2, Plus } from "lucide-react";
import type { BookingCategory, BookingSubcategory, BookingItem } from "@/lib/booking-types";

export function PreviewServicesList({ categories }: { categories: BookingCategory[] }) {
    const [services, setServices] = useState(categories);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditingName(services[index].name);
    };

    const handleSave = (index: number) => {
        const updated = [...services];
        updated[index] = { ...updated[index], name: editingName };
        setServices(updated);
        setEditingIndex(null);
    };

    const handleDelete = (index: number) => {
        if (confirm('Delete this service?')) {
            setServices(services.filter((_, i) => i !== index));
        }
    };

    const handleAdd = () => {
        setServices([...services, { 
            name: 'New Service', 
            slug: 'new-service', 
            subcategories: [], 
            items: [] 
        } as BookingCategory]);
    };

    return (
        <div>
            <div className="text-center py-12 border-b border-neutral-100 dark:border-neutral-700 mb-2">
                <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 dark:text-neutral-400 mb-4">Our Expertise</p>
                <h2 className="text-4xl font-light tracking-tight text-neutral-900 dark:text-white">
                    Signature <span className="font-serif italic">Services</span>
                </h2>
            </div>
            <div className="divide-y divide-neutral-200/60 dark:divide-neutral-700">
                {services.map((cat, index) => (
                    <div key={cat.slug || index} className="group flex items-center justify-between py-6 gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            {cat.image && <img src={cat.image} alt={cat.name} className="h-12 w-12 object-cover rounded-sm border border-neutral-200" />}
                            {editingIndex === index ? (
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={() => handleSave(index)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSave(index);
                                        if (e.key === 'Escape') setEditingIndex(null);
                                    }}
                                    autoFocus
                                    className="flex-1 text-lg font-light tracking-wide text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border-b-2 border-blue-500 focus:outline-none px-2 py-1"
                                />
                            ) : (
                                <>
                                    <span className="text-lg font-light tracking-wide text-neutral-900 dark:text-white">
                                        {cat.name || <span className="italic text-neutral-300 dark:text-neutral-600">Unnamed</span>}
                                    </span>
                                    <button
                                        onClick={() => handleEdit(index)}
                                        className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                        title="Edit service name"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(index)}
                                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="Delete service"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </div>
                        <span className="px-5 py-2 text-[10px] font-medium uppercase tracking-[0.3em] border border-neutral-900 dark:border-neutral-400 text-neutral-900 dark:text-neutral-300 shrink-0">
                            Book Now
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-8 text-center">
                <button
                    onClick={handleAdd}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium uppercase tracking-wider bg-neutral-900 dark:bg-neutral-700 text-white hover:bg-neutral-800 dark:hover:bg-neutral-600 transition-colors rounded-sm"
                >
                    <Plus className="h-4 w-4" />
                    Add Service
                </button>
            </div>
        </div>
    );
}

function PhotoModal({ gallery, name, onClose }: { gallery: string[]; name: string; onClose: () => void }) {
    const [idx, setIdx] = useState(0);
    const multi = gallery.length > 1;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
            <div className="relative w-full max-w-lg overflow-hidden rounded-sm bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow hover:bg-white">×</button>
                <div className="relative aspect-[3/4] w-full overflow-hidden">
                    <img src={gallery[idx]} alt={`${name} ${idx + 1}`} className="h-full w-full object-cover" />
                    {multi && (
                        <>
                            <button type="button" onClick={() => setIdx((i) => (i - 1 + gallery.length) % gallery.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-3 py-1.5 text-white hover:bg-black/50">‹</button>
                            <button type="button" onClick={() => setIdx((i) => (i + 1) % gallery.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-3 py-1.5 text-white hover:bg-black/50">›</button>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                                {gallery.map((_, i) => <span key={i} className={`h-1.5 w-6 rounded-full ${i === idx ? "bg-neutral-900" : "bg-neutral-300"}`} />)}
                            </div>
                        </>
                    )}
                </div>
                <div className="p-4 bg-white flex items-center justify-between">
                    <p className="text-sm font-light text-neutral-900">{name}</p>
                    {multi && <p className="text-xs text-neutral-400">{idx + 1} / {gallery.length}</p>}
                </div>
            </div>
        </div>
    );
}

function PreviewItemRow({ item }: { item: BookingItem }) {
    const [photoOpen, setPhotoOpen] = useState(false);
    const gallery = item.images?.length ? item.images : item.image ? [item.image] : [];
    return (
        <>
            <div className="flex items-center justify-between border border-neutral-200/60 px-5 py-4 bg-white shadow-sm">
                <div>
                    <span className="block font-light text-neutral-900">{item.name}</span>
                    <span className="text-xs text-neutral-500">
                        {item.description}{item.price ? ` · ${item.price}` : ""}
                        {item.lengthOptions?.length ? ` · ${item.lengthOptions.length} length options` : ""}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {gallery.length > 0 && (
                        <button type="button" onClick={() => setPhotoOpen(true)} className="px-4 py-2 text-[10px] font-medium uppercase tracking-[0.25em] border border-neutral-300 text-neutral-700 hover:border-neutral-900 whitespace-nowrap">
                            View Photo{gallery.length > 1 ? `s (${gallery.length})` : ""}
                        </button>
                    )}
                    <span className="px-5 py-2 text-[10px] font-medium uppercase tracking-[0.3em] border border-neutral-900 text-neutral-900 whitespace-nowrap">Book Now</span>
                </div>
            </div>
            {photoOpen && gallery.length > 0 && <PhotoModal gallery={gallery} name={item.name} onClose={() => setPhotoOpen(false)} />}
        </>
    );
}

export function PreviewCategoryDetail({ category }: { category: BookingCategory }) {
    const [subcategories, setSubcategories] = useState(category.subcategories ?? []);
    const [items, setItems] = useState(category.items ?? []);
    const [editingSubIndex, setEditingSubIndex] = useState<number | null>(null);
    const [editingSubName, setEditingSubName] = useState('');
    const hasSubcategories = subcategories.length > 0;

    const handleEditSub = (index: number) => {
        setEditingSubIndex(index);
        setEditingSubName(subcategories[index].name);
    };

    const handleSaveSub = (index: number) => {
        const updated = [...subcategories];
        updated[index] = { ...updated[index], name: editingSubName };
        setSubcategories(updated);
        setEditingSubIndex(null);
    };

    const handleDeleteSub = (index: number) => {
        if (confirm('Delete this subcategory?')) {
            setSubcategories(subcategories.filter((_, i) => i !== index));
        }
    };

    const handleAddSub = () => {
        setSubcategories([...subcategories, { 
            name: 'New Subcategory', 
            slug: 'new-subcategory',
            items: [] 
        } as BookingSubcategory]);
    };

    return (
        <div>
            <div className="text-center py-12 border-b border-neutral-100 mb-6">
                {category.image && <img src={category.image} alt={category.name} className="h-32 w-full object-cover rounded-sm mb-6" />}
                <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 mb-4">Select Your Style</p>
                <h1 className="text-4xl font-light tracking-tight text-neutral-900">
                    {category.name || <span className="italic text-neutral-300">Unnamed</span>}
                </h1>
                {category.summary && (
                    <p className="mt-4 text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">{category.summary}</p>
                )}
            </div>
            {hasSubcategories ? (
                <>
                    <div className="divide-y divide-neutral-200/60">
                        {subcategories.map((sub, index) => (
                            <div key={sub.slug || index} className="flex items-center justify-between py-5">
                                <div className="flex items-center gap-3 flex-1">
                                    {editingSubIndex === index ? (
                                        <input
                                            type="text"
                                            value={editingSubName}
                                            onChange={(e) => setEditingSubName(e.target.value)}
                                            onBlur={() => handleSaveSub(index)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveSub(index);
                                                if (e.key === 'Escape') setEditingSubIndex(null);
                                            }}
                                            autoFocus
                                            className="flex-1 font-light text-neutral-900 bg-white border-b-2 border-blue-500 focus:outline-none px-2 py-1"
                                        />
                                    ) : (
                                        <>
                                            <span className="font-light text-neutral-900">{sub.name}</span>
                                            <button
                                                onClick={() => handleEditSub(index)}
                                                className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                                                title="Edit subcategory"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSub(index)}
                                                className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
                                                title="Delete subcategory"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                                <span className="px-5 py-2 text-[10px] font-medium uppercase tracking-[0.3em] border border-neutral-900 text-neutral-900">Book Now</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleAddSub}
                            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium uppercase tracking-wider bg-neutral-900 text-white hover:bg-neutral-800 transition-colors rounded-sm"
                        >
                            <Plus className="h-4 w-4" />
                            Add Subcategory
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-3">
                    {items.map((item, i) => <PreviewItemRow key={i} item={item} />)}
                </div>
            )}
        </div>
    );
}

export function PreviewSubcategoryDetail({ category, subcategory }: { category: BookingCategory; subcategory: BookingSubcategory }) {
    return (
        <div>
            <div className="text-center py-12 border-b border-neutral-100 mb-6">
                {subcategory.image && <img src={subcategory.image} alt={subcategory.name} className="h-32 w-full object-cover rounded-sm mb-6" />}
                <p className="text-xs uppercase tracking-[0.4em] text-neutral-500 mb-4">{category.name}</p>
                <h1 className="text-4xl font-light tracking-tight text-neutral-900">
                    {subcategory.name || <span className="italic text-neutral-300">Unnamed</span>}
                </h1>
                {subcategory.summary && (
                    <p className="mt-4 text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">{subcategory.summary}</p>
                )}
            </div>
            <div className="space-y-3">
                {subcategory.items.map((item, i) => <PreviewItemRow key={i} item={item} />)}
                {subcategory.items.length === 0 && (
                    <p className="text-sm text-neutral-400 italic">No items yet.</p>
                )}
            </div>
        </div>
    );
}
