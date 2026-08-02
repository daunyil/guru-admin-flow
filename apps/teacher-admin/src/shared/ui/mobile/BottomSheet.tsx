/**
 * BottomSheet — Mobile slide-up panel or centered dialog.
 *
 * Features:
 *   - Fixed overlay with backdrop
 *   - Drag handle indicator (bottom sheet mode only)
 *   - Close button (X)
 *   - Scrollable content area
 *   - Max height 85vh with overflow
 *   - max-w-md for mobile centering
 *   - `centered` mode: centered dialog with rounded corners all around
 *
 * Used by: KBM Kilat (Nilai input), LedgerDetailSheet, future filters, etc.
 */

import { type ReactNode, useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional action button at bottom */
  action?: ReactNode;
  /** When true, renders as a centered dialog instead of a bottom sheet */
  centered?: boolean;
}

export function BottomSheet({ open, onClose, title, children, action, centered }: BottomSheetProps) {
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

  if (centered) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Centered dialog */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={sheetRef}
            className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] w-full max-w-md overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
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
            <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-2">
              {children}
            </div>

            {/* Optional action */}
            {action && (
              <div className="p-4 pt-2 border-t border-slate-100">
                {action}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

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
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[28px] z-50 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
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

        {/* Scrollable content — min-h-0 is CRITICAL for flex overflow to work */}
        <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-2">
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
