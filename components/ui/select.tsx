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
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  className = "",
  disabled = false,
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
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-900 flex items-center justify-between outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180 text-primary" : ""}`} />
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
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-slate-700 hover:bg-primary/10 hover:text-primary"
                    }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
