"use client";

import { ArrowLeft } from "lucide-react";
import { guideImageUrl, type SizeGuideProfile } from "@/lib/guides";

export default function SizeGuideOverlay({ profile, onClose }: { profile: SizeGuideProfile; onClose: () => void }) {
  return <div className="fixed inset-0 z-[61] flex flex-col bg-white text-neutral-900 lg:absolute lg:inset-auto lg:left-[calc(100%+1rem)] lg:top-0 lg:h-full lg:w-[32rem] lg:overflow-hidden lg:rounded-xl lg:border lg:border-neutral-200 lg:shadow-[0_20px_60px_rgb(0,0,0,0.3)]" role="dialog" aria-modal="true" aria-labelledby="size-guide-title">
    <header className="relative flex h-16 shrink-0 items-center justify-center border-b border-neutral-200 px-4">
      <button type="button" onClick={onClose} className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full hover:bg-neutral-100 focus:ring-2 focus:ring-[#2C1810]" aria-label="Close size guide"><ArrowLeft className="h-5 w-5" /></button>
      <h2 id="size-guide-title" className="text-base font-semibold tracking-wide">{profile.displayName} Size Guide</h2>
    </header>
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[#F6F5F1] p-4 sm:p-6">
      <p className="mb-4 text-center text-sm text-neutral-600">Use this photo as a reference for {profile.displayName} braid thickness.</p>
      <div className="m-auto overflow-hidden rounded-xl bg-white p-2 shadow-sm"><img src={guideImageUrl(profile.imageUrl)} alt={`${profile.displayName} braid size reference`} className="max-h-[calc(100dvh-14rem)] w-full object-contain" /></div>
      <p className="mt-4 text-center text-xs text-neutral-500">Your final look may vary based on hair density and styling.</p>
    </div>
    <footer className="border-t border-neutral-200 bg-white p-4"><button type="button" onClick={onClose} className="w-full rounded-lg bg-[#2C1810] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">Done</button></footer>
  </div>;
}
