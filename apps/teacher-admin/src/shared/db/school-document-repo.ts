/**
 * Repository untuk SchoolDocument — CRUD generik infrastruktur WYSIWYG.
 *
 * WYSIWYG-DOC-01: tabel ke-15 di Dexie v9.
 *
 * Operasi:
 *   - save              : buat baru atau upsert (auto-generate id bila baru).
 *   - updateData        : update field `data` (payload dokumen).
 *   - updateLayout      : update orientation + meta.
 *   - setStatus         : draft → review → final.
 *   - markPrinted       : catat timestamp cetak.
 *   - findByCompositeKey: lookup unik berdasarkan composite key.
 *   - listByYear        : semua dokumen untuk academicYearId (+ filter optional).
 *   - listByDocType     : filter by docType + academicYearId.
 *   - listByTeacher     : semua dokumen milik guru di tahun ajaran tertentu.
 *   - softDelete        : set deletedAt (tidak hapus fisik).
 *   - purge             : hard delete permanen.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type {
  SchoolDocument,
  SchoolDocType,
  SchoolDocOrientation,
  DocumentStatus,
} from "@guru-admin/domain";
import { schoolDocumentCompositeKey } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Save (create / upsert)                                            */
/* ------------------------------------------------------------------ */

export async function saveSchoolDocument(args: {
  docType: SchoolDocType;
  semester: 1 | 2;
  tahunAjaran: string;
  kodeMapel?: string;
  kodeKelas?: string;
  teacherId: string;
  academicYearId: string;
  data?: Record<string, unknown>;
  orientation?: SchoolDocOrientation;
  meta?: Record<string, unknown>;
  status?: DocumentStatus;
}): Promise<SchoolDocument> {
  const entity = createEntity({
    docType: args.docType,
    semester: args.semester,
    tahunAjaran: args.tahunAjaran,
    kodeMapel: args.kodeMapel ?? "",
    kodeKelas: args.kodeKelas ?? "",
    teacherId: args.teacherId,
    academicYearId: args.academicYearId,
    data: args.data ?? {},
    orientation: args.orientation ?? "portrait",
    meta: args.meta ?? {},
    status: args.status ?? "draft",
    printedAt: null,
  }) as SchoolDocument;
  await saveEntity("schoolDocuments", entity);
  return entity;
}

/* ------------------------------------------------------------------ */
/*  Get by ID                                                         */
/* ------------------------------------------------------------------ */

export async function getSchoolDocument(id: string): Promise<SchoolDocument | undefined> {
  const doc = await db.schoolDocuments.get(id);
  return doc && !doc.deletedAt ? (doc as SchoolDocument) : undefined;
}

/* ------------------------------------------------------------------ */
/*  Update data (payload dokumen)                                     */
/* ------------------------------------------------------------------ */

export async function updateSchoolDocumentData(
  id: string,
  data: Record<string, unknown>
): Promise<SchoolDocument | undefined> {
  const existing = await getSchoolDocument(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, { data }) as SchoolDocument;
  await saveEntity("schoolDocuments", updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/*  Update layout (orientation + meta)                                */
/* ------------------------------------------------------------------ */

export async function updateSchoolDocumentLayout(
  id: string,
  layout: { orientation?: SchoolDocOrientation; meta?: Record<string, unknown> }
): Promise<SchoolDocument | undefined> {
  const existing = await getSchoolDocument(id);
  if (!existing) return undefined;
  const patch: Partial<SchoolDocument> = {};
  if (layout.orientation !== undefined) patch.orientation = layout.orientation;
  if (layout.meta !== undefined) patch.meta = layout.meta;
  const updated = updateEntityFields(existing, patch) as SchoolDocument;
  await saveEntity("schoolDocuments", updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/*  Set status (draft → review → final)                               */
/* ------------------------------------------------------------------ */

export async function setSchoolDocumentStatus(
  id: string,
  status: DocumentStatus
): Promise<SchoolDocument | undefined> {
  const existing = await getSchoolDocument(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, { status }) as SchoolDocument;
  await saveEntity("schoolDocuments", updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/*  Mark printed                                                      */
/* ------------------------------------------------------------------ */

export async function markSchoolDocumentPrinted(
  id: string
): Promise<SchoolDocument | undefined> {
  const existing = await getSchoolDocument(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, {
    printedAt: new Date().toISOString(),
  }) as SchoolDocument;
  await saveEntity("schoolDocuments", updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/*  Find by composite key                                             */
/* ------------------------------------------------------------------ */

export async function findSchoolDocumentByCompositeKey(args: {
  docType: SchoolDocType;
  semester: 1 | 2;
  tahunAjaran: string;
  kodeMapel?: string;
  kodeKelas?: string;
  teacherId: string;
}): Promise<SchoolDocument | undefined> {
  const key = schoolDocumentCompositeKey(args);
  const all = await db.schoolDocuments
    .where("docType")
    .equals(args.docType)
    .toArray();
  return all.find((doc) => {
    if (doc.deletedAt) return false;
    return schoolDocumentCompositeKey(doc) === key;
  }) as SchoolDocument | undefined;
}

/* ------------------------------------------------------------------ */
/*  List by academic year (opsional: filter semester/teacher)         */
/* ------------------------------------------------------------------ */

export async function listSchoolDocumentsByYear(args: {
  academicYearId: string;
  semester?: 1 | 2;
  teacherId?: string;
}): Promise<SchoolDocument[]> {
  const collection = db.schoolDocuments
    .where("academicYearId")
    .equals(args.academicYearId);

  const results = await collection.toArray();
  return results
    .filter((doc) => {
      if (doc.deletedAt) return false;
      if (args.semester !== undefined && doc.semester !== args.semester) return false;
      if (args.teacherId !== undefined && doc.teacherId !== args.teacherId) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as SchoolDocument[];
}

/* ------------------------------------------------------------------ */
/*  List by docType                                                   */
/* ------------------------------------------------------------------ */

export async function listSchoolDocumentsByType(args: {
  docType: SchoolDocType;
  academicYearId: string;
  semester?: 1 | 2;
}): Promise<SchoolDocument[]> {
  const results = await db.schoolDocuments
    .where("docType")
    .equals(args.docType)
    .toArray();
  return results
    .filter((doc) => {
      if (doc.deletedAt) return false;
      if (doc.academicYearId !== args.academicYearId) return false;
      if (args.semester !== undefined && doc.semester !== args.semester) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as SchoolDocument[];
}

/* ------------------------------------------------------------------ */
/*  List by teacher                                                   */
/* ------------------------------------------------------------------ */

export async function listSchoolDocumentsByTeacher(args: {
  teacherId: string;
  academicYearId: string;
  semester?: 1 | 2;
}): Promise<SchoolDocument[]> {
  const results = await db.schoolDocuments
    .where("teacherId")
    .equals(args.teacherId)
    .toArray();
  return results
    .filter((doc) => {
      if (doc.deletedAt) return false;
      if (doc.academicYearId !== args.academicYearId) return false;
      if (args.semester !== undefined && doc.semester !== args.semester) return false;
      return true;
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as SchoolDocument[];
}

/* ------------------------------------------------------------------ */
/*  Soft delete                                                       */
/* ------------------------------------------------------------------ */

export async function deleteSchoolDocument(id: string): Promise<void> {
  const existing = await getSchoolDocument(id);
  if (!existing) return;
  await saveEntity("schoolDocuments", softDelete(existing) as SchoolDocument);
}

/* ------------------------------------------------------------------ */
/*  Purge (hard delete) — hanya untuk cleanup eksplisit              */
/* ------------------------------------------------------------------ */

export async function purgeSchoolDocument(id: string): Promise<void> {
  await db.schoolDocuments.delete(id);
}
