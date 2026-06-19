/**
 * Tipe dan schema dasar yang dipakai semua entitas.
 * Sumber: docs/DATA_MODEL_DRAFT.md §0
 */

import { z } from "zod";
import { DOCUMENT_STATUSES, SYNC_STATUSES } from "@guru-admin/shared";

/* ------------------------------------------------------------------ */
/*  Status types                                                      */
/* ------------------------------------------------------------------ */

export const syncStatusSchema = z.enum(SYNC_STATUSES);
export type SyncStatus = z.infer<typeof syncStatusSchema>;

export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

/* ------------------------------------------------------------------ */
/*  BaseEntity                                                        */
/* ------------------------------------------------------------------ */

/**
 * Field wajib untuk semua entitas persisten.
 * Lihat docs/DATA_MODEL_DRAFT.md §0.1.
 */
export const baseEntitySchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  createdAt: z.string().min(1, "createdAt wajib diisi"),
  updatedAt: z.string().min(1, "updatedAt wajib diisi"),
  deletedAt: z.string().nullable().optional(),
  syncStatus: syncStatusSchema,
});
export type BaseEntity = z.infer<typeof baseEntitySchema>;

/* ------------------------------------------------------------------ */
/*  Helper untuk membuat entity baru                                  */
/* ------------------------------------------------------------------ */

/**
 * Membuat field BaseEntity untuk entitas baru.
 * Dipakai oleh factory function per entitas.
 */
export function makeBaseEntityFields(id: string, now: string = new Date().toISOString()) {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null as string | null,
    syncStatus: "local_only" as const,
  };
}
