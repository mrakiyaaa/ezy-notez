"use client";

import { Check, Sparkles } from "lucide-react";

const plans = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "Up to 3 workspaces",
      "Core Chattie & summarization",
      "Basic flashcards & quizzes",
    ],
    current: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: "$9",
    period: "per month",
    features: [
      "Unlimited workspaces",
      "Advanced AI summarization",
      "Unlimited flashcards & quizzes",
      "Priority study room hosting",
    ],
    current: false,
  },
  {
    key: "team",
    name: "Team",
    price: "$24",
    period: "per month",
    features: [
      "Everything in Pro",
      "Shared workspaces",
      "Collaboration analytics",
      "Dedicated support",
    ],
    current: false,
  },
];

export default function SettingsSubscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-text-primary text-2xl font-bold">Subscription</h1>
        <p className="text-text-muted text-sm mt-1">
          Review your current plan and upgrade options.
        </p>
      </div>

      <div className="bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl p-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-text-muted">
            Current plan
          </div>
          <div className="text-text-primary text-lg font-semibold mt-1">Free</div>
          <div className="text-text-muted text-xs mt-1">
            You&apos;re on the free plan. Upgrade anytime.
          </div>
        </div>
        <button
          type="button"
          disabled
          className="bg-blue-accent/20 text-blue-accent font-semibold text-sm rounded-lg px-4 py-2 flex items-center gap-2 cursor-not-allowed"
          title="Billing coming soon"
        >
          <Sparkles className="w-4 h-4" />
          Manage billing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`flex flex-col gap-4 p-5 rounded-xl border ${
              plan.current
                ? "border-blue-accent/50 bg-blue-accent/5"
                : "border-fade-border bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-text-primary font-semibold">{plan.name}</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-text-primary text-xl font-bold">
                    {plan.price}
                  </span>
                  <span className="text-text-muted text-xs">{plan.period}</span>
                </div>
              </div>
              {plan.current && (
                <span className="text-[10px] uppercase tracking-wide text-blue-accent border border-blue-accent/40 rounded-full px-2 py-0.5">
                  Current
                </span>
              )}
            </div>

            <ul className="flex flex-col gap-2 text-xs text-text-secondary">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-accent mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled
              className={`w-full text-sm font-semibold rounded-lg py-2 transition-opacity cursor-not-allowed ${
                plan.current
                  ? "bg-white/5 text-text-muted"
                  : "bg-blue-accent/90 text-white opacity-70"
              }`}
              title={plan.current ? "Your current plan" : "Billing coming soon"}
            >
              {plan.current ? "Your plan" : "Upgrade"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
