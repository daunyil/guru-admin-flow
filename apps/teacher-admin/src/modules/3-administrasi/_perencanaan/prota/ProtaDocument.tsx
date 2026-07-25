/**
 * ProtaDocument — A4 portrait WYSIWYG document for Prota.
 * Renders the official Prota table inside a DocumentPreview canvas.
 */

import type { ProtaProfile } from "@guru-admin/domain";
import { sumJP } from "@guru-admin/shared";
import { MONTH_FULL_ID } from "./prota-helpers";

export function ProtaDocument({
  profile,
  semester,
  schoolName,
  tahunAjaran,
}: {
  profile: ProtaProfile;
  semester: 1 | 2;
  schoolName: string;
  tahunAjaran: string;
}) {
  const semUnits = profile.units.filter((u) => u.semester === semester);
  const targetJP = semester === 1 ? profile.semester1IntraJP : profile.semester2IntraJP;
  const subtotalJP = sumJP(semUnits);
  const koJP = semester === 1
    ? (profile.semester1CocurricularJP ?? 0)
    : (profile.semester2CocurricularJP ?? 0);
  const totalJP = subtotalJP + koJP;

  return (
    <div className="print-area">
      <div className="document-page document-portrait" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.25', width: '100%', boxSizing: 'border-box' }}>
        <div className="document-title">PROGRAM TAHUNAN</div>
        <div className="document-subtitle">
          SEMESTER {semester === 1 ? "1 (GANJIL)" : "2 (GENAP)"} — TAHUN PELAJARAN {tahunAjaran}
        </div>

        {/* Identity table */}
        <table className="document-identity" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
          <tbody>
            <tr>
              <td>Satuan Pendidikan</td>
              <td>{schoolName || "-"}</td>
              <td>Semester</td>
              <td>{semester === 1 ? "Ganjil" : "Genap"}</td>
            </tr>
            <tr>
              <td>Mata Pelajaran</td>
              <td>{profile.subject}</td>
              <td>Kelas / Fase</td>
              <td>{profile.grade} / {profile.phase}</td>
            </tr>
            <tr>
              <td>Tahun Pelajaran</td>
              <td>{tahunAjaran}</td>
              <td>Alokasi Waktu</td>
              <td>{subtotalJP} JP intra{koJP > 0 ? ` + ${koJP} JP KO` : ""}</td>
            </tr>
          </tbody>
        </table>

        {/* Main table: Unit Materi */}
        <div className="document-section-title">DAFTAR MATERI / TUJUAN PEMBELAJARAN</div>
        <table className="document-table prota-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
          <thead>
            <tr>
              <th style={{ width: "6%" }}>No</th>
              <th style={{ width: "8%" }}>Kode</th>
              <th>Materi / Tujuan Pembelajaran</th>
              <th style={{ width: "10%" }}>JP</th>
            </tr>
          </thead>
          <tbody>
            {semUnits.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 italic">Belum ada unit</td>
              </tr>
            ) : (
              semUnits.map((u) => (
                <tr key={u.id}>
                  <td className="text-center">{u.order}</td>
                  <td className="text-center">{u.code || "-"}</td>
                  <td>
                    <span className="font-medium">{u.title}</span>
                    {u.learningOutcome && (
                      <span className="prota-lo-text"><br />{u.learningOutcome}</span>
                    )}
                  </td>
                  <td className="text-center">{u.jp}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right"><strong>Subtotal JP Intrakurikuler</strong></td>
              <td className="text-center"><strong>{subtotalJP}</strong></td>
            </tr>
            {koJP > 0 && (
              <tr>
                <td colSpan={3} className="text-right">JP Kokurikuler</td>
                <td className="text-center">{koJP}</td>
              </tr>
            )}
            {koJP > 0 && (
              <tr>
                <td colSpan={3} className="text-right"><strong>Total JP</strong></td>
                <td className="text-center"><strong>{totalJP}</strong></td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="text-right">Target JP Intrakurikuler</td>
              <td className="text-center">{targetJP}</td>
            </tr>
            <tr>
              <td colSpan={3} className="text-right">
                <strong>Selisih</strong>
              </td>
              <td className="text-center">
                <strong className={subtotalJP === targetJP ? "kme-effective-text" : "kme-ineffective-text"}>
                  {subtotalJP === targetJP ? "✓ Tepat" : `${subtotalJP > targetJP ? "Lebih" : "Kurang"} ${Math.abs(subtotalJP - targetJP)} JP`}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>

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
            <p>..........., {MONTH_FULL_ID[new Date().getMonth()]} {new Date().getFullYear()}</p>
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
