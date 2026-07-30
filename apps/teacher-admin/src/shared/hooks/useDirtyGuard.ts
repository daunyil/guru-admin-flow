/**
 * useDirtyGuard — Shared hook for unsaved changes protection.
 *
 * B4-01: Consolidates dirty guard patterns used across the app.
 *   - `beforeunload` event: warns when closing tab/refreshing with unsaved changes
 *   - `useBlocker` (React Router): warns when navigating to another route
 *   - `guardAction()`: wraps actions with `window.confirm()` before proceeding
 *
 * Usage:
 *   const isDirty = useMemo(() => myChanges.size > 0, [myChanges]);
 *   useDirtyGuard(isDirty);
 *   // Or with custom message:
 *   useDirtyGuard(isDirty, { message: "Data presensi belum disimpan. Yakin ingin keluar?" });
 *
 * Inspired by the snapshot-based pattern in useKbmHub (B4-02),
 * but extracted as a reusable hook for all editor pages.
 */

import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";

export type UseDirtyGuardOptions = {
  /** Custom message shown in confirm dialog. Default: "Data belum disimpan. Yakin ingin keluar?" */
  message?: string;
  /** Whether to enable the React Router blocker. Default: true */
  enableBlocker?: boolean;
  /** Whether to enable the beforeunload listener. Default: true */
  enableBeforeUnload?: boolean;
};

const DEFAULT_MESSAGE = "Data belum disimpan. Yakin ingin keluar?";

/**
 * useDirtyGuard — Protects against losing unsaved changes.
 *
 * @param isDirty — Whether there are unsaved changes
 * @param options — Configuration options
 */
export function useDirtyGuard(
  isDirty: boolean,
  options: UseDirtyGuardOptions = {},
) {
  const {
    message = DEFAULT_MESSAGE,
    enableBlocker = true,
    enableBeforeUnload = true,
  } = options;

  // 1. beforeunload: warn when closing tab/refreshing
  useEffect(() => {
    if (!isDirty || !enableBeforeUnload) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but legacy requires returnValue
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, enableBeforeUnload]);

  // 2. React Router blocker: warn when navigating to another route
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      enableBlocker &&
      currentLocation.pathname !== nextLocation.pathname,
  );

  // Show confirm when blocker is triggered
  useEffect(() => {
    if (blocker.state === "blocked") {
      const ok = window.confirm(message);
      if (ok) {
        blocker.proceed?.();
      } else {
        blocker.reset?.();
      }
    }
  }, [blocker, message]);

  // 3. guardAction: wraps an action with confirm dialog
  const guardAction = useCallback(
    (action: () => void) => {
      if (isDirty && !window.confirm(message)) return;
      action();
    },
    [isDirty, message],
  );

  return { guardAction, blocker };
}
