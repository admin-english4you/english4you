"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  className = "",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative w-full ${className}`} ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 flex items-center justify-between outline-none focus:border-[#016ad1] focus:ring-2 focus:ring-[#016ad1]/20 transition-all font-medium text-left"
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-indigo-500" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden focus:outline-none transition-all duration-200 z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          {options.length === 0 ? (
            <div className="px-4 py-2.5 text-sm text-slate-400 text-center">
              Sem opções disponíveis
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors text-left font-medium
                    ${isSelected 
                      ? "bg-indigo-50/80 text-indigo-700 font-semibold" 
                      : "text-slate-700 hover:bg-indigo-50/40 hover:text-indigo-700"
                    }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
