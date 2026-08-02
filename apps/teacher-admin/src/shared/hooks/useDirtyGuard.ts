/**
 * useDirtyGuard — Shared hook for unsaved changes protection.
 *
 * B4-01: Consolidates dirty guard patterns used across the app.
 *   - `beforeunload` event: warns when closing tab/refreshing with unsaved changes
 *   - `useBlocker` (React Router): warns when navigating to another route
 *   - `guardAction()`: wraps actions with `window.confirm()` before proceeding
 *
 * FIX-RC2: useBlocker only works with createBrowserRouter (Data Router).
 * When using HashRouter/BrowserRouter, useBlocker throws an error.
 * This hook now safely detects the router type and falls back to
 * beforeunload-only guard when Data Router context is not available.
 *
 * Usage:
 *   const isDirty = useMemo(() => myChanges.size > 0, [myChanges]);
 *   useDirtyGuard(isDirty);
 *   // Or with custom message:
 *   useDirtyGuard(isDirty, { message: "Data presensi belum disimpan. Yakin ingin keluar?" });
 */

import { useCallback, useContext, useEffect } from "react";
import { UNSAFE_DataRouterContext, useBlocker } from "react-router-dom";
import type { Blocker } from "react-router-dom";

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
 * A no-op blocker that mimics the Blocker interface but does nothing.
 * Used as fallback when Data Router context is not available.
 */
const NOOP_BLOCKER: Blocker = {
  state: "unblocked",
  location: null as any,
  baseAction: null as any,
  proceed: null as any,
  reset: null as any,
} as Blocker;

/**
 * useSafeBlocker — Calls useBlocker only when Data Router context is available.
 * Falls back to a no-op blocker when using HashRouter/BrowserRouter.
 *
 * FIX-RC2: We detect the Data Router context using DataRouterContext.
 * useBlocker() requires createBrowserRouter — it throws when called
 * inside HashRouter or BrowserRouter. By checking the context first,
 * we avoid the crash entirely.
 */
function useSafeBlocker(
  shouldBlock: (args: { currentLocation: any; nextLocation: any }) => boolean,
  enableBlocker: boolean,
): Blocker {
  // Check if we're inside a Data Router (createBrowserRouter)
  const dataRouterContext = useContext(UNSAFE_DataRouterContext);
  const isDataRouter = !!(dataRouterContext as any)?.router;

  if (!enableBlocker || !isDataRouter) {
    return NOOP_BLOCKER;
  }

  // Safe to call useBlocker — we're inside a Data Router
  return useBlocker(shouldBlock);
}

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
  // FIX-RC2: Safely detect Data Router context before calling useBlocker
  const blocker = useSafeBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname,
    enableBlocker,
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
