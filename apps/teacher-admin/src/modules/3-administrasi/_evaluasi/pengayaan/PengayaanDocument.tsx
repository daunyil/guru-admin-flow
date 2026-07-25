import type {
  EnrichmentProgram,
  TeacherProfile,
  SchoolProfile,
  AcademicYear,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

/* ------------------------------------------------------------------ */
/*  PengayaanDocument — renders inside A4 canvas                      */
/* ------------------------------------------------------------------ */

export function PengayaanDocument({
  program,
  plan,
  school,
  teacher,
  year,
}: {
  program: EnrichmentProgram;
  plan: string;
  school: SchoolProfile | undefined;
  teacher: TeacherProfile | undefined;
  year: AcademicYear | null;
}) {
  return (
    <>
      <div className="document-title">PROGRAM PENGAYAAN</div>
      <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
      <div className="document-subtitle">Tahun Pelajaran {year?.label}</div>

      <table className="document-identity">
        <tbody>
          <tr>
            <td>Mata Pelajaran</td><td>{program.subject}</td>
            <td>Kelas</td><td>{program.classLabel}</td>
          </tr>
          <tr>
            <td>Guru</td><td>{program.teacherName ?? teacher?.name ?? "-"}</td>
            <td>Semester</td><td>{program.semester === 1 ? "Ganjil" : "Genap"}</td>
          </tr>
          <tr>
            <td>Threshold</td><td>&ge; {program.threshold}</td>
            <td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td>
          </tr>
        </tbody>
      </table>

      <div className="document-section-title">A. DAFTAR SISWA PENGAYAAN</div>
      {program.students.length === 0 ? (
        <div style={{ border: "1px solid #000", padding: "12pt", marginBottom: "12pt", textAlign: "center" }}>
          <p style={{ fontStyle: "italic" }}>
            Tidak terdapat siswa yang masuk program pengayaan pada periode ini
            (belum ada siswa yang mencapai threshold &ge; {program.threshold}).
          </p>
        </div>
      ) : (
        <table className="document-table" style={{ fontSize: "9pt" }}>
          <thead>
            <tr>
              <th style={{ width: "5%" }}>No</th>
              <th>Nama Siswa</th>
              <th style={{ width: "10%" }}>Nilai</th>
              <th style={{ width: "25%" }}>Aktivitas</th>
              <th style={{ width: "25%" }}>Materi Lanjutan</th>
            </tr>
          </thead>
          <tbody>
            {program.students.map((s, i) => (
              <tr key={s.studentId}>
                <td className="text-center">{i + 1}</td>
                <td>{s.studentName}</td>
                <td className="text-center">{s.finalScore}</td>
                <td>{s.activity ?? "-"}</td>
                <td>{s.material ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {plan && (
        <>
          <div className="document-section-title">B. RENCANA PENGAYAAN</div>
          <div style={{ border: "1px solid #000", padding: "8pt", minHeight: "60pt", marginBottom: "12pt" }}>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{plan}</pre>
          </div>
        </>
      )}

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
          <p className="sig-name">{program.teacherName ?? teacher?.name ?? "-"}</p>
          <p>NIP. {teacher?.nip ?? "-"}</p>
        </div>
      </div>
    </>
  );
}
