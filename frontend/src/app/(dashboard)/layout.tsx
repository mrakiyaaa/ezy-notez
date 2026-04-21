"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isWorkspaceDetail = pathname.startsWith("/workspaces/") && pathname.length > "/workspaces/".length;

  return (
    <div className="min-h-screen text-text-primary">
      {!isWorkspaceDetail && (
        <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.25)] h-15 flex items-center">
          <div className="flex items-center px-4 md:px-6">
            <Link href="/">
              <Image src="/images/logo/logo.svg" alt="Ezy Notez" width={100} height={38} className="h-8 w-auto" />
            </Link>
          </div>
        </header>
      )}

      <main className="w-full">{children}</main>
    </div>
  );
}
