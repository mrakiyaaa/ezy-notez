"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  MessageSquare,
  BrainCircuit,
  Layers,
  Users,
  FolderOpen,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Trophy,
  Medal,
  Award,
} from "lucide-react";

const navLinks = [
  { label: "FAQ", href: "#faq" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const features = [
  {
    icon: FileText,
    title: "AI Summarization",
    description:
      "Upload PDFs and PPTXs, get instant summaries in multiple formats tailored to your study needs.",
  },
  {
    icon: MessageSquare,
    title: "Chatie — AI Chatbot",
    description:
      "Ask questions and get accurate answers sourced directly from your uploaded materials.",
  },
  {
    icon: BrainCircuit,
    title: "Quiz Generator",
    description:
      "Auto-generate MCQs from your resources to test your understanding before exams.",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description:
      "AI-generated flashcards with flip animations and progress tracking to master key concepts.",
  },
  {
    icon: Users,
    title: "Study Rooms",
    description:
      "Real-time collaborative quizzes with live leaderboards — study together, compete together.",
  },
  {
    icon: FolderOpen,
    title: "Resource Hub",
    description:
      "Manage all your academic materials in one organized, AI-powered workspace.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create a Workspace",
    description:
      "Set up your personalized workspace for each course or subject.",
  },
  {
    number: "02",
    title: "Upload Your Materials",
    description: "Drop in PDFs, slides, and notes — we handle the rest.",
  },
  {
    number: "03",
    title: "Let AI Do the Heavy Lifting",
    description:
      "Get summaries, quizzes, flashcards, and chat — all powered by AI.",
  },
];

const leaderboard = [
  { rank: 1, name: "Nethmi D.", score: 2840, icon: Trophy, color: "text-yellow-500" },
  { rank: 2, name: "Kavish P.", score: 2650, icon: Medal, color: "text-gray-400" },
  { rank: 3, name: "Sarah L.", score: 2410, icon: Award, color: "text-amber-600" },
];

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        drawerOpen &&
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target as Node)
      ) {
        setDrawerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen">
      {/* ===== NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-fade-border bg-(--main)/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
          <Link href="/">
            <Image
              src="/images/logo/logo.svg"
              alt="EZY Notez"
              width={120}
              height={46}
              priority
            />
          </Link>

          <button
            ref={toggleRef}
            className="text-text-primary hover:text-blue-accent transition-colors duration-200"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="Toggle menu"
          >
            {drawerOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* ===== DRAWER ===== */}
      <div
        ref={drawerRef}
        className={`fixed top-20 right-6 z-50 w-55 bg-(--main)/80 backdrop-blur-2xl border border-blue-accent/30 rounded-2xl shadow-[0_0_40px_rgba(80,125,188,0.15)] overflow-hidden transition-all duration-300 ${
          drawerOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {/* Decorative top gradient line */}
        <div className="h-px w-full bg-linear-to-r from-transparent via-blue-accent to-transparent" />

        <div className="p-4">
          {/* Nav links */}
          <div className="flex flex-col">
            {navLinks.map((link, index) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className={`group flex items-center justify-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-accent/5 transition-all duration-200 ${
                  index < navLinks.length - 1 ? "border-b border-fade-border" : ""
                }`}
              >
                <span className="text-sm font-medium tracking-wide text-text-primary group-hover:text-blue-accent transition-colors duration-200">
                  {link.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-150 h-150 rounded-full bg-blue-accent/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-100 h-100 rounded-full bg-blue-accent/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fade-border bg-bg-card/50 mb-8">
            <Sparkles size={14} className="text-blue-accent" />
            <span className="text-xs font-medium text-text-secondary tracking-wide">
              AI-Powered Academic Platform
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-text-primary leading-tight tracking-tight">
            Study Smarter,
            <br />
            <span className="text-blue-accent">Not Harder</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Upload your materials and let AI generate summaries, quizzes,
            flashcards, and more — all tailored to how you learn.
          </p>

          <div className="mt-10 relative inline-block">
            <div className="absolute inset-0 bg-blue-accent/30 blur-2xl rounded-full scale-150 pointer-events-none" />
            <Link
              href="/auth/login"
              className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-accent text-base font-semibold text-text-primary hover:shadow-[0_0_30px_rgba(80,125,188,0.5)] transition-all duration-300"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fade-border bg-bg-card/50 mb-6">
              <Sparkles size={14} className="text-blue-accent" />
              <span className="text-xs font-medium text-text-secondary tracking-wide">
                Features
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              Everything You Need to
              <br />
              <span className="text-blue-accent">Ace Your Studies</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative p-6 rounded-xl bg-bg-card border border-fade-border hover:border-blue-accent/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 rounded-xl bg-blue-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-lg bg-blue-accent/10 flex items-center justify-center mb-4">
                      <Icon size={24} className="text-blue-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fade-border bg-bg-card/50 mb-6">
              <Sparkles size={14} className="text-blue-accent" />
              <span className="text-xs font-medium text-text-secondary tracking-wide">
                How It Works
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary tracking-tight">
              Three Steps to{" "}
              <span className="text-blue-accent">Better Grades</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-linear-to-r from-blue-accent/40 via-blue-accent/20 to-blue-accent/40" />

            {steps.map((step) => (
              <div key={step.number} className="text-center relative">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-accent/15 border border-blue-accent/30 mb-6">
                  <span className="text-2xl font-bold text-blue-accent">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STUDY ROOM HIGHLIGHT ===== */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fade-border bg-bg-card/50 mb-6">
                <Users size={14} className="text-blue-accent" />
                <span className="text-xs font-medium text-text-secondary tracking-wide">
                  Study Rooms
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight mb-4">
                Study Together,
                <br />
                <span className="text-blue-accent">Score Together</span>
              </h2>
              <p className="text-text-secondary leading-relaxed mb-6 max-w-lg">
                Challenge your peers in real-time collaborative quizzes. Climb
                live leaderboards and get AI-generated insights after each round
                to pinpoint your strengths and weaknesses.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-accent hover:underline transition-all duration-200"
              >
                Try Study Rooms
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-blue-accent/5 blur-3xl rounded-2xl pointer-events-none" />
              <div className="relative rounded-xl bg-bg-card border border-fade-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-semibold text-text-primary">
                    Live Leaderboard
                  </h4>
                  <span className="text-xs text-text-muted">Round 3 of 5</span>
                </div>

                {leaderboard.map((player) => {
                  const RankIcon = player.icon;
                  return (
                    <div
                      key={player.rank}
                      className={`flex items-center justify-between py-3 px-4 rounded-lg mb-2 ${
                        player.rank === 1
                          ? "bg-blue-accent/10 border border-blue-accent/20"
                          : "border border-fade-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RankIcon size={18} className={player.color} />
                        <span className="text-sm font-medium text-text-primary">
                          {player.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-text-secondary">
                        {player.score.toLocaleString()} pts
                      </span>
                    </div>
                  );
                })}

                <div className="mt-4 pt-4 border-t border-fade-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">
                      Quiz Progress
                    </span>
                    <span className="text-xs text-text-secondary">60%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-fade-border overflow-hidden">
                    <div className="w-[60%] h-full rounded-full bg-blue-accent" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 rounded-full bg-blue-accent/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary tracking-tight mb-4">
            Ready to Transform
            <br />
            <span className="text-blue-accent">How You Study?</span>
          </h2>
          <p className="text-text-secondary text-lg mb-10 leading-relaxed">
            Join thousands of students who are already studying smarter with EZY
            Notez.
          </p>
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-accent/30 blur-2xl rounded-full scale-150 pointer-events-none" />
            <Link
              href="/auth/login"
              className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-blue-accent text-base font-semibold text-text-primary hover:shadow-[0_0_30px_rgba(80,125,188,0.5)] transition-all duration-300"
            >
              Get Started for Free
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-fade-border px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <div>
              <Link href="/">
                <Image
                  src="/images/logo/logo.svg"
                  alt="EZY Notez"
                  width={100}
                  height={38}
                />
              </Link>
              <p className="text-sm text-text-muted mt-2">
                Your AI-powered study companion.
              </p>
            </div>

            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-text-muted hover:text-text-primary transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="border-t border-fade-border pt-6 text-center">
            <p className="text-sm text-text-muted">
              &copy; 2025 EZY Notez. Built for students, by students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
