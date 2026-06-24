/**
 * Repository untuk RppDocument (arsip RPP hasil bulk identity replacement).
 *
 * GENERATOR-COMPLETION-RC1 Phase 1.
 * GENERATOR-COMPLETION-RC1-PATCH-1: + literalReplacements support.
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, softDelete } from "./crud";
import type { RppDocument, RppIdentityContext, LiteralReplacement, DocumentIdentityKind } from "@guru-admin/domain";
import { applyAllReplacements } from "@guru-admin/domain";

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
 *   1. Apply applyAllReplacements (placeholder + literal) ke originalContent.
 *   2. Save originalContent + processedContent + contextSnapshot + literalReplacements.
 *
 * RC1-PATCH-1: literalReplacements optional, default [].
 */
export async function saveRppDocument(args: {
  academicYearId: string;
  teacherId: string;
  teacherName?: string;
  assignmentId?: string | null;
  subject?: string;
  classLabel?: string;
  semester?: 1 | 2;
  documentKind?: DocumentIdentityKind;
  originalContent: string;
  context: RppIdentityContext;
  literalReplacements?: LiteralReplacement[];
  source: "upload" | "paste";
  filename?: string;
}): Promise<RppDocument> {
  const literalReplacements = args.literalReplacements ?? [];
  const processedContent = applyAllReplacements(
    args.originalContent,
    args.context,
    literalReplacements
  );
  const entity = createEntity({
    academicYearId: args.academicYearId,
    teacherId: args.teacherId,
    teacherName: args.teacherName,
    assignmentId: args.assignmentId ?? null,
    subject: args.subject,
    classLabel: args.classLabel,
    semester: args.semester,
    documentKind: args.documentKind ?? "rpp",
    originalContent: args.originalContent,
    processedContent,
    source: args.source,
    filename: args.filename ?? null,
    contextSnapshot: args.context,
    literalReplacements,
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
 * Re-process: ulang replace placeholder + literal dengan context + literalReplacements baru.
 */
export async function reprocessRppDocument(
  id: string,
  newContext: RppIdentityContext,
  newLiteralReplacements?: LiteralReplacement[]
): Promise<RppDocument | undefined> {
  const existing = await getRppDocument(id);
  if (!existing) return undefined;
  const literalReplacements = newLiteralReplacements ?? existing.literalReplacements ?? [];
  const processedContent = applyAllReplacements(
    existing.originalContent,
    newContext,
    literalReplacements
  );
  const updated = updateEntityFields(existing, {
    processedContent,
    contextSnapshot: newContext,
    literalReplacements,
  }) as RppDocument;
  await saveEntity("rppDocuments", updated);
  return updated;
}
