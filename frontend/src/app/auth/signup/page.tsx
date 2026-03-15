"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignUp = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (signUpError) {
      setIsLoading(false);
      if (signUpError.message.toLowerCase().includes("already registered")) {
        setError("An account with this email already exists. Sign in instead.");
      } else {
        setError(signUpError.message);
      }
      return;
    }

    setIsLoading(false);

    // If email confirmation is required, data.session will be null.
    // Show a message instead of redirecting to the dashboard.
    if (!data.session) {
      setError(
        "✉️ Check your inbox — we sent you a confirmation link to activate your account."
      );
      return;
    }

    // Profile row is created automatically by the Supabase DB trigger.
    router.push("/workspaces");
    router.refresh();
  };

  const handleGoogleSignUp = async () => {
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center"
      >
        <div className="h-125 w-125 rounded-full bg-blue-accent opacity-[0.04] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-105">
        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fade-border bg-bg-card">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 6h16M4 10h10M4 14h13M4 18h8"
                stroke="#507DBC"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Start learning smarter with EzyNotez
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-fade-border bg-bg-card p-8">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-text-muted">
                Full Name
              </label>
              <input
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-fade-border bg-bg-card px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-blue-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-text-muted">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-fade-border bg-bg-card px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-blue-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-text-muted">
                Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-fade-border bg-bg-card px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-blue-accent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium uppercase tracking-widest text-text-muted">
                Confirm Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-fade-border bg-bg-card px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-blue-accent"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-xl bg-blue-accent px-4 py-3 text-sm font-semibold text-text-primary transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-fade-border" />
            <span className="text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-fade-border" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-fade-border px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-blue-accent/50 hover:bg-blue-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
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
        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-blue-accent hover:opacity-80"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
