"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const navLinkClass = (href) =>
    `relative py-2 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 ${
      pathname === href
        ? "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-[#d5b074]"
        : ""
    }`;

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
      <header className="sticky top-0 z-50 bg-[#2C1810] text-white border-b border-white/20">
        <div className="flex h-[70px] items-center justify-between px-8 lg:px-12">

          {/* Brand */}
          <Link
            href="/"
            className="text-[14px] uppercase tracking-[0.25em] font-semibold"
          >
            By Ah Braiding
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-9 md:flex">
            <nav className="flex items-center gap-7 text-[12px] uppercase tracking-[0.18em] font-medium">
              <Link className={navLinkClass("/")} href="/">Home</Link>
              <Link className={navLinkClass("/gallery")} href="/gallery">Gallery</Link>
              <Link className={navLinkClass("/services")} href="/services">Services</Link>
              <Link className={navLinkClass("/contact")} href="/contact">Contact</Link>
            </nav>
            <Link
              href="/services"
              className="rounded-[5px] border border-[#e9dcc8]/70 bg-[#f6ecdd] px-7 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2C1810] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Book Now
            </Link>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 md:hidden flex-col items-center justify-center gap-[5px] focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <span className="block h-[2px] w-7 bg-white"></span>
            <span className="block h-[2px] w-7 bg-white"></span>
            <span className="block h-[2px] w-7 bg-white"></span>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {open && (
        <div id="mobile-navigation" className="fixed inset-x-0 top-[70px] z-40 bg-[#2C1810] text-white shadow-xl md:hidden">
          <nav className="flex flex-col gap-2 px-6 py-6 text-[14px] uppercase tracking-[0.22em]">
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/" onClick={() => setOpen(false)}>Home</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/gallery" onClick={() => setOpen(false)}>Gallery</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/services" onClick={() => setOpen(false)}>Services</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/contact" onClick={() => setOpen(false)}>Contact</Link>
            <Link className="mt-2 min-h-11 rounded-sm bg-[#f6ecdd] px-4 py-3 text-center font-semibold text-[#2C1810] focus-visible:outline-2" href="/services" onClick={() => setOpen(false)}>Book Now</Link>
          </nav>
        </div>
      )}
    </>
  );
}
