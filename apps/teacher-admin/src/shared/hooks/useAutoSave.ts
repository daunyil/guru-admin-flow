/**
 * useAutoSave — hook debounce auto-save untuk WYSIWYG DocumentPreview.
 *
 * WYSIWYG-DOC-01: debounce 1.5 detik, indikator "Menyimpan…" / "✓ Tersimpan".
 *
 * Cara pakai:
 *   const { saveStatus, triggerSave, scheduleSave } = useAutoSave({
 *     docId,
 *     getData: () => docData,
 *     onSave: async (id, data) => { await updateSchoolDocumentData(id, data); },
 *   });
 *
 * - scheduleSave() dipanggil setiap kali konten berubah (debounce otomatis).
 * - triggerSave() untuk simpan manual (langsung tanpa debounce).
 * - saveStatus: idle | saving | saved | error.
 *
 * v2: retry logic — 2x retry dengan exponential backoff (500ms, 1500ms).
 *     Error di-log ke console. Reset timeout saat unmount.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveArgs {
  /** ID dokumen (dari tabel schoolDocuments). */
  docId: string | undefined;
  /** Fungsi untuk mengambil data dokumen terkini. */
  getData: () => Record<string, unknown>;
  /** Callback simpan data. Dipanggil setelah debounce. */
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  /** Debounce delay dalam ms. Default 1500. */
  debounceMs?: number;
  /** Maksimal retry saat save gagal. Default 2. */
  maxRetries?: number;
}

interface UseAutoSaveResult {
  /** Status auto-save terkini. */
  saveStatus: AutoSaveStatus;
  /** Trigger simpan manual (langsung tanpa debounce). */
  triggerSave: () => Promise<void>;
  /** Schedule simpan dengan debounce (panggil saat konten berubah). */
  scheduleSave: () => void;
  /** Reset status ke idle. */
  resetStatus: () => void;
}

const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_MS = 500;

export function useAutoSave({
  docId,
  getData,
  onSave,
  debounceMs = 1500,
  maxRetries = DEFAULT_MAX_RETRIES,
}: UseAutoSaveArgs): UseAutoSaveResult {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<Record<string, unknown>>({});

  // Simpan snapshot terakhir supaya callback tidak stale.
  dataRef.current = getData();

  const doSave = useCallback(async () => {
    if (!docId) return;
    setSaveStatus("saving");

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await onSave(docId, dataRef.current);
        setSaveStatus("saved");
        // Kembalikan ke idle setelah 2 detik supaya indikator tidak permanen.
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 2000);
        return; // success — keluar
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1500ms, ...
          const delay = RETRY_BASE_MS * Math.pow(3, attempt);
          console.warn(
            `[useAutoSave] Save gagal (attempt ${attempt + 1}/${maxRetries}), retry in ${delay}ms:`,
            err
          );
          await new Promise<void>((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Semua retry gagal
    console.error("[useAutoSave] Save gagal setelah semua retry:", lastError);
    setSaveStatus("error");
  }, [docId, onSave, maxRetries]);

  // Debounce: setiap kali scheduleSave dipanggil, reset timer dan simpan
  // setelah debounceMs.
  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void doSave();
    }, debounceMs);
  }, [debounceMs, doSave]);

  // Cleanup timer saat unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const triggerSave = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await doSave();
  }, [doSave]);

  const resetStatus = useCallback(() => {
    setSaveStatus("idle");
  }, []);

  return { saveStatus, triggerSave, scheduleSave, resetStatus };
}
