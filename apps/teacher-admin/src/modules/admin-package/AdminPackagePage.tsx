/**
 * Paket Administrasi Guru — halaman pusat dokumen per Data Mengajar.
 *
 * GENERATOR-COMPLETION-RC1 Phase 6.
 *
 * Pilih Data Mengajar → app tampilkan checklist 14 dokumen administrasi
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge, Select, InfoCard } from "../../shared/ui";
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
import type {
  AcademicYear,
  TeacherProfile,
  TeachingAssignment,
} from "@guru-admin/domain";

type DocStatus = "lengkap" | "belum" | "kosong";

type DocItem = {
  id: string;
  name: string;
  status: DocStatus;
  detail: string;
  link: string;
  count: number;
};

export function AdminPackagePage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [docs, setDocs] = useState<DocItem[]>([]);

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
      listATPEntries({ academicYearId: year.id, teacherId: teacher.id }),
      listLKPDs({ academicYearId: year.id, teacherId: teacher.id }),
      listRppDocuments({ academicYearId: year.id, teacherId: teacher.id }),
      listRemedialPrograms({ academicYearId: year.id, teacherId: teacher.id }),
      listEnrichmentPrograms({ academicYearId: year.id, teacherId: teacher.id }),
      listSemesterReports(year.id),
      db.attendanceRecords.toArray(),
    ]);

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
    const deriveGrade = (classLabel: string): string => {
      const match = classLabel.match(/^(VIII|VII|IX|X|XI|XII)/i);
      return match ? match[1].toUpperCase() : "";
    };
    const assignmentGrade = deriveGrade(assignment.classLabel);
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

    const items: DocItem[] = [
      {
        id: "prota",
        name: "Program Tahunan",
        status: matchingProta ? "lengkap" : "kosong",
        detail: matchingProta ? `${matchingProta.units.length} unit` : "Belum dibuat",
        link: "/prota",
        count: matchingProta?.units.length ?? 0,
      },
      {
        id: "promes",
        name: "Program Semester",
        status: matchingProta && calendar.length > 0 ? "lengkap" : "belum",
        detail: matchingProta ? "Bisa di-generate" : "Butuh Prota + Kalender",
        link: "/promes",
        count: calendar.length,
      },
      {
        id: "atp",
        name: "Bank TP (Tujuan Pembelajaran)",
        status: atpEntries.length > 0 ? "lengkap" : "kosong",
        detail: `${atpEntries.length} TP`,
        link: "/atp",
        count: atpEntries.length,
      },
      {
        id: "calendar",
        name: "Kalender Pendidikan",
        status: calendar.length > 0 ? "lengkap" : "kosong",
        detail: `${calendar.length} event`,
        link: "/calendar",
        count: calendar.length,
      },
      {
        id: "schedule",
        name: "Jadwal Mengajar",
        status: matchingSchedule.length > 0 ? "lengkap" : "kosong",
        detail: `${matchingSchedule.length} jadwal untuk assignment ini`,
        link: "/schedule",
        count: matchingSchedule.length,
      },
      {
        id: "roster",
        name: "Daftar Siswa",
        status: matchingRoster && matchingRoster.students.length > 0 ? "lengkap" : "kosong",
        detail: matchingRoster ? `${matchingRoster.students.length} siswa` : "Belum dibuat",
        link: "/roster",
        count: matchingRoster?.students.length ?? 0,
      },
      {
        id: "attendance",
        name: "Absensi Semester",
        status: assignmentAttendance.length > 0 ? "lengkap" : "belum",
        detail: `${assignmentAttendance.length} record absensi`,
        link: "/attendance",
        count: assignmentAttendance.length,
      },
      {
        id: "journal",
        name: "Jurnal Mengajar",
        status: assignmentJournals.length > 0 ? "lengkap" : "belum",
        detail: `${assignmentJournals.length} jurnal`,
        link: "/journal",
        count: assignmentJournals.length,
      },
      {
        id: "grades",
        name: "Daftar Nilai",
        status: gradebook ? "lengkap" : "kosong",
        detail: gradebook ? `${gradebook.entries.length} siswa` : "Belum dibuat",
        link: "/grades",
        count: gradebook?.entries.length ?? 0,
      },
      {
        id: "remedial",
        name: "Program Remedial",
        status: matchingRemedial ? "lengkap" : "belum",
        detail: matchingRemedial ? `${matchingRemedial.students.length} siswa remedial` : "Belum dibuat (butuh Nilai)",
        link: "/remedial",
        count: matchingRemedial?.students.length ?? 0,
      },
      {
        id: "pengayaan",
        name: "Program Pengayaan",
        status: matchingEnrichment ? "lengkap" : "belum",
        detail: matchingEnrichment ? `${matchingEnrichment.students.length} siswa pengayaan` : "Belum dibuat (butuh Nilai)",
        link: "/pengayaan",
        count: matchingEnrichment?.students.length ?? 0,
      },
      {
        id: "lkpd",
        name: "LKPD",
        status: lkpds.length > 0 ? "lengkap" : "kosong",
        detail: `${lkpds.length} LKPD`,
        link: "/lkpd",
        count: lkpds.length,
      },
      {
        id: "rpp",
        name: "RPP (Arsip Bulk Replace)",
        status: rppDocs.length > 0 ? "lengkap" : "belum",
        detail: `${rppDocs.length} arsip RPP`,
        link: "/rpp-bulk",
        count: rppDocs.length,
      },
      {
        id: "laporan",
        name: "Laporan Akhir Semester",
        status: matchingSemesterReport ? "lengkap" : "belum",
        detail: matchingSemesterReport ? matchingSemesterReport.status === "final" ? "Final" : "Draft" : "Belum dibuat",
        link: "/semester-report",
        count: matchingSemesterReport ? 1 : 0,
      },
    ];

    setDocs(items);
  }

  useEffect(() => {
    void loadDocs();
  }, [selectedAssignmentId, year]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();
  const lengkapCount = docs.filter((d) => d.status === "lengkap").length;
  const totalDocs = docs.length;
  const completenessScore = totalDocs > 0 ? Math.round((lengkapCount / totalDocs) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Paket Administrasi Guru</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Pusat dokumen administrasi per Data Mengajar.
        </p>
      </div>

      {/* Step 1: Pilih Data Mengajar */}
      <Card>
        <CardHeader
          title="1. Pilih Data Mengajar"
          description="App cek kelengkapan 14 dokumen administrasi untuk assignment ini."
        />
        {assignments.length === 0 ? (
          <EmptyState
            title="Belum ada Data Mengajar"
            description="Buka menu Data Mengajar untuk membuat assignment dulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Data Mengajar</Button>}
          />
        ) : (
          <div className="space-y-3">
            <Select
              label="Data Mengajar"
              id="pkg-asg"
              value={selectedAssignmentId}
              onChange={setSelectedAssignmentId}
              options={[
                { value: "", label: "-- Pilih --" },
                ...assignments.map((a) => ({
                  value: a.id,
                  label: `${a.classLabel} · ${a.subject} · ${a.teacherName}`,
                })),
              ]}
            />
            {assignment && (
              <InfoCard
                entries={[
                  { label: "Guru", value: assignment.teacherName },
                  { label: "Mapel", value: assignment.subject },
                  { label: "Kelas", value: assignment.classLabel },
                  { label: "Semester", value: String(assignment.semester) },
                  { label: "Tahun Pelajaran", value: year?.label ?? "-" },
                ]}
              />
            )}
          </div>
        )}
      </Card>

      {/* Step 2: Checklist dokumen */}
      {assignment && (
        <>
          <Card>
            <CardHeader
              title="2. Kelengkapan Dokumen"
              description={`${lengkapCount} / ${totalDocs} dokumen lengkap · Skor ${completenessScore}%`}
            />
            <div className="space-y-2">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 border border-slate-200 rounded-md flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        doc.status === "lengkap"
                          ? "bg-emerald-500"
                          : doc.status === "belum"
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-slate-500">{doc.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        doc.status === "lengkap"
                          ? "success"
                          : doc.status === "belum"
                          ? "warning"
                          : "error"
                      }
                    >
                      {doc.status === "lengkap" ? "Lengkap" : doc.status === "belum" ? "Belum Lengkap" : "Kosong"}
                    </Badge>
                    <Link to={doc.link}>
                      <Button variant="secondary" className="text-xs px-2 py-1">
                        Buka
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="3. Aksi Cepat" description="Buka dokumen lain yang belum lengkap." />
            <div className="flex gap-2 flex-wrap">
              <Link to="/rpp-bulk"><Button variant="secondary" className="text-sm">RPP Bulk Replace</Button></Link>
              <Link to="/remedial"><Button variant="secondary" className="text-sm">Program Remedial</Button></Link>
              <Link to="/pengayaan"><Button variant="secondary" className="text-sm">Program Pengayaan</Button></Link>
              <Link to="/lkpd"><Button variant="secondary" className="text-sm">Buat LKPD</Button></Link>
              <Link to="/semester-report"><Button variant="secondary" className="text-sm">Generate Laporan</Button></Link>
              <Link to="/backup"><Button variant="secondary" className="text-sm">Backup Semua</Button></Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
