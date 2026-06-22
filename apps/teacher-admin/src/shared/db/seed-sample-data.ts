/**
 * Data contoh SMPN 8 Bantan — untuk smoke test cepat.
 * Tombol "Pakai Data Contoh" di dashboard akan memanggil ini.
 *
 * APP-USABLE-RC1 Issue 6: seed lengkap untuk semua menu utama:
 *   1. Profil sekolah + guru
 *   2. Tahun pelajaran
 *   3. Kalender
 *   4. Prota (Program Tahunan)
 *   5. Jadwal mengajar
 *   6. Roster siswa (2 kelas)
 *   7. Data Mengajar (2 assignment via auto-gen dari jadwal)
 *   8. ATP/TP (2 entry)
 *   9. LKPD (1 entry, draft)
 *  10. Generate LessonSession dari jadwal+kalender
 */

import { saveSchoolProfile, saveTeacherProfile, saveAcademicYear, getActiveAcademicYear, getTeacherProfile } from "./profile-repo";
import { importCalendarFromJSON } from "./calendar-repo";
import { saveProtaProfile } from "./prota-repo";
import { saveTeachingSchedule, listTeachingSchedules } from "./teaching-schedule-repo";
import { saveClassRoster, importStudents } from "./class-roster-repo";
import { autoGenerateFromSchedules } from "./teaching-assignment-repo";
import { saveATPEntry } from "./atp-entry-repo";
import { saveLKPD } from "./lkpd-repo";
import { generateAndSaveLessonSessions } from "./lesson-session-repo";
import { listCalendarEvents } from "./calendar-repo";

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

    // 5. Prota (Program Tahunan)
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

    // 6. Jadwal mengajar (2 jadwal: VII A Senin, VIII B Selasa)
    await saveTeachingSchedule({
      academicYearId: year.id,
      teacherId: teacher.id,
      subject: "Pendidikan Pancasila",
      classId: "VII A",
      classLabel: "VII A",
      dayOfWeek: 1, // Senin
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
      dayOfWeek: 2, // Selasa
      startPeriod: 4,
      durationJP: 2,
      startTime: "09:20",
      endTime: "10:40",
      semester: 1,
      source: "manual",
    });

    // 7. Roster siswa (2 kelas)
    const roster7A = await saveClassRoster({
      classId: "VII A",
      classLabel: "VII A",
      academicYearId: year.id,
      students: [],
    });
    await importStudents(roster7A.id, [
      { name: "Andi Saputra", number: 1, nis: "2025001" },
      { name: "Budi Pratama", number: 2, nis: "2025002" },
      { name: "Cici Lestari", number: 3, nis: "2025003" },
      { name: "Dedi Kurniawan", number: 4, nis: "2025004" },
      { name: "Eka Putri", number: 5, nis: "2025005" },
      { name: "Fajar Hidayat", number: 6, nis: "2025006" },
      { name: "Gita Maharani", number: 7, nis: "2025007" },
      { name: "Hadi Wijaya", number: 8, nis: "2025008" },
      { name: "Indah Permata", number: 9, nis: "2025009" },
      { name: "Joko Susilo", number: 10, nis: "2025010" },
    ]);

    const roster8B = await saveClassRoster({
      classId: "VIII B",
      classLabel: "VIII B",
      academicYearId: year.id,
      students: [],
    });
    await importStudents(roster8B.id, [
      { name: "Kartika Sari", number: 1, nis: "2025011" },
      { name: "Lukman Hakim", number: 2, nis: "2025012" },
      { name: "Mira Anggraini", number: 3, nis: "2025013" },
      { name: "Nanda Putra", number: 4, nis: "2025014" },
      { name: "Oka Pradana", number: 5, nis: "2025015" },
    ]);

    // 8. Data Mengajar (auto-gen dari jadwal)
    const schedules = await listTeachingSchedules(year.id);
    const asgResult = await autoGenerateFromSchedules({
      academicYear: year,
      teacher,
      schedules,
      semester: 1,
    });

    // 9. ATP/TP (2 entry)
    const atp1 = await saveATPEntry({
      academicYearId: year.id,
      teacherId: teacher.id,
      teacherName: teacher.name,
      subject: "Pendidikan Pancasila",
      grade: "VII",
      phase: "D",
      bab: "1",
      elemen: "Norma",
      cp: "Peserta didik mampu memahami norma-norma yang berlaku dalam kehidupan bermasyarakat, berbangsa, dan bernegara.",
      tp: "Peserta didik mampu mengidentifikasi jenis-jenis norma yang berlaku di masyarakat dan memberikan contoh penerapannya.",
      profilPelajar: "Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia",
      kataKunci: "norma, hukum, agama, kesusilaan, sopan santun",
      alokasiJP: 4,
      status: "draft",
    });

    await saveATPEntry({
      academicYearId: year.id,
      teacherId: teacher.id,
      teacherName: teacher.name,
      subject: "Pendidikan Pancasila",
      grade: "VII",
      phase: "D",
      bab: "2",
      elemen: "Norma",
      cp: "Peserta didik mampu memahami norma-norma yang berlaku dalam kehidupan bermasyarakat, berbangsa, dan bernegara.",
      tp: "Peserta didik mampu menganalisis dampak pelanggaran norma bagi kehidupan bermasyarakat.",
      profilPelajar: "Gotong Royong",
      kataKunci: "pelanggaran, sanksi, dampak, sosial",
      alokasiJP: 4,
      status: "draft",
    });

    // 10. LKPD (1 draft)
    await saveLKPD({
      academicYearId: year.id,
      teacherId: teacher.id,
      teacherName: teacher.name,
      subject: "Pendidikan Pancasila",
      grade: "VII",
      classId: "VII A",
      classLabel: "VII A",
      atpEntryId: atp1.id,
      tp: atp1.tp,
      title: "LKPD Norma dalam Kehidupan Masyarakat",
      objective: "Peserta didik mampu mengidentifikasi 4 jenis norma (agama, kesusilaan, kesopanan, hukum) dan memberikan contoh penerapannya dalam kehidupan sehari-hari.",
      materials: "Buku Pendidikan Pancasila Kelas VII, LKPD, pulpen, kertas flap untuk presentasi.",
      steps: "1. Guru membuka dengan pertanyaan: \"Apa yang terjadi bila tidak ada norma di masyarakat?\"\n2. Peserta didik berdiskusi kelompok (4-5 orang) mengidentifikasi 4 jenis norma.\n3. Setiap kelompok membuat contoh penerapan norma di sekolah dan di rumah.\n4. Perwakilan kelompok presentasi.\n5. Guru dan peserta didik menyimpulkan bersama.",
      guidingQuestions: "1. Apa yang dimaksud dengan norma?\n2. Sebutkan 4 jenis norma yang berlaku di masyarakat!\n3. Berikan contoh penerapan norma agama di sekolah!\n4. Mengapa norma hukum perlu ditegakkan?",
      assessment: "Observasi partisipasi diskusi (rubrik), hasil presentasi kelompok, kelengkapan contoh penerapan norma.",
      notes: "LKPD ini disesuaikan untuk kelas VII A. Bisa diadaptasi untuk VIII B dengan menambahkan contoh kasus yang lebih kompleks.",
      status: "draft",
    });

    // 11. Generate LessonSession dari jadwal+kalender
    const calendar = await listCalendarEvents(year.id);
    const generateResult = await generateAndSaveLessonSessions({
      academicYear: year,
      schedules,
      calendar,
      semester: 1,
      teacherId: teacher.id,
    });

    const sessionCount = generateResult.summary?.totalSessions ?? 0;

    return {
      success: true,
      message: `Data contoh berhasil dimuat. ${asgResult.created.length} Data Mengajar dibuat. ${sessionCount} sesi mengajar ter-generate. Coba mulai dari menu Hari Ini atau Absen.`,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Gagal memuat data contoh." };
  }
}
