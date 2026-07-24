/**
 * ATP Document — renders a WYSIWYG A4 landscape table of Tujuan Pembelajaran.
 */

import type { ATPEntry } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ATPDocumentProps {
  subject: string;
  grade: string;
  tahunAjaran: string;
  schoolName: string;
  teacherName: string;
  entries: ATPEntry[];
  groupedByBab: Record<string, ATPEntry[]>;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ATPDocument({
  subject,
  grade,
  tahunAjaran,
  schoolName,
  teacherName,
  entries,
  groupedByBab,
}: ATPDocumentProps) {
  const totalJP = entries.reduce((sum, e) => sum + e.alokasiJP, 0);

  return (
    <div className="print-area">
      <div className="document-page document-landscape">
        <div className="document-title">DAFTAR TUJUAN PEMBELAJARAN</div>
        <div className="document-subtitle">
          {subject || "SEMUA MAPEL"} — KELAS {grade || "..."} — TAHUN PELAJARAN {tahunAjaran}
        </div>

        {/* Identity */}
        <table className="document-identity">
          <tbody>
            <tr>
              <td>Satuan Pendidikan</td>
              <td>{schoolName || "-"}</td>
              <td>Mata Pelajaran</td>
              <td>{subject || "Semua"}</td>
            </tr>
            <tr>
              <td>Tahun Pelajaran</td>
              <td>{tahunAjaran}</td>
              <td>Kelas / Fase</td>
              <td>{grade || "Semua"}</td>
            </tr>
            <tr>
              <td>Guru Mata Pelajaran</td>
              <td>{teacherName || "-"}</td>
              <td>Total TP / JP</td>
              <td>{entries.length} TP / {totalJP} JP</td>
            </tr>
          </tbody>
        </table>

        {/* Main table grouped by Bab */}
        {Object.entries(groupedByBab).map(([bab, babEntries]) => (
          <div key={bab} style={{ marginTop: "12pt" }}>
            <div className="document-section-title">BAB {bab}</div>
            <table className="document-table" style={{ fontSize: "9pt" }}>
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>No</th>
                  <th style={{ width: "15%" }}>Elemen</th>
                  <th style={{ width: "25%" }}>Capaian Pembelajaran</th>
                  <th style={{ width: "30%" }}>Tujuan Pembelajaran</th>
                  <th style={{ width: "12%" }}>Profil Pelajar</th>
                  <th style={{ width: "8%" }}>JP</th>
                  <th style={{ width: "5%" }}>St</th>
                </tr>
              </thead>
              <tbody>
                {babEntries.map((e, idx) => (
                  <tr key={e.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td>{e.elemen}</td>
                    <td style={{ fontSize: "8.5pt" }}>{e.cp}</td>
                    <td style={{ fontWeight: 600 }}>{e.tp}</td>
                    <td style={{ fontSize: "8.5pt" }}>{e.profilPelajar || "-"}</td>
                    <td className="text-center">{e.alokasiJP}</td>
                    <td className="text-center" style={{ fontSize: "8pt" }}>
                      {e.status === "final" ? "✓" : "○"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right"><strong>JP Bab {bab}</strong></td>
                  <td className="text-center"><strong>{babEntries.reduce((s, e) => s + e.alokasiJP, 0)}</strong></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {entries.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "40pt", color: "#94a3b8" }}>
            <p>Belum ada Tujuan Pembelajaran untuk filter ini.</p>
            <p style={{ fontSize: "9pt", marginTop: "4pt" }}>Tambah TP via sidebar atau impor dari JSON.</p>
          </div>
        )}

        {/* Grand total */}
        {entries.length > 0 && (
          <div style={{ marginTop: "12pt", fontSize: "10pt", fontWeight: 700 }}>
            Total: {entries.length} Tujuan Pembelajaran — {totalJP} Jam Pelajaran
          </div>
        )}

        {/* Signature */}
        <div className="signature-grid" style={{ marginTop: "24pt" }}>
          <div>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
          <div>
            <p>..........., ....................</p>
            <p>Guru Mata Pelajaran</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
