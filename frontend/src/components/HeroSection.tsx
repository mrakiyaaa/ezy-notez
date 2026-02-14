"use client";

import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-20">
      <div className="max-w-7xl mx-auto w-full">
        <div className="relative min-h-[420px] md:min-h-[520px] rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl">
          <div className="absolute inset-0">
            <Image
              src="/images/landing/carosel.png"
              alt="Ezy Note"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

          <div className="relative z-10 flex min-h-[420px] md:min-h-[520px] items-center justify-center px-8 py-16 md:px-16 md:py-24 text-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Built on Trust and Standards
              </h1>

              <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
                Create a Ezy Notez Workspace to Manage your Material
              </p>

              <Link
                href="/register"
                className="inline-block px-12 py-4 bg-blue-600/80 hover:bg-blue-600 text-white font-medium rounded-full transition-all duration-300 backdrop-blur-xl border border-blue-400/30 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
