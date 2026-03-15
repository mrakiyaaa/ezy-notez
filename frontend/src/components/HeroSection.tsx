"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";

export default function HeroSection() {
  return (
    <section className="w-full bg-[var(--color-bg-main)] px-6 py-24 mt-10">
      <div className="max-w-7xl mx-auto w-full">
        {/* Top Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Heading */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--color-text-primary)] leading-tight max-w-xl">
              Built on Trust and Standards
            </h1>
          </div>

          {/* Right: Subtitle + CTA */}
          <div className="flex flex-col lg:items-end text-left lg:text-right gap-6">
            <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-md">
              Create a powerful AI-driven workspace to manage your study
              materials efficiently and collaborate smarter.
            </p>

            <Button variant="hero" className="h-12 w-60" size="default" asChild>
              <Link href="/auth/login">Get Started</Link>
            </Button>
          </div>
        </div>

        {/* Product Visual Below */}
        <div className="mt-10">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#111721] to-[#263546] shadow-2xl">
            <div className="relative w-full h-[500px] flex items-center justify-center">
              <Image
                src="/images/landing/hero-2.svg"
                alt="Ezy Note Preview"
                width={900}
                height={600}
                className="h-[400px] w-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
