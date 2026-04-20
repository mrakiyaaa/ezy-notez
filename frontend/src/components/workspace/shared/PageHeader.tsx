import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  description: string;
  icon: LucideIcon;
  title: string;
}

export function PageHeader({ description, icon: Icon, title }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-12 h-12 shrink-0 bg-blue-[var(--color-blue-accent)]/10 border border-[var(--color-blue-accent)]/30 rounded-xl flex items-center justify-center" style={{ borderColor: 'rgba(80, 125, 188, 0.3)', backgroundColor: 'rgba(80, 125, 188, 0.1)' }}>
        <Icon className="w-5 h-5" style={{ color: 'var(--color-blue-accent)' }} />
      </div>
      <div>
        <h2 className="text-text-primary text-xl font-bold">
          {title}
        </h2>
        <p className="text-text-muted text-sm font-light">
          {description}
        </p>
      </div>
    </div>
  );
}
