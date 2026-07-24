import type {
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  TeachingAssignment,
} from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  LainnyaDocument — A4 formal layout for generic document           */
/* ------------------------------------------------------------------ */

interface LainnyaDocumentProps {
  title: string;
  content: string;
  school?: SchoolProfile;
  teacher: TeacherProfile;
  academicYear: AcademicYear;
  semester: 1 | 2;
  assignment: TeachingAssignment;
}

export function LainnyaDocument({
  title,
  content,
  school,
  teacher,
  academicYear,
  semester,
  assignment,
}: LainnyaDocumentProps) {
  return (
    <div className="document-page document-portrait">
      <div className="document-title">{title || "DOKUMEN LAINNYA"}</div>
      <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
      <div className="document-subtitle">Tahun Pelajaran {academicYear.label} — Semester {semester === 1 ? "Ganjil" : "Genap"}</div>

      <table className="document-identity">
        <tbody>
          <tr>
            <td>Mata Pelajaran</td><td>{assignment.subject}</td>
            <td>Kelas</td><td>{assignment.classLabel}</td>
          </tr>
          <tr>
            <td>Guru</td><td>{teacher.name}</td>
            <td>NIP</td><td>{teacher.nip ?? "-"}</td>
          </tr>
        </tbody>
      </table>

      {content ? (
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, marginTop: "12pt" }}>
          {content}
        </div>
      ) : (
        <div style={{ marginTop: "12pt", color: "#94a3b8", fontStyle: "italic" }}>
          (Belum ada isi dokumen. Isi di sidebar untuk mulai menulis.)
        </div>
      )}

      <div className="signature-grid" style={{ marginTop: "24pt" }}>
        <div>
          <p>Mengetahui,</p>
          <p>Kepala Sekolah</p>
          <div className="sig-space" />
          <p className="sig-name">{school?.headmasterName ?? "(...........................)"}</p>
          <p>NIP. {school?.headmasterNip ?? "-"}</p>
        </div>
        <div>
          <p>{school?.regency ?? "..........."}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p>Guru Mata Pelajaran</p>
          <div className="sig-space" />
          <p className="sig-name">{teacher.name}</p>
          <p>NIP. {teacher.nip ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
