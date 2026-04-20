import React from "react";

interface PrimaryButtonProps {
  icon: React.ElementType; // To render icon as <Icon />
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function PrimaryButton({
  icon: Icon,
  label,
  onClick,
  disabled
}: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4.5 py-2.5 rounded-[10px] bg-blue-accent text-white text-[14px] font-medium transition-colors duration-150 ease-in-out hover:bg-[#3f6aab] ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      }`}
      style={{ border: 'none' }}
    >
      <Icon className="w-4 h-4" fill="none" />
      {label}
    </button>
  );
}
