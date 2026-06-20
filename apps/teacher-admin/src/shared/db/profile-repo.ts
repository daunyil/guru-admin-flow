/**
 * Repository untuk modul M01 Profil (SchoolProfile, TeacherProfile, AcademicYear).
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, saveEntity, listEntities, getEntity } from "./crud";
import {
  SCHOOL_PROFILE_ID,
  TEACHER_PROFILE_ID,
  type SchoolProfile,
  type TeacherProfile,
  type AcademicYear,
  type ProtaProfile,
  type TeachingSchedule,
} from "@guru-admin/domain";
import { ensureSingleActiveYear, planNewYearFromPrevious } from "@guru-admin/domain";
import { uuid, nowTimestamp } from "@guru-admin/shared";

/* ------------------------------------------------------------------ */
/*  SchoolProfile                                                     */
/* ------------------------------------------------------------------ */

export async function getSchoolProfile(): Promise<SchoolProfile | undefined> {
  return getEntity<SchoolProfile>("schoolProfile", SCHOOL_PROFILE_ID);
}

export async function saveSchoolProfile(
  data: Omit<SchoolProfile, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<SchoolProfile> {
  const existing = await getSchoolProfile();
  let entity: SchoolProfile;
  if (existing) {
    entity = updateEntityFields(existing, data);
  } else {
    entity = {
      ...createEntity(data),
      id: SCHOOL_PROFILE_ID, // override id jadi konstan
    } as SchoolProfile;
  }
  await saveEntity("schoolProfile", entity);
  return entity;
}

/* ------------------------------------------------------------------ */
/*  TeacherProfile                                                    */
/* ------------------------------------------------------------------ */

export async function getTeacherProfile(): Promise<TeacherProfile | undefined> {
  return getEntity<TeacherProfile>("teacherProfile", TEACHER_PROFILE_ID);
}

export async function saveTeacherProfile(
  data: Omit<TeacherProfile, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<TeacherProfile> {
  const existing = await getTeacherProfile();
  let entity: TeacherProfile;
  if (existing) {
    entity = updateEntityFields(existing, data);
  } else {
    entity = {
      ...createEntity(data),
      id: TEACHER_PROFILE_ID,
    } as TeacherProfile;
  }
  await saveEntity("teacherProfile", entity);
  return entity;
}

/* ------------------------------------------------------------------ */
/*  AcademicYear                                                      */
/* ------------------------------------------------------------------ */

export async function listAcademicYears(): Promise<AcademicYear[]> {
  return listEntities<AcademicYear>("academicYears");
}

export async function getActiveAcademicYear(): Promise<AcademicYear | undefined> {
  const years = await listAcademicYears();
  return years.find((y) => y.active);
}

export async function getAcademicYear(id: string): Promise<AcademicYear | undefined> {
  return getEntity<AcademicYear>("academicYears", id);
}

export async function saveAcademicYear(
  data: Omit<AcademicYear, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">
): Promise<AcademicYear> {
  // Validasi: hanya satu yang active
  if (data.active) {
    const years = await listAcademicYears();
    const check = ensureSingleActiveYear(years);
    if (!check.valid) {
      // Deactivate yang lain
      await db.transaction("rw", db.academicYears, async () => {
        for (const conflictId of check.conflictIds) {
          const y = years.find((yy) => yy.id === conflictId);
          if (y) {
            await saveEntity("academicYears", updateEntityFields(y, { active: false }));
          }
        }
      });
    }
  }

  const entity = createEntity(data) as AcademicYear;
  await saveEntity("academicYears", entity);
  return entity;
}

export async function updateAcademicYear(
  id: string,
  patch: Partial<AcademicYear>
): Promise<AcademicYear | undefined> {
  const existing = await getAcademicYear(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, patch);
  await saveEntity("academicYears", updated);
  return updated;
}

export async function setActiveAcademicYear(id: string): Promise<void> {
  const years = await listAcademicYears();
  await db.transaction("rw", db.academicYears, async () => {
    for (const y of years) {
      const newActive = y.id === id;
      if (y.active !== newActive) {
        await saveEntity("academicYears", updateEntityFields(y, { active: newActive }));
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Wizard: Buat Tahun Pelajaran Baru dari Tahun Lalu               */
/* ------------------------------------------------------------------ */

export interface NewYearPlan {
  newYear: AcademicYear;
  newProtaProfiles: ProtaProfile[];
  newTeachingSchedules: TeachingSchedule[];
}

/**
 * Eksekusi wizard "Buat Tahun Pelajaran Baru".
 * Mengikuti aturan di docs/DATA_MODEL_DRAFT.md §13:
 *   - Salin profil (single-row, id konstan)
 *   - Salin ProtaProfile + ProtaUnit (id baru, status draft)
 *   - Salin TeachingSchedule (id baru, source: manual)
 *   - KOSONGKAN: CalendarEvent, LessonSession, AttendanceRecord, ClassRoster,
 *     TeachingJournal, SemesterReport, DocumentSnapshot
 *   - Tahun lama di-set active=false, tahun baru active=true
 */
export async function createNewYearFromPrevious(args: {
  sourceYearId: string;
  newLabel: string;
  newStartDate: string;
  newEndDate: string;
  newSemester1Start: string;
  newSemester1End: string;
  newSemester2Start: string;
  newSemester2End: string;
}): Promise<NewYearPlan> {
  const sourceYear = await getAcademicYear(args.sourceYearId);
  if (!sourceYear) {
    throw new Error(`Tahun pelajaran sumber tidak ditemukan: ${args.sourceYearId}`);
  }

  const schoolProfile = await getSchoolProfile();
  const teacherProfile = await getTeacherProfile();
  if (!schoolProfile || !teacherProfile) {
    throw new Error("Profil sekolah dan profil guru wajib diisi sebelum membuat tahun baru.");
  }

  // Get data tahun lama yang akan disalin
  const allProta = await listEntities<ProtaProfile>("protaProfiles");
  const allSchedules = await listEntities<TeachingSchedule>("teachingSchedules");

  const plan = planNewYearFromPrevious({
    sourceYear,
    newLabel: args.newLabel,
    newStartDate: args.newStartDate,
    newEndDate: args.newEndDate,
    newSemester1Start: args.newSemester1Start,
    newSemester1End: args.newSemester1End,
    newSemester2Start: args.newSemester2Start,
    newSemester2End: args.newSemester2End,
    schoolProfile,
    teacherProfile,
    protaProfiles: allProta,
    teachingSchedules: allSchedules,
  });

  const now = nowTimestamp();

  // Assign id final + base fields untuk AcademicYear baru
  const newYearId = uuid();
  const newYear: AcademicYear = {
    ...plan.newYear,
    id: newYearId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only",
  };

  // Assign id final + base fields untuk ProtaProfile + ProtaUnit
  const newProtaProfiles: ProtaProfile[] = plan.newProtaProfiles.map((p) => {
    const protaId = uuid();
    return {
      ...p,
      academicYearId: newYearId,
      id: protaId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncStatus: "local_only",
      units: p.units.map((u) => ({
        ...u,
        protaProfileId: protaId,
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        syncStatus: "local_only",
      })),
    } as ProtaProfile;
  });

  // Assign id final + base fields untuk TeachingSchedule
  const newTeachingSchedules: TeachingSchedule[] = plan.newTeachingSchedules.map((s) => ({
    ...s,
    academicYearId: newYearId,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: "local_only",
  } as TeachingSchedule));

  // Eksekusi transaksi
  await db.transaction(
    "rw",
    [db.academicYears, db.protaProfiles, db.protaUnits, db.teachingSchedules],
    async () => {
      // 1. Set tahun lama jadi inactive
      const years = await listAcademicYears();
      for (const y of years) {
        if (y.active) {
          await saveEntity("academicYears", updateEntityFields(y, { active: false }));
        }
      }

      // 2. Simpan tahun baru
      await saveEntity("academicYears", newYear);

      // 3. Simpan ProtaProfile + ProtaUnit baru
      for (const p of newProtaProfiles) {
        await saveEntity("protaProfiles", p);
        for (const u of p.units) {
          await saveEntity("protaUnits", u);
        }
      }

      // 4. Simpan TeachingSchedule baru
      for (const s of newTeachingSchedules) {
        await saveEntity("teachingSchedules", s);
      }
    }
  );

  return { newYear, newProtaProfiles, newTeachingSchedules };
}
