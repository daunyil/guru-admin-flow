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

export function useAutoSave({
  docId,
  getData,
  onSave,
  debounceMs = 1500,
}: UseAutoSaveArgs): UseAutoSaveResult {
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<Record<string, unknown>>({});

  // Simpan snapshot terakhir supaya callback tidak stale.
  dataRef.current = getData();

  const doSave = useCallback(async () => {
    if (!docId) return;
    setSaveStatus("saving");
    try {
      await onSave(docId, dataRef.current);
      setSaveStatus("saved");
      // Kembalikan ke idle setelah 2 detik supaya indikator tidak permanen.
      setTimeout(() => {
        setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2000);
    } catch {
      setSaveStatus("error");
    }
  }, [docId, onSave]);

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
