import { X } from "lucide-react";
import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md transform transition-all">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
          <h2 className="font-bold text-slate-900 text-base">{title}</h2>
          <button 
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div className={`pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

Modal.Footer = ModalFooter;

