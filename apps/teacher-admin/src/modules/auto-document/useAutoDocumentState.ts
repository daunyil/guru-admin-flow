/**
 * useAutoDocumentState — all state management for AutoDocumentPage orchestrator.
 *
 * Encapsulates useState, useEffect, handler functions, and derived values
 * so the page component only needs to call this hook and render.
 */

import { useEffect, useState } from "react";
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
import { todayISODate } from "@guru-admin/shared";
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

export type AutoDocumentState = ReturnType<typeof useAutoDocumentState>;

export function useAutoDocumentState() {
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

  return {
    loading,
    year,
    teacher,
    school,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    pkg,
    generating,
    showDocument,
    setShowDocument,
    message,
    setMessage,
    // derived
    assignment: selectedAssignment(),
    // handlers
    handleGenerate,
  };
}
