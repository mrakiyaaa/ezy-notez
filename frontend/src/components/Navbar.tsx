"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-4xl px-2">
      <div className="w-full">
        <div className="flex items-center justify-between backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-8 py-4 shadow-2xl">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/images/logo/logo.svg" alt="Ezy Notez" width={100} height={60} />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="#faq"
              className="text-white/80 hover:text-white transition-colors text-md font-medium"
            >
              FAQ
            </Link>
            <Link
              href="#about"
              className="text-white/80 hover:text-white transition-colors text-md font-medium"
            >
              About
            </Link>
            <Link
              href="#contact"
              className="text-white/80 hover:text-white transition-colors text-md font-medium"
            >
              Contact
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden mt-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-col space-y-4">
              <Link
                href="#faq"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="#about"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <Link
                href="#contact"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
