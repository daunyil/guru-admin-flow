/**
 * Repository untuk modul M03 Prota (ProtaProfile + ProtaUnit).
 * Sumber: docs/SPRINT_2_DESIGN.md §4
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, softDelete } from "./crud";
import type { ProtaProfile, ProtaUnit, DocumentSnapshot } from "@guru-admin/domain";
import { validateProtaImport, protaImportToProfile } from "@guru-admin/domain";
import { uuid, nowTimestamp } from "@guru-admin/shared";

/** List ProtaProfile untuk academicYearId (yang tidak di-soft-delete). */
export async function listProtaProfiles(academicYearId: string): Promise<ProtaProfile[]> {
  const all = await db.protaProfiles
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  const active = all.filter((p) => !p.deletedAt);

  const result: ProtaProfile[] = [];
  for (const p of active) {
    const units = await db.protaUnits
      .where("protaProfileId")
      .equals(p.id)
      .toArray();
    result.push({
      ...(p as ProtaProfile),
      units: units
        .filter((u) => !u.deletedAt)
        .sort((a, b) => a.semester - b.semester || a.order - b.order) as ProtaUnit[],
    });
  }
  return result;
}

/** Get ProtaProfile by id (with units re-attached). */
export async function getProtaProfile(id: string): Promise<ProtaProfile | undefined> {
  const profile = await db.protaProfiles.get(id);
  if (!profile || profile.deletedAt) return undefined;

  const units = await db.protaUnits
    .where("protaProfileId")
    .equals(id)
    .toArray();
  return {
    ...(profile as ProtaProfile),
    units: units
      .filter((u) => !u.deletedAt)
      .sort((a, b) => a.semester - b.semester || a.order - b.order) as ProtaUnit[],
  };
}

/** Cari ProtaProfile by (subject, grade, academicYearId). */
export async function findProtaProfile(
  academicYearId: string,
  subject: string,
  grade: string
): Promise<ProtaProfile | undefined> {
  const all = await listProtaProfiles(academicYearId);
  return all.find((p) => p.subject === subject && p.grade === grade);
}

/** Simpan ProtaProfile baru (dengan units). */
export async function saveProtaProfile(
  data: Omit<ProtaProfile, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "units"> & {
    units: Array<Omit<ProtaUnit, "id" | "protaProfileId" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">>;
  }
): Promise<ProtaProfile> {
  const profileId = uuid();

  const profileBase = createEntity({ ...data, units: [] }) as ProtaProfile;
  const profileRow: ProtaProfile = { ...profileBase, id: profileId, units: [] };

  const now = nowTimestamp();
  const units: ProtaUnit[] = data.units.map((u) => ({
    ...u,
    id: uuid(),
    protaProfileId: profileId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only" as const,
  }) as ProtaUnit);

  await db.transaction("rw", [db.protaProfiles, db.protaUnits], async () => {
    await db.protaProfiles.put(profileRow);
    for (const u of units) {
      await db.protaUnits.put(u);
    }
  });

  return { ...profileRow, units };
}

/** Update ProtaProfile (field identity saja, bukan units). */
export async function updateProtaProfile(
  id: string,
  patch: Partial<ProtaProfile>
): Promise<ProtaProfile | undefined> {
  const existing = await getProtaProfile(id);
  if (!existing) return undefined;
  // Handle units explicitly (units disimpan terpisah di tabel protaUnits)
  const patchCopy: Record<string, unknown> = { ...patch };
  delete patchCopy.units;

  const updated = updateEntityFields(existing as ProtaProfile, patchCopy as Partial<ProtaProfile>) as ProtaProfile;
  // Save row tanpa units (units disimpan terpisah di tabel protaUnits)
  const { units: __units, ...rowWithoutUnits } = updated;
  void __units;
  await db.protaProfiles.put(rowWithoutUnits as ProtaProfile);
  return updated;
}

/** Tambah/update unit ke ProtaProfile. */
export async function saveProtaUnit(
  protaProfileId: string,
  data: Omit<ProtaUnit, "id" | "protaProfileId" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus"> & {
    id?: string;
  }
): Promise<ProtaUnit> {
  let unit: ProtaUnit;
  if (data.id) {
    const existing = await db.protaUnits.get(data.id);
    if (!existing) throw new Error(`Unit ${data.id} tidak ditemukan`);
    const { id: _id, ...patch } = data;
    void _id;
    unit = updateEntityFields(existing as ProtaUnit, patch as Partial<ProtaUnit>) as ProtaUnit;
  } else {
    const { id: _omit, ...unitData } = data;
    void _omit;
    unit = createEntity({ ...unitData, protaProfileId }) as unknown as ProtaUnit;
  }
  await db.protaUnits.put(unit);
  return unit;
}

/** Hapus unit (soft delete). */
export async function deleteProtaUnit(id: string): Promise<void> {
  const existing = await db.protaUnits.get(id);
  if (!existing) return;
  await db.protaUnits.put(softDelete(existing as ProtaUnit) as ProtaUnit);
}

/** Hapus ProtaProfile + semua units (soft delete). */
export async function deleteProtaProfile(id: string): Promise<void> {
  const existing = await getProtaProfile(id);
  if (!existing) return;
  await db.transaction("rw", [db.protaProfiles, db.protaUnits], async () => {
    await db.protaProfiles.put(softDelete(existing as ProtaProfile) as ProtaProfile);
    for (const u of existing.units) {
      await db.protaUnits.put(softDelete(u as ProtaUnit) as ProtaUnit);
    }
  });
}

/** Ubah status ProtaProfile (draft → ready_for_review → final → revised/locked). */
export async function setProtaProfileStatus(
  id: string,
  status: ProtaProfile["status"]
): Promise<ProtaProfile | undefined> {
  const updated = await updateProtaProfile(id, { status });
  if (!updated) return undefined;

  // Buat snapshot bila transisi ke final
  if (status === "final" || status === "locked") {
    await createProtaSnapshot(updated);
  }
  return updated;
}

/** Buat DocumentSnapshot untuk ProtaProfile (saat transisi ke final/locked). */
async function createProtaSnapshot(profile: ProtaProfile): Promise<void> {
  const now = nowTimestamp();
  const snapshot: DocumentSnapshot = {
    id: uuid(),
    entityType: "prota",
    entityId: profile.id,
    status: profile.status,
    snapshotData: JSON.stringify(profile),
    snapshotAt: now,
    snapshotBy: profile.teacherId,
    reason: `Status berubah ke ${profile.status}`,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only",
  };
  await db.documentSnapshots.put(snapshot);
}

/**
 * Impor Prota dari JSON (format guru-admin-flow/prota/v1).
 */
export async function importProtaFromJSON(
  jsonInput: unknown,
  academicYearId: string,
  teacherId: string
): Promise<{ success: boolean; profile?: ProtaProfile; errors: string[] }> {
  const validation = validateProtaImport(jsonInput);
  if (!validation.success) {
    return { success: false, errors: validation.errors };
  }

  const { profile: profileDataRaw, units: unitsData } = protaImportToProfile(validation.data);
  const { units: _omitUnits, ...profileData } = profileDataRaw;
  void _omitUnits;
  const saved = await saveProtaProfile({
    ...profileData,
    academicYearId,
    teacherId,
    units: unitsData as unknown as Array<Omit<ProtaUnit, "id" | "protaProfileId" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">>,
  });
  return { success: true, profile: saved, errors: [] };
}
