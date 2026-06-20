/**
 * Data contoh SMPN 8 Bantan — untuk smoke test cepat.
 * Tombol "Pakai Data Contoh" di dashboard akan memanggil ini.
 */

import { saveSchoolProfile, saveTeacherProfile, saveAcademicYear } from "./profile-repo";
import { importCalendarFromJSON } from "./calendar-repo";
import { saveProtaProfile } from "./prota-repo";
import { saveTeachingSchedule } from "./teaching-schedule-repo";
import { saveClassRoster, importStudents } from "./class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "./profile-repo";

/** Jalankan seed data contoh SMPN 8 Bantan. */
export async function seedSampleData(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Profil sekolah
    await saveSchoolProfile({
      name: "SMPN 8 Bantan",
      npsn: "10452678",
      address: "Jl. Pendidikan No. 1, Bantan",
      village: "Bantan",
      district: "Bantan",
      regency: "Bengkalis",
      province: "Riau",
      postalCode: "28791",
      phone: "0766-123456",
      email: "smpn8bantan@example.com",
      headmasterName: "Drs. H. Suparman, M.Pd.",
      headmasterNip: "196512121986031005",
    });

    // 2. Profil guru
    await saveTeacherProfile({
      name: "Siti Aminah, S.Pd.",
      nip: "198503152010012005",
      email: "siti.aminah@example.com",
      phone: "0812-3456-7890",
      employeeStatus: "pns",
      subjects: [
        { subject: "Pendidikan Pancasila", grades: ["VII", "VIII"], phases: ["D"] },
      ],
    });

    // 3. Tahun pelajaran
    await saveAcademicYear({
      label: "2025/2026",
      startDate: "2025-07-14",
      endDate: "2026-06-13",
      semester1Start: "2025-07-14",
      semester1End: "2025-12-20",
      semester2Start: "2026-01-05",
      semester2End: "2026-06-13",
      active: true,
      sourceYearId: null,
    });

    const year = await getActiveAcademicYear();
    const teacher = await getTeacherProfile();
    if (!year || !teacher) throw new Error("Gagal membuat tahun/guru");

    // 4. Kalender
    const calendarJSON = {
      $schema: "guru-admin-flow/calendar/v1",
      academicYearLabel: "2025/2026",
      source: "Kemenag Bengkalis TP 2025/2026",
      events: [
        { startDate: "2025-07-14", endDate: "2025-07-19", type: "school_activity", label: "MPLS", scope: "ALL", blocksLearning: true },
        { startDate: "2025-07-21", endDate: "2025-12-19", type: "learning", label: "KBM Semester 1", scope: "ALL", blocksLearning: false },
        { startDate: "2025-08-17", endDate: "2025-08-17", type: "holiday", label: "HUT RI ke-80", scope: "ALL", blocksLearning: true },
        { startDate: "2025-12-22", endDate: "2026-01-04", type: "holiday", label: "Libur Semester", scope: "ALL", blocksLearning: true },
        { startDate: "2026-01-05", endDate: "2026-06-12", type: "learning", label: "KBM Semester 2", scope: "ALL", blocksLearning: false },
        { startDate: "2026-06-08", endDate: "2026-06-13", type: "report", label: "Penyerahan Rapor", scope: "ALL", blocksLearning: true },
      ],
    };
    await importCalendarFromJSON(calendarJSON, year.id);

    // 5. Prota
    await saveProtaProfile({
      academicYearId: year.id,
      teacherId: teacher.id,
      subject: "Pendidikan Pancasila",
      grade: "VII",
      phase: "D",
      annualIntraJP: 72,
      semester1IntraJP: 36,
      semester2IntraJP: 36,
      annualCocurricularJP: 36,
      semester1CocurricularJP: 18,
      semester2CocurricularJP: 18,
      status: "draft",
      sourceYearId: null,
      units: [
        { semester: 1, title: "Budaya Demokrasi", jp: 12, order: 1, code: "PP.7.1" },
        { semester: 1, title: "Keadilan Sosial", jp: 12, order: 2, code: "PP.7.2" },
        { semester: 1, title: "Persatuan dan Kesatuan", jp: 12, order: 3, code: "PP.7.3" },
        { semester: 2, title: "Berkebinekaan Global", jp: 12, order: 1, code: "PP.7.4" },
        { semester: 2, title: "Kemandirian", jp: 12, order: 2, code: "PP.7.5" },
        { semester: 2, title: "Gotong Royong", jp: 12, order: 3, code: "PP.7.6" },
      ],
    });

    // 6. Jadwal
    await saveTeachingSchedule({
      academicYearId: year.id,
      teacherId: teacher.id,
      subject: "Pendidikan Pancasila",
      classId: "VII A",
      classLabel: "VII A",
      dayOfWeek: 1,
      startPeriod: 1,
      durationJP: 2,
      startTime: "07:00",
      endTime: "08:20",
      semester: 1,
      source: "manual",
    });
    await saveTeachingSchedule({
      academicYearId: year.id,
      teacherId: teacher.id,
      subject: "Pendidikan Pancasila",
      classId: "VIII B",
      classLabel: "VIII B",
      dayOfWeek: 2,
      startPeriod: 4,
      durationJP: 2,
      startTime: "09:20",
      endTime: "10:40",
      semester: 1,
      source: "manual",
    });

    // 7. Roster
    const roster = await saveClassRoster({
      classId: "VII A",
      classLabel: "VII A",
      academicYearId: year.id,
      students: [],
    });
    await importStudents(roster.id, [
      { name: "Andi Saputra", number: 1 },
      { name: "Budi Pratama", number: 2 },
      { name: "Cici Lestari", number: 3 },
      { name: "Dedi Kurniawan", number: 4 },
      { name: "Eka Putri", number: 5 },
      { name: "Fajar Hidayat", number: 6 },
      { name: "Gita Maharani", number: 7 },
      { name: "Hadi Wijaya", number: 8 },
      { name: "Indah Permata", number: 9 },
      { name: "Joko Susilo", number: 10 },
    ]);

    return { success: true, message: "Data contoh SMPN 8 Bantan berhasil dimuat. Lengkapi dengan generate sesi di menu Jadwal." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal memuat data contoh." };
  }
}
