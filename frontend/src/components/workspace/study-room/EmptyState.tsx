"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-fade-border flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-text-muted" />
      </div>
      <p className="text-text-secondary text-sm font-medium">{title}</p>
      <p className="text-text-muted text-xs mt-1 text-center max-w-[240px]">
        {description}
      </p>
    </div>
  );
}
