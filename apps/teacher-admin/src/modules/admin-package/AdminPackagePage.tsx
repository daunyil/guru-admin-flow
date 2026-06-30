/**
 * Paket Administrasi Guru — halaman pusat dokumen per Kelas dan Mapel.
 *
 * GENERATOR-COMPLETION-RC1 Phase 6.
 *
 * Pilih Kelas dan Mapel → app tampilkan checklist 14 dokumen administrasi
 * dengan status lengkap/belum lengkap + tombol preview per dokumen.
 *
 * Dokumen yang dicek:
 *   1. Program Tahunan (Prota)
 *   2. Program Semester (Promes)
 *   3. Bank TP (ATP)
 *   4. Kalender Pendidikan
 *   5. Jadwal Mengajar
 *   6. Daftar Siswa (Roster)
 *   7. Absensi (AttendanceRecord)
 *   8. Jurnal Mengajar
 *   9. Daftar Nilai (GradeBook)
 *  10. Program Remedial
 *  11. Program Pengayaan
 *  12. LKPD
 *  13. RPP (arsip RppDocument)
 *  14. Laporan Akhir Semester
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge, Select, InfoCard, Input, Textarea } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { listTeachingSchedules } from "../../shared/db/teaching-schedule-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import { listLessonSessions } from "../../shared/db/lesson-session-repo";
import { listJournals } from "../../shared/db/journal-repo";
import { findGradeBook } from "../../shared/db/gradebook-repo";
import { listATPEntries } from "../../shared/db/atp-entry-repo";
import { listLKPDs } from "../../shared/db/lkpd-repo";
import { listRppDocuments } from "../../shared/db/rpp-document-repo";
import { listRemedialPrograms } from "../../shared/db/remedial-repo";
import { listEnrichmentPrograms } from "../../shared/db/enrichment-repo";
import { listSemesterReports } from "../../shared/db/semester-report-repo";
import { db } from "../../shared/db/schema";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
// NAV-DAILY-GATE-01: gerbang kartu modul
import { GATE_GROUPS } from "../../shared/layout/navigation";
import type {
  AcademicYear,
  TeacherProfile,
  TeachingAssignment,
  ATPEntry,
  LKPD,
  RppDocument,
} from "@guru-admin/domain";
import {
  filterATPForAssignment,
  filterLKPDForAssignment,
  filterRppDocumentsForAssignment,
  deriveGradeFromClassLabel,
} from "@guru-admin/domain";

type DocStatus = "lengkap" | "belum" | "kosong";

/** Kategori untuk grouping dokumen di checklist. */
type DocCategory =
  | "perencanaan"   // Prota, Promes, ATP, Kalender, Jadwal
  | "harian"         // Roster, Absensi, Jurnal
  | "evaluasi"       // Nilai, Remedial, Pengayaan
  | "dokumen"        // LKPD, RPP
  | "laporan";       // Laporan Akhir Semester

type DocItem = {
  id: string;
  name: string;
  category: DocCategory;
  status: DocStatus;
  detail: string;
  link: string;
  count: number;
  /** Label tombol aksi: "Buka" / "Buat" / "Generate". */
  actionLabel?: string;
  /** Detail tambahan untuk expand (mis. list siswa remedial). */
  expandDetails?: string[];
  /** Apakah item ini bisa di-generate dari app (bukan input manual). */
  autoGeneratable?: boolean;
};

const CATEGORY_LABELS: Record<DocCategory, string> = {
  perencanaan: "Perencanaan",
  harian: "Harian",
  evaluasi: "Evaluasi",
  dokumen: "Dokumen Pembelajaran",
  laporan: "Laporan",
};

const CATEGORY_ORDER: DocCategory[] = ["perencanaan", "harian", "evaluasi", "dokumen", "laporan"];

export function AdminPackagePage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ADMIN-PACKAGE-UX-MODED-01: 3 tab mode
  const [activeTab, setActiveTab] = useState<"lengkapi" | "preview" | "modul">("lengkapi");

  // Tab 2: pengaturan cetak paket
  const [printDate, setPrintDate] = useState(todayISODate());
  const [printTempat, setPrintTempat] = useState("");
  const [printCatatan, setPrintCatatan] = useState("");

  // P1-1 FIX: requestId guard untukhindari race condition di loadDocs.
  // Bila user ganti assignment cepat, request lama (requestId lebih kecil) tidak
  // boleh menimpa state hasil request baru.
  const loadDocsRequestIdRef = useRef(0);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y && tp) {
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      setLoading(false);
    })();
  }, []);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  async function loadDocs() {
    if (!year || !teacher) {
      setDocs([]);
      return;
    }
    const assignment = selectedAssignment();
    if (!assignment) {
      setDocs([]);
      return;
    }

    // P1-1 FIX: increment requestId di awal loadDocs. Simpan ke local const.
    // Setelah semua await, cek apakah requestId local masih === ref.current.
    // Bila tidak sama → request ini sudah stale (user ganti assignment) → skip setDocs.
    const requestId = ++loadDocsRequestIdRef.current;

    // Load semua data untuk cek kelengkapan
    const [
      protas,
      calendar,
      schedules,
      sessions,
      journals,
      atpEntries,
      lkpds,
      rppDocs,
      remedial,
      enrichment,
      semesterReports,
      allAttendance,
    ] = await Promise.all([
      listProtaProfiles(year.id),
      listCalendarEvents(year.id),
      listTeachingSchedules(year.id),
      listLessonSessions(year.id, assignment.semester),
      listJournals(year.id, assignment.semester),
      listATPEntries({ academicYearId: year.id, teacherId: teacher.id }) as Promise<ATPEntry[]>,
      listLKPDs({ academicYearId: year.id, teacherId: teacher.id }) as Promise<LKPD[]>,
      listRppDocuments({ academicYearId: year.id, teacherId: teacher.id }) as Promise<RppDocument[]>,
      listRemedialPrograms({ academicYearId: year.id, teacherId: teacher.id }),
      listEnrichmentPrograms({ academicYearId: year.id, teacherId: teacher.id }),
      listSemesterReports(year.id),
      db.attendanceRecords.toArray(),
    ]);

    // P0-4: filter ATP/LKPD/RPP per assignment — bukan global count.
    // Sebelumnya pakai atpEntries.length / lkpds.length / rppDocs.length
    // yang hanya filter academicYearId+teacherId, sehingga ATP kelas 7A ikut
    // dihitung untuk kelas 7B (false positive).
    const assignmentATP = filterATPForAssignment(atpEntries, assignment);
    const assignmentLKPD = filterLKPDForAssignment(lkpds, assignment);
    const assignmentRpp = filterRppDocumentsForAssignment(rppDocs, assignment);

    // Filter by assignment
    const assignmentSessions = sessions.filter(
      (s) => s.classId === assignment.classId && s.subject === assignment.subject && s.teacherId === assignment.teacherId
    );
    const assignmentJournals = journals.filter(
      (j) => j.classId === assignment.classId && j.subject === assignment.subject && j.teacherId === assignment.teacherId
    );
    const assignmentSessionIds = new Set(assignmentSessions.map((s) => s.id));
    const assignmentAttendance = allAttendance.filter(
      (a) => assignmentSessionIds.has(a.sessionId) && !a.deletedAt
    );

    // RC1-PATCH-1: harden filter Prota — match by teacherId + subject + grade.
    // Grade di-derive dari classLabel assignment (VII A → VII, VIII B → VIII, IX C → IX).
    const assignmentGrade = deriveGradeFromClassLabel(assignment.classLabel);
    const matchingProta = protas.find(
      (p) =>
        p.subject === assignment.subject &&
        p.teacherId === assignment.teacherId &&
        (p.grade === assignmentGrade || p.grade === assignment.classLabel)
    );

    const matchingRoster = await findClassRoster(year.id, assignment.classId);
    const matchingSchedule = schedules.filter(
      (s) => s.classId === assignment.classId && s.subject === assignment.subject && s.teacherId === assignment.teacherId
    );
    const gradebook = await findGradeBook({
      academicYearId: year.id,
      teacherId: teacher.id,
      classId: assignment.classId,
      semester: assignment.semester,
      subject: assignment.subject,
    });
    const matchingRemedial = remedial.find(
      (r) => r.classId === assignment.classId && r.subject === assignment.subject && r.semester === assignment.semester
    );
    const matchingEnrichment = enrichment.find(
      (r) => r.classId === assignment.classId && r.subject === assignment.subject && r.semester === assignment.semester
    );
    const matchingSemesterReport = semesterReports.find(
      (r) => r.classId === assignment.classId && r.subject === assignment.subject && r.semester === assignment.semester
    );

    // PAKET-ADMINISTRASI-FINAL-RC1: compute summary untuk expandDetails.
    const gradebookSummary = gradebook
      ? (() => {
          const complete = gradebook.entries.filter((e) => e.status === "complete").length;
          const remedial = gradebook.entries.filter((e) => e.status === "remedial").length;
          const incomplete = gradebook.entries.filter((e) => e.status === "incomplete").length;
          return { complete, remedial, incomplete, total: gradebook.entries.length };
        })()
      : null;

    const items: DocItem[] = [
      {
        id: "prota",
        name: "Program Tahunan (Prota)",
        category: "perencanaan",
        status: matchingProta ? "lengkap" : "kosong",
        detail: matchingProta
          ? `${matchingProta.units.length} unit · ${matchingProta.semester1IntraJP + matchingProta.semester2IntraJP} JP intra · status: ${matchingProta.status}`
          : "Belum dibuat",
        link: "/prota",
        count: matchingProta?.units.length ?? 0,
        actionLabel: matchingProta ? "Buka" : "Buat",
        autoGeneratable: false,
        expandDetails: matchingProta
          ? [
              `Mapel: ${matchingProta.subject} · Kelas: ${matchingProta.grade} · Fase: ${matchingProta.phase}`,
              `Semester 1: ${matchingProta.semester1IntraJP} JP · Semester 2: ${matchingProta.semester2IntraJP} JP`,
              `Tahun pelajaran: ${matchingProta.academicYearId}`,
              `Status: ${matchingProta.status}`,
            ]
          : undefined,
      },
      {
        id: "promes",
        name: "Program Semester (Promes)",
        category: "perencanaan",
        // UX-REL-03: Promes TIDAK "lengkap" hanya karena Prota+Kalender ada.
        // Promes belum persist (UX-PLAN-09), jadi status selalu "belum" sampai
        // guru benar-benar susun + cetak/simpan. Detail jelaskan kesiapan.
        status: "belum",
        detail: matchingProta && calendar.length > 0
          ? "Siap disusun dari Prota + Kalender (klik Susun Promes)"
          : matchingProta
            ? "Butuh Kalender Pendidikan"
            : "Butuh Prota + Kalender",
        link: "/promes",
        count: calendar.length,
        actionLabel: "Susun",
        autoGeneratable: true,
        expandDetails: [
          `Prasyarat: Prota ${matchingProta ? "✓" : "✗"} + Kalender ${calendar.length > 0 ? "✓" : "✗"}`,
          matchingProta ? `Sumber: ${matchingProta.units.length} unit Prota` : "",
          calendar.length > 0 ? `Kalender: ${calendar.length} event` : "",
          "Catatan: Promes belum tersimpan otomatis. Susun lalu cetak/download.",
        ].filter(Boolean),
      },
      {
        id: "atp",
        name: "Bank TP (Tujuan Pembelajaran)",
        category: "perencanaan",
        status: assignmentATP.length > 0 ? "lengkap" : "kosong",
        detail: `${assignmentATP.length} TP untuk ${assignment.subject} ${assignment.classLabel}`,
        link: "/atp",
        count: assignmentATP.length,
        actionLabel: assignmentATP.length > 0 ? "Buka" : "Buat",
        autoGeneratable: false,
        expandDetails: assignmentATP.length > 0
          ? [
              `Total: ${assignmentATP.length} TP`,
              `Total JP: ${assignmentATP.reduce((s, e) => s + e.alokasiJP, 0)} JP`,
              `Elemen: ${[...new Set(assignmentATP.map((e) => e.elemen))].join(", ")}`,
            ]
          : undefined,
      },
      {
        id: "calendar",
        name: "Kalender Pendidikan",
        category: "perencanaan",
        status: calendar.length > 0 ? "lengkap" : "kosong",
        detail: `${calendar.length} event · ${calendar.filter((e) => e.blocksLearning).length} hari libur`,
        link: "/calendar",
        count: calendar.length,
        actionLabel: "Buka",
        autoGeneratable: false,
      },
      {
        id: "schedule",
        name: "Jadwal Mengajar",
        category: "perencanaan",
        status: matchingSchedule.length > 0 ? "lengkap" : "kosong",
        detail: `${matchingSchedule.length} jadwal untuk ${assignment.classLabel} · ${assignment.subject}`,
        link: "/schedule",
        count: matchingSchedule.length,
        actionLabel: matchingSchedule.length > 0 ? "Buka" : "Buat",
        autoGeneratable: false,
      },
      {
        id: "roster",
        name: "Daftar Siswa (Roster)",
        category: "harian",
        status: matchingRoster && matchingRoster.students.length > 0 ? "lengkap" : "kosong",
        detail: matchingRoster ? `${matchingRoster.students.length} siswa` : "Belum dibuat",
        link: "/roster",
        count: matchingRoster?.students.length ?? 0,
        actionLabel: matchingRoster ? "Buka" : "Buat",
        autoGeneratable: false,
      },
      {
        id: "attendance",
        name: "Absensi Semester",
        category: "harian",
        status: assignmentAttendance.length > 0 ? "lengkap" : "belum",
        detail: assignmentAttendance.length > 0
          ? `${assignmentAttendance.length} record · ${assignmentSessions.length} sesi`
          : "Belum ada absensi semester ini",
        link: "/attendance",
        count: assignmentAttendance.length,
        actionLabel: "Buka",
        autoGeneratable: false,
        expandDetails: assignmentAttendance.length > 0
          ? [
              `Total sesi: ${assignmentSessions.length}`,
              `Total record absensi: ${assignmentAttendance.length}`,
              `Rata-rata: ${assignmentSessions.length > 0 ? Math.round(assignmentAttendance.length / assignmentSessions.length) : 0} record/sesi`,
            ]
          : undefined,
      },
      {
        id: "journal",
        name: "Jurnal Mengajar",
        category: "harian",
        status: assignmentJournals.length > 0 ? "lengkap" : "belum",
        detail: assignmentJournals.length > 0
          ? `${assignmentJournals.length} jurnal · ${assignmentJournals.filter((j) => j.status === "final").length} final`
          : "Belum ada jurnal semester ini",
        link: "/journal",
        count: assignmentJournals.length,
        actionLabel: "Buka",
        autoGeneratable: false,
      },
      {
        id: "grades",
        name: "Daftar Nilai (GradeBook V2)",
        category: "evaluasi",
        status: gradebook ? "lengkap" : "kosong",
        detail: gradebook
          ? `${gradebook.entries.length} siswa · ${gradebookSummary?.complete} tuntas · ${gradebookSummary?.remedial} remedial`
          : "Belum dibuat",
        link: "/grades",
        count: gradebook?.entries.length ?? 0,
        actionLabel: gradebook ? "Buka" : "Buat",
        autoGeneratable: false,
        expandDetails: gradebookSummary
          ? [
              `Total siswa: ${gradebookSummary.total}`,
              `Tuntas (≥ KKTP ${gradebook?.passingScore ?? 75}): ${gradebookSummary.complete}`,
              `Remedial (< KKTP): ${gradebookSummary.remedial}`,
              `Belum lengkap (nilai kosong): ${gradebookSummary.incomplete}`,
              `Status: ${gradebook?.status}`,
            ]
          : undefined,
      },
      {
        id: "remedial",
        name: "Program Remedial",
        category: "evaluasi",
        status: matchingRemedial ? "lengkap" : "belum",
        detail: matchingRemedial
          ? `${matchingRemedial.students.length} siswa remedial · status: ${matchingRemedial.status}`
          : "Belum dibuat (butuh Daftar Nilai)",
        link: "/remedial",
        count: matchingRemedial?.students.length ?? 0,
        actionLabel: matchingRemedial ? "Buka" : "Susun",
        autoGeneratable: true,
        expandDetails: matchingRemedial
          ? [
              `KKTP: ${matchingRemedial.kktp}`,
              `Siswa remedial: ${matchingRemedial.students.length}`,
              `Status: ${matchingRemedial.status}`,
              `Finalized: ${matchingRemedial.finalizedAt ?? "belum"}`,
            ]
          : ["Prasyarat: Daftar Nilai sudah ada dengan siswa remedial"],
      },
      {
        id: "pengayaan",
        name: "Program Pengayaan",
        category: "evaluasi",
        status: matchingEnrichment ? "lengkap" : "belum",
        detail: matchingEnrichment
          ? `${matchingEnrichment.students.length} siswa pengayaan · status: ${matchingEnrichment.status}`
          : "Belum dibuat (butuh Daftar Nilai)",
        link: "/pengayaan",
        count: matchingEnrichment?.students.length ?? 0,
        actionLabel: matchingEnrichment ? "Buka" : "Susun",
        autoGeneratable: true,
        expandDetails: matchingEnrichment
          ? [
              `Siswa pengayaan: ${matchingEnrichment.students.length}`,
              `Status: ${matchingEnrichment.status}`,
              `Finalized: ${matchingEnrichment.finalizedAt ?? "belum"}`,
            ]
          : ["Prasyarat: Daftar Nilai sudah ada dengan siswa nilai ≥ 90"],
      },
      {
        id: "lkpd",
        name: "LKPD (Lembar Kerja Peserta Didik)",
        category: "dokumen",
        status: assignmentLKPD.length > 0 ? "lengkap" : "kosong",
        detail: `${assignmentLKPD.length} LKPD untuk ${assignment.subject} ${assignment.classLabel}`,
        link: "/lkpd",
        count: assignmentLKPD.length,
        actionLabel: assignmentLKPD.length > 0 ? "Buka" : "Buat",
        autoGeneratable: false,
        expandDetails: assignmentLKPD.length > 0
          ? assignmentLKPD.slice(0, 5).map((l) => `· ${l.title ?? "LKPD"} — ${l.status}`)
          : undefined,
      },
      {
        id: "rpp",
        name: "RPP / Dokumen Lama (Arsip)",
        category: "dokumen",
        status: assignmentRpp.length > 0 ? "lengkap" : "belum",
        detail: `${assignmentRpp.length} arsip untuk ${assignment.subject} ${assignment.classLabel} semester ${assignment.semester}`,
        link: "/rpp-bulk",
        count: assignmentRpp.length,
        actionLabel: "Buka",
        autoGeneratable: false,
        expandDetails: assignmentRpp.length > 0
          ? assignmentRpp.slice(0, 5).map((r) => `· ${r.filename ?? "arsip"} — ${r.documentKind} (${r.status})`)
          : undefined,
      },
      {
        id: "laporan",
        name: "Laporan Akhir Semester",
        category: "laporan",
        status: matchingSemesterReport ? "lengkap" : "belum",
        detail: matchingSemesterReport
          ? matchingSemesterReport.status === "final" ? "Final — siap cetak" : "Draft — belum difinalisasi"
          : "Belum dibuat",
        link: "/semester-report",
        count: matchingSemesterReport ? 1 : 0,
        actionLabel: matchingSemesterReport ? "Buka" : "Susun",
        autoGeneratable: true,
        expandDetails: matchingSemesterReport
          ? [
              `Status: ${matchingSemesterReport.status}`,
              `Subject: ${matchingSemesterReport.subject}`,
              `Class: ${matchingSemesterReport.classLabel}`,
            ]
          : [
              "Prasyarat: Prota, Nilai, Absensi, Jurnal sudah lengkap",
              "App akan generate laporan otomatis dari data semester",
            ],
      },
    ];

    // P1-1 FIX: cek requestId sebelum setDocs. Bila berbeda, request ini stale
    // (user sudah ganti assignment ke yang lain) → skip supaya tidak menimpa
    // hasil request yang lebih baru.
    if (requestId !== loadDocsRequestIdRef.current) return;
    setDocs(items);
  }

  useEffect(() => {
    void loadDocs();
  }, [selectedAssignmentId, year]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();
  const lengkapCount = docs.filter((d) => d.status === "lengkap").length;
  const belumCount = docs.filter((d) => d.status === "belum").length;
  const kosongCount = docs.filter((d) => d.status === "kosong").length;
  const totalDocs = docs.length;
  const completenessScore = totalDocs > 0 ? Math.round((lengkapCount / totalDocs) * 100) : 0;

  // Deadline indicator: akhir semester
  const todayISO = new Date().toISOString().slice(0, 10);
  const semesterEnd = assignment?.semester === 1 ? year?.semester1End : year?.semester2End;
  const daysToDeadline = semesterEnd
    ? Math.ceil((new Date(semesterEnd).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Group docs by category
  const docsByCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: docs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  // ADMIN-PACKAGE-UX-01: dokumen yang belum lengkap untuk section "Lanjutkan"
  const nextDocs = docs.filter((d) => d.status !== "lengkap").slice(0, 4);

  function handleExportChecklist() {
    if (!assignment || !year) return;
    const html = generateChecklistHTML(docs, assignment, year, completenessScore, lengkapCount, totalDocs);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checklist-administrasi-${assignment.classLabel}-${assignment.subject}-semester${assignment.semester}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: "Checklist kelengkapan didownload sebagai HTML." });
  }

  return (
    <div className="space-y-4">
      <div className="page-header no-print">
        <h1 className="text-2xl font-bold text-slate-900">Paket Administrasi Guru</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Cek, susun, dan cetak dokumen administrasi berdasarkan kelas dan mapel.
        </p>
      </div>

      {/* ADMIN-PACKAGE-UX-MODED-01: 3 tab */}
      <Card className="no-print">
        <div className="flex gap-2 flex-wrap">
          <Button variant={activeTab === "lengkapi" ? "primary" : "secondary"} className="text-sm" onClick={() => setActiveTab("lengkapi")}>Lengkapi Dokumen</Button>
          <Button variant={activeTab === "preview" ? "primary" : "secondary"} className="text-sm" onClick={() => setActiveTab("preview")}>Preview & Cetak Paket</Button>
          <Button variant={activeTab === "modul" ? "primary" : "secondary"} className="text-sm" onClick={() => setActiveTab("modul")}>Semua Modul</Button>
        </div>
      </Card>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"} no-print`}>
          {message.text}
        </div>
      )}

      {/* ====== TAB 1: LENGKAPI DOKUMEN ====== */}
      {activeTab === "lengkapi" && (
        <>
          {/* Step 1: pilih konteks dulu */}
          <Card className="no-print">
            <CardHeader title="1. Pilih Kelas dan Mapel" description="Pilih dulu agar app hanya menampilkan dokumen yang sesuai kelas, mapel, semester, dan guru." />
            {assignments.length === 0 ? (
              <EmptyState title="Belum ada Kelas dan Mapel" description="Buka menu Kelas dan Mapel untuk membuat assignment dulu." action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>} />
            ) : (
              <div className="space-y-3">
                <Select label="Kelas dan Mapel" id="pkg-asg" value={selectedAssignmentId} onChange={setSelectedAssignmentId} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject} · ${a.teacherName}` }))]} />
                {assignment && (
                  <InfoCard entries={[{ label: "Guru", value: assignment.teacherName }, { label: "Mapel", value: assignment.subject }, { label: "Kelas", value: assignment.classLabel }, { label: "Semester", value: String(assignment.semester) }, { label: "Tahun Pelajaran", value: year?.label ?? "-" }]} />
                )}
              </div>
            )}
          </Card>

          {!assignment && (
            <Card className="no-print">
              <EmptyState title="Pilih kelas dan mapel dulu" description="Setelah dipilih, app akan menampilkan ringkasan paket administrasi, dokumen yang kurang, dan tombol cepat untuk melengkapinya." />
            </Card>
          )}

          {assignment && (
            <>
              {/* Step 2: ringkasan */}
              <Card>
                <CardHeader title="2. Ringkasan Paket" description={`${lengkapCount} / ${totalDocs} dokumen lengkap · ${belumCount} belum · ${kosongCount} kosong`} />
                <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Skor Kelengkapan</span><span className="font-bold text-slate-900">{completenessScore}%</span></div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div className={`h-3 rounded-full transition-all ${completenessScore >= 80 ? "bg-emerald-500" : completenessScore >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${completenessScore}%` }} />
                      </div>
                    </div>
                    {daysToDeadline !== null && (
                      <div className={`p-2 rounded text-xs flex items-center gap-2 ${daysToDeadline < 0 ? "bg-rose-50 text-rose-800" : daysToDeadline <= 14 ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700"}`}>
                        <span className="font-semibold">{daysToDeadline < 0 ? `Akhir semester ${semesterEnd} sudah lewat ${Math.abs(daysToDeadline)} hari` : daysToDeadline === 0 ? "Hari ini adalah akhir semester" : `Akhir semester ${semesterEnd} — sisa ${daysToDeadline} hari`}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex md:flex-col gap-2 flex-wrap">
                    <Button variant="secondary" className="text-sm" onClick={handleExportChecklist}>Download Checklist</Button>
                    <Button variant="secondary" className="text-sm" onClick={() => setActiveTab("preview")}>Preview & Cetak</Button>
                  </div>
                </div>
              </Card>

              {/* Step 3: lanjutkan */}
              <Card>
                <CardHeader title="3. Lanjutkan yang Belum Selesai" description="Prioritas dokumen yang perlu dibuka agar paket administrasi cepat lengkap." />
                {nextDocs.length === 0 ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">Semua dokumen pada paket ini sudah lengkap.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {nextDocs.map((doc) => (
                      <Link key={doc.id} to={doc.link}>
                        <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div><p className="font-semibold text-sm text-slate-900">{doc.name}</p><p className="text-xs text-slate-500 mt-1">{doc.detail}</p></div>
                            <Badge variant={doc.status === "belum" ? "warning" : "error"}>{doc.status === "belum" ? "Belum" : "Kosong"}</Badge>
                          </div>
                          <p className="text-xs font-semibold text-brand-700 mt-3">{doc.actionLabel ?? "Buka"} →</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Step 4: checklist */}
              <div className="space-y-4">
                {docsByCategory.map((group) => (
                  <Card key={group.category}>
                    <CardHeader title={group.label} description={`${group.items.filter((d) => d.status === "lengkap").length} / ${group.items.length} lengkap`} />
                    <div className="space-y-2">
                      {group.items.map((doc) => (
                        <div key={doc.id} className={`p-3 border rounded-md ${expandedItemId === doc.id ? "border-brand-300 bg-brand-50" : "border-slate-200"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`w-3 h-3 rounded-full shrink-0 ${doc.status === "lengkap" ? "bg-emerald-500" : doc.status === "belum" ? "bg-amber-500" : "bg-rose-500"}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-sm">{doc.name}</p>{doc.autoGeneratable && <Badge variant="neutral">Otomatis</Badge>}</div>
                                <p className="text-xs text-slate-500">{doc.detail}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant={doc.status === "lengkap" ? "success" : doc.status === "belum" ? "warning" : "error"}>{doc.status === "lengkap" ? "Lengkap" : doc.status === "belum" ? "Belum" : "Kosong"}</Badge>
                              {doc.expandDetails && <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setExpandedItemId(expandedItemId === doc.id ? null : doc.id)}>{expandedItemId === doc.id ? "Tutup" : "Detail"}</Button>}
                              <Link to={doc.link}><Button variant="secondary" className="text-xs px-2 py-1">{doc.actionLabel ?? "Buka"}</Button></Link>
                            </div>
                          </div>
                          {expandedItemId === doc.id && doc.expandDetails && (
                            <div className="mt-3 pt-3 border-t border-slate-200"><p className="text-xs font-semibold text-slate-600 mb-1">Detail:</p><ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">{doc.expandDetails.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ====== TAB 2: PREVIEW & CETAK PAKET ====== */}
      {activeTab === "preview" && (
        <div className="grid lg:grid-cols-[320px_1fr] gap-4">
          {/* Sidebar pengaturan cetak */}
          <Card className="no-print">
            <CardHeader title="Pengaturan Cetak" description="Atur identitas dokumen paket." />
            <div className="space-y-3">
              <Select label="Kelas dan Mapel" id="pkg-preview-asg" value={selectedAssignmentId} onChange={setSelectedAssignmentId} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject}` }))]} />
              <Input label="Tanggal Cetak" id="pkg-print-date" type="date" value={printDate} onChange={setPrintDate} />
              <Input label="Tempat" id="pkg-print-tempat" value={printTempat} onChange={setPrintTempat} placeholder="Bantan" />
              <Input label="Kepala Sekolah" id="pkg-print-kepsek" value={teacher?.name ?? ""} onChange={() => {}} hint="Dari Profil Sekolah" />
              <Input label="Guru Mata Pelajaran" id="pkg-print-guru" value={assignment?.teacherName ?? teacher?.name ?? ""} onChange={() => {}} hint="Dari Kelas dan Mapel" />
              <Textarea label="Catatan Guru" id="pkg-print-catatan" value={printCatatan} onChange={setPrintCatatan} rows={3} placeholder="Catatan tambahan untuk paket administrasi..." />
              <div className="flex gap-2 flex-wrap">
                <Button className="text-sm" onClick={() => window.print()} disabled={!assignment}>Cetak Paket</Button>
                <Button variant="secondary" className="text-sm" onClick={handleExportChecklist} disabled={!assignment}>Download Checklist</Button>
              </div>
            </div>
          </Card>

          {/* Preview dokumen */}
          <div className="print-area">
            <div className="document-page document-portrait">
              <div className="document-title">PAKET ADMINISTRASI GURU</div>
              <div className="document-subtitle">{year?.label ?? "-"} · Semester {assignment?.semester === 1 ? "Ganjil" : "Genap"}</div>
              <table className="document-identity">
                <tbody>
                  <tr><td>Guru</td><td>{assignment?.teacherName ?? teacher?.name ?? "-"}</td><td>Mata Pelajaran</td><td>{assignment?.subject ?? "-"}</td></tr>
                  <tr><td>Kelas</td><td>{assignment?.classLabel ?? "-"}</td><td>Semester</td><td>{assignment?.semester === 1 ? "Ganjil" : "Genap"}</td></tr>
                  <tr><td>Tahun Pelajaran</td><td>{year?.label ?? "-"}</td><td>Tanggal Cetak</td><td>{formatLongDateID(printDate)}</td></tr>
                </tbody>
              </table>

              <div className="document-section-title">RINGKASAN KELENGKAPAN</div>
              <table className="document-table">
                <tbody>
                  <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Skor Kelengkapan</td><td style={{ fontWeight: "bold", fontSize: "14pt", textAlign: "center" }}>{completenessScore}%</td></tr>
                  <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Dokumen Lengkap</td><td>{lengkapCount} / {totalDocs}</td></tr>
                  <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Belum Lengkap</td><td>{belumCount}</td></tr>
                  <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kosong</td><td>{kosongCount}</td></tr>
                </tbody>
              </table>

              <div className="document-section-title">CHECKLIST DOKUMEN</div>
              <table className="document-table">
                <thead><tr><th>No</th><th>Dokumen</th><th>Status</th><th>Detail</th></tr></thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", fontStyle: "italic", color: "#999" }}>Pilih kelas dan mapel dulu untuk melihat checklist.</td></tr>
                  ) : docs.map((doc, i) => (
                    <tr key={doc.id}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td>{doc.name}</td>
                      <td style={{ textAlign: "center" }}>{doc.status === "lengkap" ? "✓ Lengkap" : doc.status === "belum" ? "⚠ Belum" : "✗ Kosong"}</td>
                      <td style={{ fontSize: "9pt" }}>{doc.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {printCatatan && (
                <>
                  <div className="document-section-title">CATATAN GURU</div>
                  <p style={{ fontSize: "10pt", marginTop: "4pt" }}>{printCatatan}</p>
                </>
              )}

              <div className="document-section-title">TANDA TANGAN</div>
              <div className="signature-grid">
                <div>
                  <p>{printTempat || "..........."}, {formatLongDateID(printDate)}</p>
                  <p>Guru Mata Pelajaran</p>
                  <div className="sig-space" />
                  <p className="sig-name">{assignment?.teacherName ?? teacher?.name ?? "-"}</p>
                  <p>NIP. {teacher?.nip ?? "-"}</p>
                </div>
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala Sekolah</p>
                  <div className="sig-space" />
                  <p className="sig-name">............................</p>
                  <p>NIP. .............................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== TAB 3: SEMUA MODUL ====== */}
      {activeTab === "modul" && (
        <Card className="no-print">
          <CardHeader title="Semua Modul" description="Buka modul teknis jika perlu mengedit data langsung." />
          <div className="space-y-3">
            {GATE_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{group.title}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.cards.map((card) => (
                    <Link key={card.id} to={card.to}>
                      <div className="p-3 border border-slate-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors cursor-pointer">
                        <p className="text-sm font-medium text-slate-800">{card.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{card.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/** Generate standalone HTML checklist untuk print/audit. */
function generateChecklistHTML(
  docs: DocItem[],
  assignment: TeachingAssignment,
  year: AcademicYear,
  score: number,
  lengkapCount: number,
  totalDocs: number
): string {
  const today = new Date().toISOString().slice(0, 10);
  const rows = docs.map((d) => {
    const statusSymbol = d.status === "lengkap" ? "V" : d.status === "belum" ? "O" : "X";
    const statusColor = d.status === "lengkap" ? "#10b981" : d.status === "belum" ? "#f59e0b" : "#ef4444";
    return `<tr>
      <td style="padding: 6pt 8pt; border: 1px solid #000; text-align: center;">${statusSymbol}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000; font-weight: bold;">${d.name}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000; color: ${statusColor}; font-weight: bold;">${d.status === "lengkap" ? "Lengkap" : d.status === "belum" ? "Belum Lengkap" : "Kosong"}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000;">${d.detail}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000; text-align: center;">${d.count}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Checklist Administrasi — ${assignment.classLabel} ${assignment.subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Times New Roman", Georgia, serif; font-size: 11pt; padding: 2cm; max-width: 21cm; margin: 0 auto; color: #000; }
    h1 { text-align: center; font-size: 14pt; text-transform: uppercase; margin-bottom: 4pt; }
    h2 { text-align: center; font-size: 11pt; margin-bottom: 16pt; }
    .identitas { width: 100%; border-collapse: collapse; margin-bottom: 16pt; font-size: 10pt; }
    .identitas td { border: 1px solid #000; padding: 4pt 8pt; }
    .identitas td:first-child { font-weight: bold; width: 25%; background: #f5f5f5; }
    .score-box { text-align: center; padding: 12pt; background: #f0f9ff; border: 1px solid #000; margin-bottom: 16pt; }
    .score-box .score { font-size: 24pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #e0e0e0; padding: 6pt 8pt; border: 1px solid #000; text-align: left; font-weight: bold; }
    th:first-child { width: 30pt; text-align: center; }
    th:last-child { width: 50pt; text-align: center; }
    .footer { margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #999; font-size: 9pt; color: #666; text-align: center; }
    @media print { body { padding: 0; } @page { size: A4 portrait; margin: 1.5cm 2cm; } }
  </style>
</head>
<body>
  <h1>Checklist Kelengkapan Administrasi Guru</h1>
  <h2>Tahun Pelajaran ${year.label}</h2>
  <table class="identitas">
    <tr><td>Guru</td><td>${assignment.teacherName}</td></tr>
    <tr><td>Mata Pelajaran</td><td>${assignment.subject}</td></tr>
    <tr><td>Kelas</td><td>${assignment.classLabel}</td></tr>
    <tr><td>Semester</td><td>${assignment.semester === 1 ? "Ganjil" : "Genap"}</td></tr>
    <tr><td>Tanggal Cetak</td><td>${today}</td></tr>
  </table>
  <div class="score-box">
    <p>Skor Kelengkapan</p>
    <p class="score">${score}%</p>
    <p>${lengkapCount} / ${totalDocs} dokumen lengkap</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Dokumen</th>
        <th>Status</th>
        <th>Detail</th>
        <th>Jumlah</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    Dokumen ini di-generate otomatis oleh Guru Admin Flow (SIAKAD GURU) pada ${today}.
  </div>
</body>
</html>`;
}
