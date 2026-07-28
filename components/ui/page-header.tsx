import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm", className)}>
      <div>
        <h1 className={cn("text-2xl font-bold text-slate-900 tracking-tight", className?.includes('p-4') ? 'text-base' : '')}>{title}</h1>
        <p className={cn("text-slate-500 text-sm mt-1", className?.includes('p-4') ? 'text-xs mt-0.5' : '')}>{description}</p>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
