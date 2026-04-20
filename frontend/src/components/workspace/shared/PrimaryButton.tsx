import { ButtonHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  label: string;
}

export function PrimaryButton({
  className = "",
  disabled,
  icon: Icon,
  label,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`relative z-10 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
        disabled
          ? "bg-white/5 text-text-muted cursor-not-allowed opacity-50"
          : "hover:opacity-90 shadow-[0_0_20px_rgba(80,125,188,0.3)]"
      } ${className}`}
      style={
        !disabled
          ? {
              backgroundColor: "var(--color-blue-accent)",
              color: "#ffffff",
              ...props.style,
            }
          : props.style
      }
    >
      {Icon && <Icon className="w-5 h-5" />}
      {label}
    </button>
  );
}
