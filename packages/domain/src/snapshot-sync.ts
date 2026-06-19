/**
 * DocumentSnapshot & SyncQueue — entitas pendukung.
 * Sumber: docs/DATA_MODEL_DRAFT.md §11
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

/* ------------------------------------------------------------------ */
/*  DocumentSnapshot                                                  */
/* ------------------------------------------------------------------ */

export const documentSnapshotSchema = baseEntitySchema.extend({
  entityType: z.enum(["prota", "promes", "semester_report", "journal"]),
  entityId: z.string().min(1),
  status: documentStatusSchema,
  snapshotData: z.string(), // JSON serialized
  snapshotAt: z.string(),
  snapshotBy: z.string(), // teacherId
  reason: z.string().optional(),
});

export type DocumentSnapshot = z.infer<typeof documentSnapshotSchema>;

export function parseDocumentSnapshot(input: unknown): DocumentSnapshot {
  return documentSnapshotSchema.parse(input);
}

/* ------------------------------------------------------------------ */
/*  SyncQueue (placeholder untuk Sprint 6)                            */
/* ------------------------------------------------------------------ */

export const syncQueueItemSchema = z.object({
  id: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.string(), // JSON serialized
  status: z.enum(["pending", "syncing", "synced", "error"]),
  attempts: z.number().int().nonnegative(),
  lastAttemptAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SyncQueueItem = z.infer<typeof syncQueueItemSchema>;

export function parseSyncQueueItem(input: unknown): SyncQueueItem {
  return syncQueueItemSchema.parse(input);
}
