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
        <div className="flex h-[62px] items-center justify-between px-7 md:h-[70px] md:px-8 lg:px-12">

          {/* Brand */}
          <Link
            href="/"
            className="text-[13px] uppercase tracking-[0.23em] font-semibold md:text-[14px] md:tracking-[0.25em]"
          >
            AH Braiding
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] uppercase tracking-[0.18em] font-medium">
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/">Home</Link>
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/gallery">Gallery</Link>
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/services">Services</Link>
            {/* <a className="hover:opacity-70 transition-opacity" href="/shop">Shop</a> */}
            <Link className="hover:opacity-70 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4" href="/contact">Contact</Link>
            <Link className="inline-flex min-h-10 items-center gap-2 border border-[#D8AD93] px-4 py-2 text-[#F2D5C3] transition-colors hover:border-white hover:bg-white hover:text-[#2C1810] focus-visible:outline-2 focus-visible:outline-offset-4" href="/pricing"><span className="font-serif text-base leading-none" aria-hidden="true">$</span> Pricing</Link>
          </nav>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="flex h-11 w-11 md:hidden flex-col items-center justify-center gap-[5px] focus-visible:outline-2 focus-visible:outline-offset-2"
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
        <div id="mobile-navigation" className="fixed inset-x-0 top-[62px] z-40 bg-[#2C1810] text-white shadow-xl md:hidden">
          <nav className="flex flex-col gap-2 px-6 py-6 text-[14px] uppercase tracking-[0.22em]">
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/" onClick={() => setOpen(false)}>Home</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/gallery" onClick={() => setOpen(false)}>Gallery</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/services" onClick={() => setOpen(false)}>Services</Link>
            <Link className="min-h-11 px-2 py-3 focus-visible:outline-2" href="/contact" onClick={() => setOpen(false)}>Contact</Link>
            <Link className="mx-2 mt-2 flex min-h-12 items-center justify-center gap-2 border border-[#D8AD93] px-4 py-3 text-[#F2D5C3] focus-visible:outline-2" href="/pricing" onClick={() => setOpen(false)}><span className="font-serif text-lg leading-none" aria-hidden="true">$</span> Pricing</Link>
          </nav>
        </div>
      )}
    </>
  );
}
