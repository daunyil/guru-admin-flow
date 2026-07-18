/**
 * Repository untuk LKPD (Lembar Kerja Peserta Didik).
 *
 * APP-USABLE-RC1: modul nyata, bukan cuma prompt AI.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { LKPD } from "@guru-admin/domain";
import { finalizeLKPD as finalizeLKPDHelper } from "@guru-admin/domain";

/** List LKPD untuk academicYearId + teacherId (+ optional filters). */
export async function listLKPDs(args: {
  academicYearId: string;
  teacherId: string;
  subject?: string;
  classId?: string;
  atpEntryId?: string;
}): Promise<LKPD[]> {
  const all = await db.lkpds
    .where("academicYearId")
    .equals(args.academicYearId)
    .toArray();
  return all
    .filter(
      (l) =>
        !l.deletedAt &&
        l.teacherId === args.teacherId &&
        (args.subject === undefined || l.subject === args.subject) &&
        (args.classId === undefined || l.classId === args.classId) &&
        (args.atpEntryId === undefined || l.atpEntryId === args.atpEntryId)
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as LKPD[];
}

/** Get LKPD by id. */
export async function getLKPD(id: string): Promise<LKPD | undefined> {
  const l = await db.lkpds.get(id);
  return l && !l.deletedAt ? (l as LKPD) : undefined;
}

/** Create new LKPD. */
export async function saveLKPD(
  data: Omit<LKPD, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<LKPD> {
  const entity = createEntity(data) as LKPD;
  await saveEntity("lkpds", entity);
  return entity;
}

/** Update LKPD. */
export async function updateLKPD(
  id: string,
  patch: Partial<LKPD>
): Promise<LKPD | undefined> {
  const existing = await getLKPD(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as LKPD;
  await saveEntity("lkpds", updated);
  return updated;
}

/** Finalize LKPD: set status "final" + finalizedAt. */
export async function finalizeLKPD(id: string): Promise<{
  success: boolean;
  lkpd?: LKPD;
  errors: string[];
}> {
  const existing = await getLKPD(id);
  if (!existing) {
    return { success: false, errors: ["LKPD tidak ditemukan"] };
  }
  const result = finalizeLKPDHelper(existing);
  if (!result.success || !result.lkpd) {
    return { success: false, errors: result.errors };
  }
  await saveEntity("lkpds", result.lkpd);
  return { success: true, lkpd: result.lkpd, errors: [] };
}

/** Soft delete LKPD. */
export async function deleteLKPD(id: string): Promise<void> {
  const existing = await getLKPD(id);
  if (!existing) return;
  await saveEntity("lkpds", softDelete(existing) as LKPD);
}
