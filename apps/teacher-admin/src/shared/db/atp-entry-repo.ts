/**
 * Repository untuk ATPEntry (Bank ATP/TP).
 *
 * APP-USABLE-RC1: formalisasi dari dynamic db.table("atp_entries") ke
 * schema Dexie resmi.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { ATPEntry } from "@guru-admin/domain";

/** List ATPEntry untuk academicYearId + teacherId (+ optional subject/grade). */
export async function listATPEntries(args: {
  academicYearId: string;
  teacherId: string;
  subject?: string;
  grade?: string;
}): Promise<ATPEntry[]> {
  const all = await db.atpEntries
    .where("academicYearId")
    .equals(args.academicYearId)
    .toArray();
  return all
    .filter(
      (e) =>
        !e.deletedAt &&
        e.teacherId === args.teacherId &&
        (args.subject === undefined || e.subject === args.subject) &&
        (args.grade === undefined || e.grade === args.grade)
    )
    .sort((a, b) => {
      // Sort by subject, then grade, then bab
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return (a.bab ?? "").localeCompare(b.bab ?? "");
    }) as ATPEntry[];
}

/** Get ATPEntry by id. */
export async function getATPEntry(id: string): Promise<ATPEntry | undefined> {
  const e = await db.atpEntries.get(id);
  return e && !e.deletedAt ? (e as ATPEntry) : undefined;
}

/** Create new ATPEntry. */
export async function saveATPEntry(
  data: Omit<ATPEntry, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<ATPEntry> {
  const entity = createEntity(data) as ATPEntry;
  await saveEntity("atpEntries", entity);
  return entity;
}

/** Update ATPEntry. */
export async function updateATPEntry(
  id: string,
  patch: Partial<ATPEntry>
): Promise<ATPEntry | undefined> {
  const existing = await getATPEntry(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as ATPEntry;
  await saveEntity("atpEntries", updated);
  return updated;
}

/** Soft delete ATPEntry. */
export async function deleteATPEntry(id: string): Promise<void> {
  const existing = await getATPEntry(id);
  if (!existing) return;
  await saveEntity("atpEntries", softDelete(existing) as ATPEntry);
}
