/**
 * Business rules lintas entitas.
 * Sumber: docs/DATA_MODEL_DRAFT.md §13 (Buat Tahun Baru), §14 (validasi)
 */

import type { AcademicYear, SchoolProfile, TeacherProfile, ProtaProfile, ProtaUnit, TeachingSchedule } from "./index";

/** Tipe yang sudah di-strip field BaseEntity. */
type NewEntity<T> = Omit<T, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">;

/**
 * ProtaProfile baru hasil salinan tahun lalu.
 * units juga di-strip field BaseEntity-nya.
 */
type NewProtaProfile = Omit<NewEntity<ProtaProfile>, "units"> & {
  units: Omit<NewEntity<ProtaUnit>, never>[];
};

/**
 * Aturan: hanya boleh ada satu AcademicYear dengan active=true.
 * Lihat docs/DATA_MODEL_DRAFT.md §1 (validasi AcademicYear).
 */
export function ensureSingleActiveYear(
  years: AcademicYear[],
  activeId?: string
): { valid: boolean; conflictIds: string[] } {
  const activeYears = years.filter((y) => y.active && y.id !== activeId);
  return {
    valid: activeYears.length === 0,
    conflictIds: activeYears.map((y) => y.id),
  };
}

/**
 * Aturan "Buat Tahun Baru dari Tahun Lalu".
 * Lihat docs/DATA_MODEL_DRAFT.md §13.
 *
 * Fungsi ini PURE: menerima data lama, mengembalikan data baru (tanpa id final).
 * Pemanggil wajib assign id final + createdAt + updatedAt sebelum persist.
 *
 * Catatan: schoolProfile & teacherProfile tidak disalin di sini karena di MVP v1
 * keduanya single-row (id konstan). Mereka cukup di-referensi. Parameter disediakan
 * untuk dokumentasi & validasi masa depan (multi-sekolah).
 */
export function planNewYearFromPrevious(args: {
  sourceYear: AcademicYear;
  newLabel: string;
  newStartDate: string;
  newEndDate: string;
  newSemester1Start: string;
  newSemester1End: string;
  newSemester2Start: string;
  newSemester2End: string;
  schoolProfile: SchoolProfile;
  teacherProfile: TeacherProfile;
  protaProfiles: ProtaProfile[];
  teachingSchedules: TeachingSchedule[];
}): {
  newYear: NewEntity<AcademicYear>;
  newProtaProfiles: NewProtaProfile[];
  newTeachingSchedules: NewEntity<TeachingSchedule>[];
} {
  // schoolProfile & teacherProfile disediakan untuk validasi masa depan
  // (multi-sekolah), di MVP v1 keduanya single-row.
  void args.schoolProfile;
  void args.teacherProfile;
  const { sourceYear, newLabel, protaProfiles, teachingSchedules } = args;

  // 1. Buat AcademicYear baru
  const newYear = {
    label: newLabel,
    startDate: args.newStartDate,
    endDate: args.newEndDate,
    semester1Start: args.newSemester1Start,
    semester1End: args.newSemester1End,
    semester2Start: args.newSemester2Start,
    semester2End: args.newSemester2End,
    active: true,
    sourceYearId: sourceYear.id,
  };

  // 2. Salin ProtaProfile + ProtaUnit (id baru akan di-assign oleh caller)
  const newProtaProfiles: NewProtaProfile[] = protaProfiles
    .filter((p) => p.academicYearId === sourceYear.id)
    .map((p): NewProtaProfile => ({
      academicYearId: "", // akan di-assign caller
      subject: p.subject,
      grade: p.grade,
      phase: p.phase,
      teacherId: p.teacherId,
      annualIntraJP: p.annualIntraJP,
      semester1IntraJP: p.semester1IntraJP,
      semester2IntraJP: p.semester2IntraJP,
      annualCocurricularJP: p.annualCocurricularJP,
      semester1CocurricularJP: p.semester1CocurricularJP,
      semester2CocurricularJP: p.semester2CocurricularJP,
      units: p.units.map((u): NewEntity<ProtaUnit> => ({
        protaProfileId: "", // akan di-assign caller
        semester: u.semester,
        title: u.title,
        learningOutcome: u.learningOutcome,
        jp: u.jp,
        order: u.order,
        code: u.code,
      })),
      status: "draft",
      sourceYearId: p.id,
      notes: p.notes,
    }));

  // 3. Salin TeachingSchedule (id baru akan di-assign oleh caller)
  const newTeachingSchedules: NewEntity<TeachingSchedule>[] = teachingSchedules
    .filter((s) => s.academicYearId === sourceYear.id)
    .map((s): NewEntity<TeachingSchedule> => ({
      academicYearId: "", // akan di-assign caller
      teacherId: s.teacherId,
      subject: s.subject,
      classId: s.classId,
      classLabel: s.classLabel,
      dayOfWeek: s.dayOfWeek,
      startPeriod: s.startPeriod,
      durationJP: s.durationJP,
      startTime: s.startTime,
      endTime: s.endTime,
      semester: s.semester,
      source: "manual", // jadwal perlu dikonfirmasi ulang
      notes: s.notes,
    }));

  // 4. Yang DIKOSONGKAN (tidak disalin):
  //    - CalendarEvent (diimpor ulang oleh guru)
  //    - LessonSession, AttendanceRecord, ClassRoster (realisasi)
  //    - TeachingJournal (realisasi)
  //    - SemesterReport (realisasi)
  //    - DocumentSnapshot (snapshot tahun lama tetap utuh)

  return { newYear, newProtaProfiles, newTeachingSchedules };
}
