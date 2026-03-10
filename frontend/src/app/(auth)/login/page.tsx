"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showOtp, setShowOtp] = useState(false);
  const [email, setEmail] = useState("");
  const [otpValues, setOtpValues] = useState(Array(6).fill(""));
  const [otpMessage, setOtpMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;

    const nextValues = [...otpValues];
    nextValues[index] = value;
    setOtpValues(nextValues);

    if (value && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const paste = event.clipboardData.getData("text").trim();
    if (!/^[0-9]{6}$/.test(paste)) return;

    const digits = paste.split("");
    setOtpValues(digits);
    otpRefs.current[5]?.focus();
    event.preventDefault();
  };

  const sendOtp = async () => {
    if (!email.trim()) {
      setOtpMessage("Please enter your email address.");
      return;
    }

    setIsSending(true);
    setOtpMessage("");

    try {
      await authApi.requestOtp({ email });

      setOtpValues(Array(6).fill(""));
      setShowOtp(true);
      setOtpMessage("OTP sent. Check your inbox for the 6-digit code.");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (error) {
      setOtpMessage((error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const verifyOtp = async () => {
    const token = otpValues.join("");
    if (token.length !== 6) {
      setOtpMessage("Enter the 6-digit code to continue.");
      return;
    }

    setIsVerifying(true);
    setOtpMessage("");

    try {
      const data = await authApi.verifyOtp({ email, token });

      // Populate the global auth store immediately so the dashboard
      // doesn't need to fire a second /auth/me round-trip after redirect.
      if (data.user) {
        setAuth(data.user, data.profile ?? null);
      }

      setOtpMessage("OTP verified. You're logged in.");
      router.push("/workspaces");
    } catch (error) {
      setOtpMessage((error as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
        <div className="flex flex-1 flex-col items-center justify-center text-center">

          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Access Your Ezy Notes Workspace
          </p>

          <form
            className="mt-10 w-full"
            onSubmit={(event) => {
              event.preventDefault();
              sendOtp();
            }}
          >
            <div className="text-left">
              <label className="text-xs text-text-secondary">Enter your E-mail</label>
                <div className="relative mt-2">
                <input
                  type="email"
                  placeholder="akilalakshitha@gmail.com"
                  id="email-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-md bg-bg-card px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                />
                <button
                  type="button"
                  aria-label="Clear email"
                  onClick={() => {
                  setEmail("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-accent hover:text-text-primary"
                >
                  <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                </div>
            </div>

            <Button
              type="submit"
              disabled={isSending}
              className="mt-6 h-11 w-full bg-blue-accent text-text-primary border border-transparent hover:border-fade-border hover:bg-transparent"
            >
              {isSending ? "Sending..." : "Next"}
            </Button>
          </form>

          <div className="mt-8 flex w-full items-center gap-4 text-xs text-text-muted">
            <div className="h-px flex-1 bg-border" />
            <span>or continue with</span>
            <div className="h-px flex-1 bg-border" />
          </div>
            <Button 
            type="button"
            className="mt-6 flex w-full h-11 items-center justify-center gap-3 border border-fade-border bg-bg-card hover:bg-transparent"
            onClick={() => {
              // Handle Google login
            }}
            >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
              <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z" />
              <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" />
              <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.545 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            <span>Login using Google</span>
          </Button>
        </div>

        <div className="mt-8 flex items-center justify-between text-xs text-text-muted">
          <span>Copyright 2026 ezynotez</span>
          <div className="flex items-center gap-4">
            <Link href="/support" className="hover:text-text-secondary">
              Support
            </Link>
            <Link href="/privacy" className="hover:text-text-secondary">
              Privacy
            </Link>
          </div>
        </div>
      </div>

      {showOtp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-fade-border bg-bg-card p-6 text-left shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Enter your OTP</h2>
                <p className="mt-2 text-sm text-text-secondary">
                  We sent a 6-digit code to your email. Enter it below to continue.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close OTP modal"
                onClick={() => setShowOtp(false)}
                className="text-text-muted transition hover:text-text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-2">
              {otpValues.map((value, index) => (
                <input
                  key={`otp-${index}`}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={value}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  className="h-12 w-12 rounded-md border border-fade-border bg-bg-main text-center text-lg text-text-primary outline-none transition focus:border-blue-accent"
                />
              ))}
            </div>

            {otpMessage ? (
              <p className="mt-4 text-sm text-text-secondary">{otpMessage}</p>
            ) : null}

            <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
              <span>Didn&apos;t receive the code?</span>
              <button
                type="button"
                onClick={sendOtp}
                className="text-blue-accent hover:text-text-primary"
              >
                Resend OTP
              </button>
            </div>

            <Button
              type="button"
              disabled={isVerifying}
              onClick={verifyOtp}
              className="mt-6 h-11 w-full bg-blue-accent text-text-primary border border-transparent hover:border-fade-border hover:bg-transparent"
            >
              {isVerifying ? "Confirming..." : "Confirm"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
