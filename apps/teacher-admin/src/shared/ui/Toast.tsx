/**
 * Toast — Lightweight toast notification component.
 *
 * Features:
 *   - Auto-dismiss after configurable duration (default 3s)
 *   - Success / error / info variants with color-coded styling
 *   - Smooth enter/exit CSS animation (slide-down + fade)
 *   - Dismiss on click or ✕ button
 *   - No external dependencies — pure Tailwind + React
 *
 * Usage:
 *   const toast = useToast();
 *   toast.show("Data KBM Berhasil Disimpan!", { variant: "success" });
 *
 * Design principle: Single active toast at a time (mobile-first).
 * If stacked toasts are needed later, extend useToast with a queue.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================ */
/*  Types                                                        */
/* ============================================================ */

export type ToastVariant = "success" | "error" | "info";

export interface ToastConfig {
  /** Message to display */
  message: string;
  /** Visual variant — determines color scheme */
  variant?: ToastVariant;
  /** Auto-dismiss duration in ms. 0 = no auto-dismiss. Default: 3000 */
  duration?: number;
}

export interface ToastState extends ToastConfig {
  /** Unique ID for this toast instance */
  id: number;
  /** Whether the toast is currently exiting (for animation) */
  exiting: boolean;
}

/* ============================================================ */
/*  useToast Hook                                                */
/* ============================================================ */

let toastCounter = 0;

/**
 * useToast — Manage toast notification state.
 *
 * Only one toast is visible at a time. Calling `show()` while a toast
 * is active will replace it immediately.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Clear any existing auto-dismiss timer */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Dismiss the current toast (with exit animation) */
  const dismiss = useCallback(() => {
    clearTimer();
    setToast((prev) => {
      if (!prev) return null;
      return { ...prev, exiting: true };
    });
    // Remove from DOM after animation completes
    setTimeout(() => setToast(null), 300);
  }, [clearTimer]);

  /** Show a new toast */
  const show = useCallback(
    (message: string, config?: Omit<ToastConfig, "message">) => {
      clearTimer();
      const id = ++toastCounter;
      const duration = config?.duration ?? 3000;
      const newToast: ToastState = {
        id,
        message,
        variant: config?.variant ?? "info",
        duration,
        exiting: false,
      };
      setToast(newToast);

      // Auto-dismiss
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          dismiss();
        }, duration);
      }
    },
    [clearTimer, dismiss]
  );

  /** Convenience: show a success toast */
  const success = useCallback(
    (message: string) => show(message, { variant: "success" }),
    [show]
  );

  /** Convenience: show an error toast */
  const error = useCallback(
    (message: string) => show(message, { variant: "error" }),
    [show]
  );

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  return { toast, show, success, error, dismiss };
}

export type UseToastReturn = ReturnType<typeof useToast>;

/* ============================================================ */
/*  Toast Component                                              */
/* ============================================================ */

const VARIANT_STYLES: Record<ToastVariant, { container: string; icon: string }> = {
  success: {
    container: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: "✓",
  },
  error: {
    container: "bg-rose-50 border-rose-200 text-rose-800",
    icon: "✕",
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "ℹ",
  },
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const style = VARIANT_STYLES[toast.variant ?? "info"];

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed top-4 left-4 right-4 z-[100] mx-auto max-w-md
        flex items-center gap-3 p-3 rounded-xl border shadow-lg
        transition-all duration-300 ease-out
        ${style.container}
        ${toast.exiting
          ? "opacity-0 -translate-y-3"
          : "opacity-100 translate-y-0"
        }
      `}
    >
      {/* Icon */}
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          toast.variant === "success"
            ? "bg-emerald-500 text-white"
            : toast.variant === "error"
            ? "bg-rose-500 text-white"
            : "bg-blue-500 text-white"
        }`}
      >
        {style.icon}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm font-semibold leading-snug">
        {toast.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
        aria-label="Tutup notifikasi"
      >
        ✕
      </button>
    </div>
  );
}
