/**
 * LetterPreview — Renders a formal letter document from PiketLetterDocument data.
 *
 * V2: Consistent card styling, better toolbar.
 */

import { Button } from "@shared/ui";
import { PrintExportButtons } from "@shared/ui/PrintExportButtons";
import { formatLongDateID } from "@guru-admin/shared";
import type { PiketLetterDocument } from "./piket-letter";

interface LetterPreviewProps {
  letter: PiketLetterDocument;
  onClose: () => void;
}

export function LetterPreview({ letter, onClose }: LetterPreviewProps) {
  const filename = `surat-piket-${letter.studentIdentity[0]?.value ?? "siswa"}-${letter.date}`
    .toLowerCase()
    .replace(/\s+/g, "-");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
        {/* Toolbar */}
        <div className="flex justify-between items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-sm p-4 border-b border-slate-100 z-10">
          <h4 className="text-xs md:text-sm font-bold text-slate-800">Preview Surat</h4>
          <div className="flex gap-2">
            <PrintExportButtons
              filename={filename}
              title={letter.title}
              orientation="portrait"
              targetId="print-piket-letter"
            />
            <button
              type="button"
              onClick={onClose}
              className="bg-white text-slate-700 border border-slate-300 font-bold text-xs py-2 px-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all min-h-[44px]"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Document content */}
        <div className="p-4">
          <div className="print-area" id="print-piket-letter">
            <div className="document-page document-portrait">
              {/* KOP header */}
              <div className="text-center border-b-4 border-double border-slate-900 pb-2 mb-4">
                <div className="text-xs font-semibold uppercase">Pemerintah Kabupaten Bengkalis</div>
                <div className="text-xs font-semibold uppercase">Dinas Pendidikan</div>
                <div className="text-lg font-extrabold uppercase">{letter.schoolName}</div>
                {letter.schoolAddress && (
                  <div className="text-xs">Alamat: {letter.schoolAddress}</div>
                )}
              </div>

              {/* Title */}
              <div className="document-title">{letter.title}</div>

              {/* Parent summons: nomor & perihal table */}
              {letter.letterType === "parent_summons" && (
                <table className="document-identity">
                  <tbody>
                    <tr>
                      <td>Nomor</td>
                      <td>................................</td>
                      <td>Perihal</td>
                      <td>Panggilan Orang Tua/Wali Siswa</td>
                    </tr>
                    <tr>
                      <td>Lampiran</td>
                      <td>-</td>
                      <td>Tanggal</td>
                      <td>{formatLongDateID(letter.date)}</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Parent summons: addressee */}
              {letter.letterType === "parent_summons" && (
                <p style={{ fontSize: "10pt", marginBottom: "8pt" }}>
                  Kepada Yth.<br />
                  Bapak/Ibu Orang Tua/Wali Siswa<br />
                  di Tempat
                </p>
              )}

              {/* Opening */}
              <p style={{ fontSize: "10.5pt", lineHeight: 1.55 }}>{letter.opening}</p>

              {/* Student identity table */}
              <table className="document-identity">
                <tbody>
                  {letter.studentIdentity.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td colSpan={3}>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Parent summons: hari/tanggal/tempat table */}
              {letter.letterType === "parent_summons" && (
                <table className="document-identity">
                  <tbody>
                    <tr>
                      <td>Hari/Tanggal</td>
                      <td>................................</td>
                      <td>Waktu</td>
                      <td>Pukul ........ WIB</td>
                    </tr>
                    <tr>
                      <td>Tempat</td>
                      <td colSpan={3}>Ruang Guru / Ruang BK</td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Body paragraphs */}
              {letter.bodyParagraphs.map((p, i) => (
                <p key={i} style={{ fontSize: "10.5pt", lineHeight: 1.55, textAlign: "justify" }}>
                  {p}
                </p>
              ))}

              {/* Record table */}
              <div className="document-section-title">Ringkasan Catatan Piket</div>
              <table className="document-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Pelanggaran</th>
                    <th>Poin</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {letter.recordRows.map((r, i) => (
                    <tr key={`${r.date}-${i}`}>
                      <td className="text-center">{i + 1}</td>
                      <td>{formatLongDateID(r.date)}</td>
                      <td>{r.violation}</td>
                      <td className="text-center">{r.points}</td>
                      <td>{r.note ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Additional note */}
              {letter.additionalNote && (
                <p style={{ fontSize: "9.5pt" }}>{letter.additionalNote}</p>
              )}

              {/* Closing */}
              <p style={{ fontSize: "10.5pt", lineHeight: 1.55 }}>{letter.closing}</p>

              {/* Date & place */}
              <p style={{ fontSize: "10.5pt", textAlign: "right" }}>
                {letter.place ? `${letter.place}, ` : ""}
                {formatLongDateID(letter.date)}
              </p>

              {/* Signature blocks */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${letter.signatureBlocks.length}, 1fr)`,
                  gap: "24px",
                  marginTop: "24px",
                  textAlign: "center",
                  fontSize: "10pt",
                }}
              >
                {letter.signatureBlocks.map((s) => (
                  <div key={s.role}>
                    <p>{s.role}</p>
                    <div style={{ height: "56px" }} />
                    <p style={{ fontWeight: 700, textDecoration: s.name ? "underline" : "none" }}>
                      {s.name ?? "................................"}
                    </p>
                    {s.nip && <p>NIP. {s.nip}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
