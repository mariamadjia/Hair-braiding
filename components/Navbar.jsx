"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

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
        <div className="flex h-14 items-center justify-between px-6 md:h-[70px] md:px-8 lg:px-12">

          {/* Brand */}
          <Link
            href="/"
            className="text-[12px] uppercase tracking-[0.22em] font-semibold md:text-[14px] md:tracking-[0.25em]"
          >
            By Ah Braiding
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] uppercase tracking-[0.18em] font-medium">
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/">Home</Link>
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/gallery">Gallery</Link>
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/services">Services</Link>
            {/* <a className="hover:opacity-70 transition-opacity" href="/shop">Shop</a> */}
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/contact">Contact</Link>
          </nav>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-10 w-10 md:hidden flex-col items-center justify-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <span className="block h-[2px] w-6 bg-white"></span>
            <span className="block h-[2px] w-6 bg-white"></span>
            <span className="block h-[2px] w-6 bg-white"></span>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {open && (
        <div id="mobile-navigation" className="fixed inset-x-0 top-14 z-40 bg-[#2C1810] text-white shadow-xl md:hidden">
          <nav className="flex flex-col gap-2 px-6 py-6 text-[14px] uppercase tracking-[0.22em]">
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/" onClick={() => setOpen(false)}>Home</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/gallery" onClick={() => setOpen(false)}>Gallery</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/services" onClick={() => setOpen(false)}>Services</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/contact" onClick={() => setOpen(false)}>Contact</Link>
          </nav>
        </div>
      )}
    </>
  );
}
