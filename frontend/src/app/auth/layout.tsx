import { Space_Grotesk } from "next/font/google";
import Image from "next/image";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${spaceGrotesk.className} flex min-h-screen bg-main`}
    >
      {/* Left branding panel */}
      <div className="relative hidden w-[55%] overflow-hidden lg:flex lg:flex-col lg:justify-between">
        {/* Animated gradient mesh */}
        <div aria-hidden="true" className="absolute inset-0">
          <div
            className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, #507DBC 0%, transparent 70%)",
              animation: "drift 12s ease-in-out infinite alternate",
            }}
          />
          <div
            className="absolute -bottom-32 -right-20 h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, #3a6ba5 0%, transparent 70%)",
              animation: "drift 15s ease-in-out infinite alternate-reverse",
            }}
          />
          <div
            className="absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full opacity-10 blur-[80px]"
            style={{
              background:
                "radial-gradient(circle, #6a9fd8 0%, transparent 70%)",
              animation: "drift 10s ease-in-out infinite alternate",
            }}
          />
        </div>

        {/* Subtle grid overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <div>
            <Image
              src="/images/logo/logo.svg"
              alt="EzyNotez"
              width={130}
              height={50}
              priority
            />
          </div>

          {/* Tagline */}
          <div className="my-auto">
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Study smarter,
              <br />
              <span className="text-blue-accent">not harder.</span>
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-white/50">
              AI-powered notes, flashcards, and summaries — all in one
              collaborative workspace.
            </p>
          </div>

          {/* Glassmorphism feature cards */}
          <div className="space-y-3">
            <div
              className="flex items-center gap-4 rounded-xl border border-white/6 px-5 py-4 backdrop-blur-lg bg-white/3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-accent/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Smart Summaries</p>
                <p className="text-xs text-white/40">AI extracts key concepts from your uploads</p>
              </div>
            </div>

            <div
              className="flex items-center gap-4 rounded-xl border border-white/6 px-5 py-4 backdrop-blur-lg bg-white/3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-accent/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Collaborative Workspaces</p>
                <p className="text-xs text-white/40">Study together with shared notes and resources</p>
              </div>
            </div>

            <div
              className="flex items-center gap-4 rounded-xl border border-white/6 px-5 py-4 backdrop-blur-lg bg-white/3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-accent/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-blue-accent" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">Instant Flashcards</p>
                <p className="text-xs text-white/40">Auto-generated from your study material</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right auth form panel */}
      <div className="flex flex-1 flex-col bg-main-dark">
        {/* Mobile logo banner */}
        <div className="flex items-center gap-3 border-b border-white/6 px-6 py-4 lg:hidden">
          <Image
            src="/images/logo/logo.svg"
            alt="EzyNotez"
            width={100}
            height={38}
            priority
          />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          {children}
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes drift {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -20px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
