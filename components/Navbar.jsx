"use client";

import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#2C1810] text-white border-b border-white/20">
        <div className="flex h-[70px] items-center justify-between px-8 lg:px-12">

          {/* Brand */}
          <a
            href="/"
            className="text-[14px] uppercase tracking-[0.25em] font-semibold"
          >
            By Ah Braiding
          </a>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] uppercase tracking-[0.18em] font-medium">
            <a className="hover:opacity-70 transition-opacity" href="/">Home</a>
            <a className="hover:opacity-70 transition-opacity" href="/gallery">Gallery</a>
            <a className="hover:opacity-70 transition-opacity" href="/services">Services</a>
            {/* <a className="hover:opacity-70 transition-opacity" href="/shop">Shop</a> */}
            <a className="hover:opacity-70 transition-opacity" href="/contact">Contact</a>
          </nav>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="flex md:hidden flex-col gap-[5px]"
          >
            <span className="block h-[2px] w-7 bg-white"></span>
            <span className="block h-[2px] w-7 bg-white"></span>
            <span className="block h-[2px] w-7 bg-white"></span>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {open && (
        <div className="fixed inset-x-0 top-[64px] z-40 bg-[#2C1810] text-white md:hidden">
          <nav className="flex flex-col gap-6 px-8 py-8 text-[14px] uppercase tracking-[0.22em]">
            <a href="/" onClick={() => setOpen(false)}>Home</a>
            <a href="/about" onClick={() => setOpen(false)}>About</a>
            <a href="/gallery" onClick={() => setOpen(false)}>Gallery</a>
            <a href="/services" onClick={() => setOpen(false)}>Services</a>
            <a href="/education" onClick={() => setOpen(false)}>Education</a>
            <a href="/shop" onClick={() => setOpen(false)}>Shop</a>
            <a href="/contact" onClick={() => setOpen(false)}>Contact</a>
          </nav>
        </div>
      )}
    </>
  );
}