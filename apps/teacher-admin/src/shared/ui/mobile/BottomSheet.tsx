/**
 * BottomSheet — Mobile slide-up panel.
 *
 * Features:
 *   - Fixed bottom overlay with backdrop
 *   - Drag handle indicator
 *   - Close button (X)
 *   - Scrollable content area
 *   - Max height 80vh with overflow
 *   - max-w-md for mobile centering
 *
 * Used by: KBM Kilat (Nilai input), future filters, etc.
 */

import { type ReactNode, useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional action button at bottom */
  action?: ReactNode;
}

export function BottomSheet({ open, onClose, title, children, action }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[28px] z-50 shadow-2xl flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-2" />

        {/* Header */}
        <div className="flex justify-between items-center px-4 pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 font-bold text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {children}
        </div>

        {/* Optional action */}
        {action && (
          <div className="p-4 pt-2 border-t border-slate-100">
            {action}
          </div>
        )}
      </div>
    </>
  );
}
