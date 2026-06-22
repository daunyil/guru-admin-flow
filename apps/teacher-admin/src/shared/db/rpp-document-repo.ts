/**
 * Repository untuk RppDocument (arsip RPP hasil bulk identity replacement).
 *
 * GENERATOR-COMPLETION-RC1 Phase 1.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { RppDocument, RppIdentityContext } from "@guru-admin/domain";
import { replaceRppIdentityPlaceholders } from "@guru-admin/domain";

/** List RppDocument untuk academicYearId + teacherId. */
export async function listRppDocuments(args: {
  academicYearId: string;
  teacherId: string;
}): Promise<RppDocument[]> {
  const all = await db.rppDocuments
    .where("academicYearId")
    .equals(args.academicYearId)
    .toArray();
  return all
    .filter((r) => !r.deletedAt && r.teacherId === args.teacherId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) as RppDocument[];
}

/** Get RppDocument by id. */
export async function getRppDocument(id: string): Promise<RppDocument | undefined> {
  const r = await db.rppDocuments.get(id);
  return r && !r.deletedAt ? (r as RppDocument) : undefined;
}

/**
 * Process & save RPP document:
 *   1. Apply replaceRppIdentityPlaceholders ke originalContent.
 *   2. Save originalContent + processedContent + contextSnapshot.
 */
export async function saveRppDocument(args: {
  academicYearId: string;
  teacherId: string;
  teacherName?: string;
  assignmentId?: string | null;
  subject?: string;
  classLabel?: string;
  semester?: 1 | 2;
  originalContent: string;
  context: RppIdentityContext;
  source: "upload" | "paste";
  filename?: string;
}): Promise<RppDocument> {
  const processedContent = replaceRppIdentityPlaceholders(args.originalContent, args.context);
  const entity = createEntity({
    academicYearId: args.academicYearId,
    teacherId: args.teacherId,
    teacherName: args.teacherName,
    assignmentId: args.assignmentId ?? null,
    subject: args.subject,
    classLabel: args.classLabel,
    semester: args.semester,
    originalContent: args.originalContent,
    processedContent,
    source: args.source,
    filename: args.filename ?? null,
    contextSnapshot: args.context,
    status: "draft",
  }) as RppDocument;
  await saveEntity("rppDocuments", entity);
  return entity;
}

/** Update RppDocument. */
export async function updateRppDocument(
  id: string,
  patch: Partial<RppDocument>
): Promise<RppDocument | undefined> {
  const existing = await getRppDocument(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch) as RppDocument;
  await saveEntity("rppDocuments", updated);
  return updated;
}

/** Soft delete. */
export async function deleteRppDocument(id: string): Promise<void> {
  const existing = await getRppDocument(id);
  if (!existing) return;
  await saveEntity("rppDocuments", softDelete(existing) as RppDocument);
}

/**
 * Re-process: ulang replace placeholder dengan context baru.
 * Dipakai bila guru update context identitas dan ingin re-apply ke dokumen lama.
 */
export async function reprocessRppDocument(
  id: string,
  newContext: RppIdentityContext
): Promise<RppDocument | undefined> {
  const existing = await getRppDocument(id);
  if (!existing) return undefined;
  const processedContent = replaceRppIdentityPlaceholders(existing.originalContent, newContext);
  const updated = updateEntityFields(existing, {
    processedContent,
    contextSnapshot: newContext,
  }) as RppDocument;
  await saveEntity("rppDocuments", updated);
  return updated;
}
