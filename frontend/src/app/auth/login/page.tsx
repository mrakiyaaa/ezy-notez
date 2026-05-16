"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/workspaces";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    setEmailNotConfirmed(false);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsLoading(false);

    if (signInError) {
      const code = (signInError as { code?: string }).code;
      if (
        code === "email_not_confirmed" ||
        signInError.message.toLowerCase().includes("not confirmed")
      ) {
        setEmailNotConfirmed(true);
        setError("Your email hasn't been confirmed yet. Check your inbox for a confirmation link.");
      } else if (
        code === "invalid_credentials" ||
        signInError.message === "Invalid login credentials"
      ) {
        setError("Incorrect email or password. Please try again.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    router.push(redirectTo);
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError("Enter your email address above first.");
      return;
    }
    setIsResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    setIsResending(false);
    if (resendError) {
      setError(resendError.message);
    } else {
      setEmailNotConfirmed(false);
      setError("Confirmation email sent — check your inbox.");
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setIsGoogleLoading(false);
  };

  return (
    <div className="w-full max-w-105">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">
          Welcome back
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">
          Sign in to your account
        </h1>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-white/6 p-8" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <form onSubmit={handleSignIn} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-widest text-white/40">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-white/25 focus:border-blue-accent/50"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-widest text-white/40">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/8 bg-white/3 px-4 py-3 pr-11 text-sm text-text-primary outline-none transition-colors placeholder:text-white/25 focus:border-blue-accent/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
              <p>{error}</p>
              {emailNotConfirmed && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className="mt-1.5 font-medium underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
                >
                  {isResending ? "Sending…" : "Resend confirmation email"}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full rounded-xl bg-blue-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/6" />
          <span className="text-xs text-white/30">or</span>
          <div className="h-px flex-1 bg-white/6" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/8 px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
          {isGoogleLoading ? "Redirecting…" : "Continue with Google"}
        </button>
      </div>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-white/40">
        First time here?{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-blue-accent hover:opacity-80"
        >
          Sign up for free
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-105" />}>
      <LoginPageContent />
    </Suspense>
  );
}
