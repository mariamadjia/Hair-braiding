"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/services", label: "Services" },
    { href: "/contact", label: "Contact" },
  ];

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#2C1810]/10 bg-[#FFFEFC]/95 text-[#2C1810] shadow-[0_1px_12px_rgba(44,24,16,0.035)] backdrop-blur-md">
        <div className="flex h-[76px] items-center justify-between px-6 sm:px-8 lg:h-[84px] lg:px-16">

          {/* Brand */}
          <Link
            href="/"
            className="text-[14px] font-semibold uppercase tracking-[0.28em] transition-opacity hover:opacity-70 sm:text-[15px]"
          >
            By Ah Braiding
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-8 text-[12px] font-medium uppercase tracking-[0.2em] md:flex lg:gap-10">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                className={`relative py-2 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 ${
                  isActive(href)
                    ? "after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:bg-[#2C1810]"
                    : ""
                }`}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 md:hidden flex-col items-center justify-center gap-[5px] focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <span className="block h-[2px] w-7 bg-[#2C1810]"></span>
            <span className="block h-[2px] w-7 bg-[#2C1810]"></span>
            <span className="block h-[2px] w-7 bg-[#2C1810]"></span>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {open && (
        <div id="mobile-navigation" className="fixed inset-x-0 top-[76px] z-40 border-b border-[#2C1810]/10 bg-[#FFFEFC] text-[#2C1810] shadow-xl md:hidden">
          <nav className="flex flex-col gap-2 px-6 py-6 text-[14px] uppercase tracking-[0.22em]">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                className={`min-h-11 border-b px-2 py-3 focus-visible:outline-2 ${
                  isActive(href)
                    ? "border-[#2C1810] font-semibold"
                    : "border-[#2C1810]/10"
                }`}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={isActive(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
