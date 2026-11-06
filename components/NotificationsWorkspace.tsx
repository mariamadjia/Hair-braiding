"use client";

import { useState } from "react";
import EmailDraftAdmin from "@/components/EmailDraftAdmin";
import SmsDraftAdmin from "@/components/SmsDraftAdmin";
import NotificationAdmin from "@/components/NotificationAdmin";

export default function NotificationsWorkspace() {
  const [tab, setTab] = useState<"email" | "sms" | "delivery">("email");
  return <div className="min-h-full bg-neutral-50 dark:bg-neutral-900">
    <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-8 sm:pt-8">
      <p className="text-sm text-neutral-600 dark:text-neutral-300">Review the messages the system sends and monitor delivery activity.</p>
      <div className="mt-5 flex gap-6 border-b dark:border-neutral-700"><button type="button" onClick={() => setTab("email")} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === "email" ? "border-[#8B4D30] text-[#7A4028]" : "border-transparent text-neutral-500"}`}>Email drafts</button><button type="button" onClick={() => setTab("sms")} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === "sms" ? "border-[#8B4D30] text-[#7A4028]" : "border-transparent text-neutral-500"}`}>SMS drafts</button><button type="button" onClick={() => setTab("delivery")} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === "delivery" ? "border-[#8B4D30] text-[#7A4028]" : "border-transparent text-neutral-500"}`}>Delivery history</button></div>
    </div>
    {tab === "email" ? <div className="mx-auto max-w-7xl p-4 sm:p-8"><EmailDraftAdmin /></div> : tab === "sms" ? <div className="mx-auto max-w-7xl p-4 sm:p-8"><SmsDraftAdmin /></div> : <NotificationAdmin compactHeader />}
  </div>;
}

