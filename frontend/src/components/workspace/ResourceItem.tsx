"use client";

import {
  FileText,
  Presentation,
  Image as ImageIcon,
  Music,
  Video,
  Trash2,
} from "lucide-react";
import type { Resource, ResourceType, ResourceStatus } from "@/types/resource";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return `${diffD} days ago`;
}

const iconConfig: Record<
  ResourceType,
  { bg: string; icon: React.ElementType; color: string }
> = {
  pdf: { bg: "bg-red-900/40", icon: FileText, color: "text-red-400" },
  ppt: {
    bg: "bg-orange-900/40",
    icon: Presentation,
    color: "text-orange-400",
  },
  image: {
    bg: "bg-purple-900/40",
    icon: ImageIcon,
    color: "text-purple-400",
  },
  audio: { bg: "bg-blue-900/40", icon: Music, color: "text-blue-400" },
  youtube: { bg: "bg-red-900/40", icon: Video, color: "text-red-400" },
};

const statusConfig: Record<
  ResourceStatus,
  { bg: string; color: string; label: string; pulse: boolean }
> = {
  uploading: {
    bg: "bg-yellow-900/40",
    color: "text-yellow-400",
    label: "Uploading",
    pulse: true,
  },
  indexing: {
    bg: "bg-purple-900/40",
    color: "text-purple-400",
    label: "Indexing",
    pulse: true,
  },
  processing: {
    bg: "bg-blue-900/40",
    color: "text-blue-accent",
    label: "Processing",
    pulse: true,
  },
  ready: {
    bg: "bg-green-900/40",
    color: "text-green-400",
    label: "Ready",
    pulse: false,
  },
  failed: {
    bg: "bg-red-900/40",
    color: "text-red-400",
    label: "Failed",
    pulse: false,
  },
};

interface ResourceItemProps {
  resource: Resource;
  onDelete: (id: string) => void;
}

export default function ResourceItem({
  resource,
  onDelete,
}: ResourceItemProps) {
  const { bg, icon: Icon, color } = iconConfig[resource.type] ?? iconConfig.pdf;
  const status = statusConfig[resource.status] ?? statusConfig.processing;

  return (
    <div
      className="bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25)] rounded-xl border-white/[0.08] px-4 py-3 flex items-center gap-4 group"
    >
      {/* File icon */}
      <div className={`${bg} rounded-lg p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-medium text-sm truncate">
          {resource.name}
        </p>
        <p className="text-text-muted text-xs mt-0.5">
          {resource.type === "youtube" ? "YouTube" : formatBytes(resource.size)} &middot;{" "}
          {timeAgo(new Date(resource.created_at))}
        </p>
      </div>

      {/* Status badge */}
      <span
        className={`${status.bg} ${status.color} rounded-full px-3 py-1 text-xs font-medium shrink-0 ${
          status.pulse ? "animate-pulse" : ""
        }`}
      >
        {status.label}
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(resource.id)}
        className="text-text-muted opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all shrink-0"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
