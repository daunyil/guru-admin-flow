/**
 * Helper CRUD generik untuk entitas Dexie.
 * Setiap tulisan wajib update updatedAt + manage syncStatus.
 */

import { db } from "./schema";
import { uuid, nowTimestamp } from "@guru-admin/shared";
import type { SyncStatus } from "@guru-admin/domain";

type TableName =
  | "academicYears"
  | "schoolProfile"
  | "teacherProfile"
  | "calendarEvents"
  | "protaProfiles"
  | "protaUnits"
  | "teachingSchedules"
  | "teachingAssignments"
  | "lessonSessions"
  | "attendanceRecords"
  | "classRosters"
  | "teachingJournals"
  | "semesterReports"
  | "gradeBooks"
  | "atpEntries"
  | "lkpds"
  | "documentSnapshots"
  | "syncQueue";

/** Buat entitas baru dengan field BaseEntity terisi otomatis. */
export function createEntity<T extends Record<string, unknown>>(
  data: Omit<T, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): T {
  const now = nowTimestamp();
  return {
    ...data,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only" as SyncStatus,
  } as unknown as T;
}

/** Update entitas yang sudah ada. updatedAt di-update otomatis. */
export function updateEntityFields<T extends { id: string; updatedAt: string; syncStatus: SyncStatus; deletedAt?: string | null }>(
  current: T,
  patch: Partial<T>
): T {
  return {
    ...current,
    ...patch,
    updatedAt: nowTimestamp(),
    // Bila sudah pernah synced, kembalikan ke pending agar di-sync ulang.
    syncStatus: current.syncStatus === "synced" ? "pending" : current.syncStatus,
  };
}

/** Soft delete: set deletedAt, jangan hapus fisik. */
export function softDelete<T extends { id: string; updatedAt: string; deletedAt?: string | null; syncStatus: SyncStatus }>(
  current: T
): T {
  return {
    ...current,
    deletedAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
    syncStatus: current.syncStatus === "synced" ? "pending" : current.syncStatus,
  };
}

/**
 * Save (upsert) entitas ke tabel.
 */
export async function saveEntity<T extends { id: string }>(
  tableName: TableName,
  entity: T
): Promise<void> {
  await db.table(tableName).put(entity);
}

/**
 * Get entitas by id.
 */
export async function getEntity<T extends { id: string }>(
  tableName: TableName,
  id: string
): Promise<T | undefined> {
  return (await db.table(tableName).get(id)) as T | undefined;
}

/**
 * Get semua entitas (yang belum di-soft-delete) dari tabel.
 */
export async function listEntities<T extends { deletedAt?: string | null }>(
  tableName: TableName
): Promise<T[]> {
  const all = (await db.table(tableName).toArray()) as T[];
  return all.filter((e) => !e.deletedAt);
}

/**
 * Hapus fisik (hard delete). Hanya untuk syncQueue atau cleanup eksplisit.
 * Untuk entitas bisnis, gunakan softDelete.
 */
export async function hardDeleteEntity(
  tableName: TableName,
  id: string
): Promise<void> {
  await db.table(tableName).delete(id);
}

/**
 * Bersihkan seluruh tabel (untuk restore backup).
 */
export async function clearTable(tableName: TableName): Promise<void> {
  await db.table(tableName).clear();
}
