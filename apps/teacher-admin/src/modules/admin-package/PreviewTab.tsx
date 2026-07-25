/**
 * PreviewTab — Tab 2 content for "Preview & Cetak Paket".
 * Shows print settings sidebar and document preview area.
 */

import { Card, CardHeader, Button, Select, Input, Textarea } from "@shared/ui";
import { formatLongDateID } from "@guru-admin/shared";
import type { AdminPackageState } from "./useAdminPackageState";

type PreviewTabProps = Pick<AdminPackageState,
  | "assignments"
  | "selectedAssignmentId"
  | "setSelectedAssignmentId"
  | "assignment"
  | "year"
  | "teacher"
  | "school"
  | "printDate"
  | "setPrintDate"
  | "printTempat"
  | "setPrintTempat"
  | "printCatatan"
  | "setPrintCatatan"
  | "docs"
  | "lengkapCount"
  | "belumCount"
  | "kosongCount"
  | "totalDocs"
  | "completenessScore"
  | "handleExportChecklist"
>;

export function PreviewTab(props: PreviewTabProps) {
  const {
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    assignment,
    year,
    teacher,
    school,
    printDate,
    setPrintDate,
    printTempat,
    setPrintTempat,
    printCatatan,
    setPrintCatatan,
    docs,
    lengkapCount,
    belumCount,
    kosongCount,
    totalDocs,
    completenessScore,
    handleExportChecklist,
  } = props;

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      {/* Sidebar pengaturan cetak */}
      <Card className="no-print">
        <CardHeader title="Pengaturan Cetak" description="Atur identitas dokumen paket." />
        <div className="space-y-3">
          <Select label="Kelas dan Mapel" id="pkg-preview-asg" value={selectedAssignmentId} onChange={setSelectedAssignmentId} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject}` }))]} />
          <Input label="Tanggal Cetak" id="pkg-print-date" type="date" value={printDate} onChange={setPrintDate} />
          <Input label="Tempat" id="pkg-print-tempat" value={printTempat} onChange={setPrintTempat} placeholder="Bantan" />
          <Input label="Kepala Sekolah" id="pkg-print-kepsek" value={school?.headmasterName ?? ""} onChange={() => {}} hint="Dari Profil Sekolah" />
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
              <p className="sig-name">{school?.headmasterName ?? "............................"}</p>
              <p>NIP. {school?.headmasterNip ?? "............................."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
