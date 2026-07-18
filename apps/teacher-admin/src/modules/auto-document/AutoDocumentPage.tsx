/**
 * Auto Document Engine — halaman /auto-document
 *
 * AUTO-DOCUMENT-ENGINE-RC1: engine yang mengumpulkan data per Kelas dan Mapel
 * menjadi paket administrasi guru. Preview kelengkapan + tombol cetak.
 *
 * Flow:
 *   1. Pilih Kelas dan Mapel
 *   2. Klik "Susun Paket Dokumen"
 *   3. App load semua data terkait assignment
 *   4. Tampilkan preview: 12 dokumen dengan status available/draft/not_available
 *   5. Tombol cetak (print CSS)
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge, Select, InfoCard, downloadHTML } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
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
  SchoolProfile,
  TeachingAssignment,
  AdminDocumentPackage,
} from "@guru-admin/domain";
import {
  generateAdminDocumentPackage,
  filterProtaForAssignment,
  filterATPForAssignment,
  filterLKPDForAssignment,
  filterRppDocumentsForAssignment,
  matchesAssignmentContext,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export function AutoDocumentPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [pkg, setPkg] = useState<AdminDocumentPackage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([
        getActiveAcademicYear(),
        getTeacherProfile(),
        getSchoolProfile(),
      ]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (y && tp) {
                const todayISO = todayISODate();
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  async function handleGenerate() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setMessage({ type: "error", text: "Pilih Kelas dan Mapel dulu." });
      return;
    }
    setGenerating(true);
    setPkg(null);
    try {
      // Load semua data untuk assignment ini
      const [
        protas,
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

      // Filter by assignment 5-tuple
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
      // PATCH-1: strict filter per assignment — tidak bercampur guru/kelas/mapel/grade.
      const matchingProta = filterProtaForAssignment(protas, assignment);
      const matchingRoster = await findClassRoster(year.id, assignment.classId);
      const gradebook = await findGradeBook({
        academicYearId: year.id,
        teacherId: teacher.id,
        classId: assignment.classId,
        semester: assignment.semester,
        subject: assignment.subject,
      });
      const filteredATP = filterATPForAssignment(atpEntries, assignment);
      const filteredLKPD = filterLKPDForAssignment(lkpds, assignment);
      const filteredRPP = filterRppDocumentsForAssignment(rppDocs, assignment);
      const matchingRemedial = remedial.find(
        (r) =>
          r.classId === assignment.classId &&
          r.subject === assignment.subject &&
          r.semester === assignment.semester &&
          matchesAssignmentContext(r, assignment)
      ) ?? null;
      const matchingEnrichment = enrichment.find(
        (r) =>
          r.classId === assignment.classId &&
          r.subject === assignment.subject &&
          r.semester === assignment.semester &&
          matchesAssignmentContext(r, assignment)
      ) ?? null;
      const matchingSemesterReport = semesterReports.find(
        (r) =>
          r.classId === assignment.classId &&
          r.subject === assignment.subject &&
          r.semester === assignment.semester &&
          matchesAssignmentContext(r, assignment)
      ) ?? null;

      const result = generateAdminDocumentPackage({
        assignment,
        prota: matchingProta,
        roster: matchingRoster ?? null,
        sessions: assignmentSessions,
        attendanceRecords: assignmentAttendance,
        journals: assignmentJournals,
        gradeBook: gradebook ?? null,
        atpEntries: filteredATP,
        lkpds: filteredLKPD,
        rppDocuments: filteredRPP,
        remedialProgram: matchingRemedial,
        enrichmentProgram: matchingEnrichment,
        semesterReport: matchingSemesterReport,
      });

      setPkg(result);
      setMessage({ type: "success", text: `Paket dokumen dibuat. Skor kelengkapan: ${result.summary.completenessScore}%.` });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal generate." });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Auto Document Engine</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Generate paket administrasi guru per Kelas dan Mapel.
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      {/* Step 1: Pilih Kelas dan Mapel */}
      <Card>
        <CardHeader
          title="1. Pilih Kelas dan Mapel"
          description="Engine akan baca semua data terkait assignment untuk membuat paket."
        />
        {assignments.length === 0 ? (
          <EmptyState
            title="Belum ada Kelas dan Mapel"
            description="Buka menu Kelas dan Mapel untuk membuat assignment dulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
          />
        ) : (
          <div className="space-y-3">
            <Select
              label="Kelas dan Mapel"
              id="auto-doc-asg"
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
            {assignment && (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? "Menyusun..." : "Susun Paket Dokumen"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Step 2: Preview Paket */}
      {pkg && (
        <>
          <Card>
            <CardHeader
              title="2. Preview Paket Administrasi"
              description={`Skor Kelengkapan: ${pkg.summary.completenessScore}% — ${pkg.summary.availableDocs} lengkap, ${pkg.summary.draftDocs} draft, ${pkg.summary.notAvailableDocs} belum ada`}
            />
            <div className="space-y-2">
              {pkg.documents.map((doc) => (
                <div
                  key={doc.key}
                  className="p-3 border border-slate-200 rounded-md flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        doc.status === "available"
                          ? "bg-emerald-500"
                          : doc.status === "draft"
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
                        doc.status === "available"
                          ? "success"
                          : doc.status === "draft"
                          ? "warning"
                          : "error"
                      }
                    >
                      {doc.status === "available" ? "Lengkap" : doc.status === "draft" ? "Draft" : "Belum Tersedia"}
                    </Badge>
                    <Link to={doc.route}>
                      <Button variant="secondary" className="text-xs px-2 py-1">
                        Buka
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Summary angka */}
          <Card>
            <CardHeader title="3. Ringkasan Data" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <StatBox label="Total Sesi" value={pkg.summary.totalSessions} />
              <StatBox label="Record Absensi" value={pkg.summary.totalAttendanceRecords} />
              <StatBox label="Jurnal (Final/Total)" value={`${pkg.summary.totalJournalsFinal}/${pkg.summary.totalJournals}`} />
              <StatBox label="Entri Nilai" value={pkg.summary.totalGradeEntries} />
              <StatBox label="Siswa Remedial" value={pkg.summary.remedialStudents} />
              <StatBox label="Siswa Pengayaan" value={pkg.summary.enrichmentStudents} />
              <StatBox label="Total Siswa" value={pkg.summary.totalStudents} />
              <StatBox label="Dokumen Lengkap" value={`${pkg.summary.availableDocs}/${pkg.summary.totalDocs}`} />
            </div>
          </Card>

          {/* Tombol Cetak */}
          <Card>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Ringkasan" : "Mode Dokumen (Cetak)"}
              </Button>
              {showDocument && (
                <>
                  <Button variant="secondary" onClick={() => window.print()}>Cetak</Button>
                  <Button variant="secondary" onClick={() => {
                    const docEl = document.querySelector(".print-area .document-page");
                    if (docEl) {
                      downloadHTML({
                        filename: `paket-administrasi-${pkg?.assignment.classLabel}-${pkg?.assignment.subject}`.replace(/\s+/g, "-"),
                        title: "Paket Administrasi Guru",
                        content: docEl.innerHTML,
                        schoolName: school?.name,
                      });
                    }
                  }}>Download HTML</Button>
                </>
              )}
            </div>
          </Card>

          {/* Mode Dokumen */}
          {showDocument && (
            <Card>
              <div className="print-area">
                <div className="document-page document-portrait">
                  <div className="document-title">PAKET ADMINISTRASI GURU</div>
                  <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
                  <div className="document-subtitle">Tahun Pelajaran {year?.label}</div>

                  <table className="document-identity">
                    <tbody>
                      <tr>
                        <td>Guru</td><td>{pkg.assignment.teacherName}</td>
                        <td>Mapel</td><td>{pkg.assignment.subject}</td>
                      </tr>
                      <tr>
                        <td>Kelas</td><td>{pkg.assignment.classLabel}</td>
                        <td>Semester</td><td>{pkg.assignment.semester === 1 ? "Ganjil" : "Genap"}</td>
                      </tr>
                      <tr>
                        <td>Skor Kelengkapan</td><td>{pkg.summary.completenessScore}%</td>
                        <td>Tanggal Generate</td><td>{formatLongDateID(todayISODate())}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="document-section-title">A. DAFTAR DOKUMEN ADMINISTRASI</div>
                  <table className="document-table">
                    <thead>
                      <tr>
                        <th style={{ width: "5%" }}>No</th>
                        <th>Dokumen</th>
                        <th style={{ width: "15%" }}>Jumlah</th>
                        <th style={{ width: "20%" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pkg.documents.map((doc, i) => (
                        <tr key={doc.key}>
                          <td className="text-center">{i + 1}</td>
                          <td>{doc.name}</td>
                          <td className="text-center">{doc.count}</td>
                          <td className="text-center">
                            {doc.status === "available" ? "✓ Lengkap" : doc.status === "draft" ? "Draft" : "Belum Tersedia"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="document-section-title">B. RINGKASAN DATA</div>
                  <table className="document-table">
                    <thead>
                      <tr><th>Uraian</th><th style={{ width: "15%" }}>Jumlah</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Total Sesi Mengajar</td><td className="text-center">{pkg.summary.totalSessions}</td></tr>
                      <tr><td>Record Absensi</td><td className="text-center">{pkg.summary.totalAttendanceRecords}</td></tr>
                      <tr><td>Jurnal Mengajar (Final/Total)</td><td className="text-center">{pkg.summary.totalJournalsFinal}/{pkg.summary.totalJournals}</td></tr>
                      <tr><td>Entri Nilai</td><td className="text-center">{pkg.summary.totalGradeEntries}</td></tr>
                      <tr><td>Siswa Remedial</td><td className="text-center">{pkg.summary.remedialStudents}</td></tr>
                      <tr><td>Siswa Pengayaan</td><td className="text-center">{pkg.summary.enrichmentStudents}</td></tr>
                      <tr><td>Total Siswa</td><td className="text-center">{pkg.summary.totalStudents}</td></tr>
                    </tbody>
                  </table>

                  <div className="signature-grid">
                    <div>
                      <p>Mengetahui,</p>
                      <p>Kepala Sekolah</p>
                      <div className="sig-space" />
                      <p className="sig-name">{school?.headmasterName ?? "(............)"}</p>
                      <p>NIP. {school?.headmasterNip ?? "-"}</p>
                    </div>
                    <div>
                      <p>{school?.regency ?? "..........."}, {formatLongDateID(todayISODate())}</p>
                      <p>Guru Mata Pelajaran</p>
                      <div className="sig-space" />
                      <p className="sig-name">{pkg.assignment.teacherName}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-md">
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
