import { Card, CardHeader, Button } from "@shared/ui";
import { PrintExportButtons } from "@shared/ui/PrintExportButtons";
import type { LKPD } from "@guru-admin/domain";
import { lkpdLabel } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

interface LKPDPreviewProps {
  lkpd: LKPD;
  schoolName: string;
  teacherName: string;
  onClose: () => void;
}

export function LKPDPreview({
  lkpd,
  schoolName,
  teacherName,
  onClose,
}: LKPDPreviewProps) {
  return (
    <Card>
      <CardHeader
        title="Preview LKPD"
        description={lkpdLabel(lkpd)}
      />
      <div className="print-area">
        <div className="document-page document-portrait">
          <div className="document-title">LEMBAR KERJA PESERTA DIDIK</div>
          <div className="document-subtitle">{schoolName}</div>
          <table className="document-identity">
            <tbody>
              <tr>
                <td>Mata Pelajaran</td><td>{lkpd.subject || "-"}</td>
                <td>Kelas</td><td>{lkpd.classLabel || lkpd.grade || "-"}</td>
              </tr>
              <tr>
                <td>Guru</td><td>{teacherName || "-"}</td>
                <td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td>
              </tr>
            </tbody>
          </table>
          <table className="document-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Judul</td>
                <td>{lkpd.title || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan Pembelajaran</td>
                <td>{lkpd.tp || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan LKPD</td>
                <td>{lkpd.objective || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Alat dan Bahan</td>
                <td>{lkpd.materials || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Langkah Kegiatan</td>
                <td><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{lkpd.steps || "-"}</pre></td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Pertanyaan Pemandu</td>
                <td><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{lkpd.guidingQuestions || "-"}</pre></td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Penilaian</td>
                <td>{lkpd.assessment || "-"}</td>
              </tr>
              {lkpd.notes && (
                <tr>
                  <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Catatan</td>
                  <td>{lkpd.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <PrintExportButtons filename="lkpd" title="LKPD" schoolName={schoolName} />
        <Button variant="secondary" onClick={onClose}>Tutup</Button>
      </div>
    </Card>
  );
}
