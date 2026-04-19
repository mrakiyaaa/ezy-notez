"use client";

import Link from "next/link";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen text-text-primary">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-bg-card/80 backdrop-blur">
        <div className="flex items-center px-4 py-4 md:px-6">
          <Link href="/">
            <Image src="/images/logo/logo.svg" alt="Ezy Notez" width={100} height={60} />
          </Link>
        </div>
      </header>

      <main className="w-full">{children}</main>
    </div>
  );
}
