import React from "react";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function PageHeader({ icon, title, description }: PageHeaderProps) {
  return (
    <div className="flex flex-row items-center gap-4">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" 
        style={{ 
          backgroundColor: "rgba(80,125,188,0.12)", 
          border: "1px solid rgba(80,125,188,0.25)" 
        }}
      >
        {icon}
      </div>
      <div>
        <h2 className="text-[22px] font-semibold text-white tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-[13px] font-normal text-[rgba(255,255,255,0.45)] mt-[3px]">
          {description}
        </p>
      </div>
    </div>
  );
}
