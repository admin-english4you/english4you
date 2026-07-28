"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  width?: "w-48" | "w-56" | "w-64" | "auto";
}

export function Dropdown({ trigger, children, align = "right", width = "w-48" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div 
          className={`absolute ${align === "right" ? "right-0" : "left-0"} mt-2 ${width} bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden focus:outline-none transition-all duration-200 z-50`}
        >
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
}

export function DropdownItem({ children, onClick, className = "", destructive = false }: DropdownItemProps) {
  const baseClass = "flex w-full items-center px-4  py-2.5 text-sm transition-colors text-left";
  const colorClass = destructive 
    ? "text-rose-600 hover:bg-rose-50" 
    : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-700";
    
  return (
    <button onClick={onClick} className={`${baseClass} ${colorClass} ${className}`}>
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="border-t border-slate-100"></div>;
}
