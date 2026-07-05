"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminGalleryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?section=gallery");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <p className="text-neutral-500 dark:text-neutral-400">
        Opening Gallery Manager...
      </p>
    </div>
  );
}
