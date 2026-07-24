/**
 * useAdminPackageState — all state management for AdminPackagePage orchestrator.
 *
 * Encapsulates useState, useEffect, handler functions, and derived values
 * so the page component only needs to call this hook and render.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
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
import { todayISODate } from "@guru-admin/shared";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
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
import { generateChecklistHTML } from "./generateChecklistHTML";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "./admin-package-types";
import type { DocItem } from "./admin-package-types";

export type AdminPackageState = ReturnType<typeof useAdminPackageState>;

export function useAdminPackageState() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
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

  // P1-1 FIX: requestId guard untuk menghindari race condition di loadDocs.
  const loadDocsRequestIdRef = useRef(0);

  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile(), getSchoolProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (sp?.regency) setPrintTempat(sp.regency);
      if (y && tp) {
        const todayISO = todayISODate();
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

    // P1-1 FIX: increment requestId di awal loadDocs.
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

    // P0-4: filter ATP/LKPD/RPP per assignment
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

    // RC1-PATCH-1: harden filter Prota
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

    // P1-1 FIX: cek requestId sebelum setDocs.
    if (requestId !== loadDocsRequestIdRef.current) return;
    setDocs(items);
  }

  useEffect(() => {
    void loadDocs();
  }, [selectedAssignmentId, year]);

  // Computed values
  const assignment = selectedAssignment();

  const lengkapCount = docs.filter((d) => d.status === "lengkap").length;
  const belumCount = docs.filter((d) => d.status === "belum").length;
  const kosongCount = docs.filter((d) => d.status === "kosong").length;
  const totalDocs = docs.length;
  const completenessScore = totalDocs > 0 ? Math.round((lengkapCount / totalDocs) * 100) : 0;

  // Deadline indicator: akhir semester
  const todayISO = todayISODate();
  const semesterEnd = assignment?.semester === 1 ? year?.semester1End : year?.semester2End;
  const daysToDeadline = semesterEnd
    ? Math.ceil((new Date(semesterEnd).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Group docs by category
  const docsByCategory = useMemo(() =>
    CATEGORY_ORDER.map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: docs.filter((d) => d.category === cat),
    })).filter((g) => g.items.length > 0),
    [docs]
  );

  // ADMIN-PACKAGE-UX-01: dokumen yang belum lengkap untuk section "Lanjutkan"
  const nextDocs = useMemo(() =>
    docs.filter((d) => d.status !== "lengkap").slice(0, 4),
    [docs]
  );

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

  return {
    loading,
    year,
    teacher,
    school,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    docs,
    expandedItemId,
    setExpandedItemId,
    message,
    setMessage,
    activeTab,
    setActiveTab,
    printDate,
    setPrintDate,
    printTempat,
    setPrintTempat,
    printCatatan,
    setPrintCatatan,
    // computed
    assignment,
    lengkapCount,
    belumCount,
    kosongCount,
    totalDocs,
    completenessScore,
    semesterEnd,
    daysToDeadline,
    docsByCategory,
    nextDocs,
    // handlers
    handleExportChecklist,
  };
}
