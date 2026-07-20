/**
 * useDialogA11y — hook untuk accessibility overlay/dialog.
 *
 * Fitur:
 *   - Focus trap: Tab/Shift+Tab tidak keluar dari overlay.
 *   - Escape key: menutup overlay.
 *   - Return focus ke elemen sebelumnya saat overlay ditutup.
 *
 * Cara pakai:
 *   const overlayRef = useDialogA11y(isOpen, onClose);
 *   return isOpen ? (
 *     <div ref={overlayRef} role="dialog" aria-modal="true" aria-label="...">
 *       ...
 *     </div>
 *   ) : null;
 */

import { useEffect, useRef } from "react";

export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose: () => void
) {
  const ref = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Trap focus & handle escape
  useEffect(() => {
    if (!isOpen) return;

    // Simpan elemen yang sedang fokus sebelum overlay terbuka
    previousFocusRef.current = document.activeElement as HTMLElement;

    const el = ref.current;
    if (!el) return;

    // Fokus ke elemen pertama yang bisa difokus
    const focusFirst = () => {
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        el.focus();
      }
    };

    // Delay supaya DOM sudah terrender
    requestAnimationFrame(focusFirst);

    function handleKeyDown(e: KeyboardEvent) {
      // Guard: el bisa null kalau komponen sudah unmount
      if (!el) return;

      // Escape → tutup
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab / Shift+Tab → trap focus
      if (e.key !== "Tab") return;

      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    el.addEventListener("keydown", handleKeyDown);

    return () => {
      el.removeEventListener("keydown", handleKeyDown);
      // Kembalikan fokus ke elemen sebelumnya
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  return ref;
}
