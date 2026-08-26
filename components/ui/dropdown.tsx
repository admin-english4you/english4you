"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  width?: "w-48" | "w-56" | "w-64" | "auto";
}

// Usado apenas para estimar a posição horizontal do menu quando align="right"
// (o menu é portado para document.body, então não pode se auto-medir antes de abrir).
const WIDTH_PX: Record<NonNullable<DropdownProps["width"]>, number> = {
  "w-48": 192,
  "w-56": 224,
  "w-64": 256,
  auto: 192,
};

export function Dropdown({ trigger, children, align = "right", width = "w-48" }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = WIDTH_PX[width];
      const left = align === "right" ? rect.right - menuWidth : rect.left;
      setPosition({ top: rect.bottom + 4, left });
    }

    updatePosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    }

    // capture:true para pegar scroll em qualquer container ancestral (ex: tabelas com overflow-x-auto)
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, align, width]);

  return (
    <>
      <div ref={triggerRef} onClick={() => setIsOpen((prev) => !prev)} className="inline-block cursor-pointer">
        {trigger}
      </div>
      {isOpen && position && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className={`${width} bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden focus:outline-none transition-all duration-200 z-[100]`}
          >
            <div onClick={() => setIsOpen(false)}>{children}</div>
          </div>,
          document.body
        )}
    </>
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
    : "text-slate-700 hover:bg-primary/10 hover:text-primary";

  return (
    <button onClick={onClick} className={`${baseClass} ${colorClass} ${className}`}>
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="border-t border-slate-100"></div>;
}
