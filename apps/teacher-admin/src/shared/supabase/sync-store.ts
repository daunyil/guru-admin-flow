/**
 * SUPABASE-CLOUD-READY-01: Sync status store + retry queue.
 *
 * Lightweight Zustand store untuk track:
 *   1. Sync status: offline | local | cloud-active
 *   2. Pending errors (push yang gagal)
 *   3. Retry mechanism
 *
 * Dipakai oleh AppShell untuk badge + toast.
 */

import { create } from "zustand";
import { isSupabaseConfigured } from "./client";

export type SyncStatus = "offline" | "local" | "cloud-active" | "cloud-error";

export type SyncError = {
  id: string;
  module: string; // "attendance" | "journal" | "session" | "assignment"
  operation: string; // "push" | "pull"
  message: string;
  timestamp: string;
  retried: boolean;
};

type SyncStore = {
  status: SyncStatus;
  errors: SyncError[];
  lastSyncAt: string | null;
  setStatus: (status: SyncStatus) => void;
  addError: (error: Omit<SyncError, "id" | "timestamp" | "retried">) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  markRetried: (id: string) => void;
  setLastSync: (timestamp: string) => void;
};

export const useSyncStore = create<SyncStore>((set) => ({
  status: isSupabaseConfigured ? "cloud-active" : "local",
  errors: [],
  lastSyncAt: null,
  setStatus: (status) => set({ status }),
  addError: (error) =>
    set((state) => ({
      errors: [
        ...state.errors,
        {
          ...error,
          id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          retried: false,
        },
      ].slice(-20), // max 20 errors
      status: "cloud-error",
    })),
  clearError: (id) =>
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    })),
  clearAllErrors: () => set({ errors: [] }),
  markRetried: (id) =>
    set((state) => ({
      errors: state.errors.map((e) =>
        e.id === id ? { ...e, retried: true } : e
      ),
    })),
  setLastSync: (timestamp) => set({ lastSyncAt: timestamp }),
}));

/**
 * Helper: report sync error ke store.
 * Dipakai oleh repo (attendance-repo, journal-repo) sebagai pengganti
 * console.warn langsung.
 */
export function reportSyncError(
  module: string,
  operation: string,
  message: string
): void {
  useSyncStore.getState().addError({ module, operation, message });
  // Tetap console.warn untuk debugging
  console.warn(`[Supabase Bridge] ${module} ${operation} gagal:`, message);
}

/**
 * Helper: report successful sync.
 */
export function reportSyncSuccess(): void {
  const store = useSyncStore.getState();
  store.setLastSync(new Date().toISOString());
  if (store.status === "cloud-error") {
    store.setStatus("cloud-active");
  }
}

/**
 * Check dan update sync status berdasarkan konfigurasi Supabase.
 * Dipanggil saat app init.
 */
export async function refreshSyncStatus(): Promise<void> {
  if (!isSupabaseConfigured) {
    useSyncStore.getState().setStatus("local");
    return;
  }
  // Bila Supabase dikonfigurasi, cek apakah user login
  try {
    const { getCurrentCloudAuthState } = await import("./auth");
    const state = await getCurrentCloudAuthState();
    if (state.user && state.profile) {
      useSyncStore.getState().setStatus("cloud-active");
    } else {
      useSyncStore.getState().setStatus("offline");
    }
  } catch {
    useSyncStore.getState().setStatus("cloud-error");
  }
}
