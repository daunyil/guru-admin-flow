/**
 * ImportModal — paste Excel, preview, cek duplikat, simpan.
 * PATCH-01B: Import Data Siswa.
 */

import { useState } from "react";
import { Card, CardHeader, Textarea, Button, Badge } from "../../shared/ui";
import type { ClassRoster } from "@guru-admin/domain";
import type { ParsedStudent } from "./types";

interface ImportModalProps {
  roster: ClassRoster;
  onClose: () => void;
  onImported: () => void;
  onError: (msg: string) => void;
  onImportStudents: (
    rosterId: string,
    students: { name: string; number: number; nis?: string }[],
    mode: "replace" | "append",
    existingCount: number,
  ) => Promise<void>;
}

export function ImportModal({
  roster,
  onClose,
  onImported,
  onError,
  onImportStudents,
}: ImportModalProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedStudent[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  // UX-FOUND-03: default "append" (Tambahkan) lebih aman — tidak hapus siswa existing
  const [importMode, setImportMode] = useState<"replace" | "append">("append");
  const [importing, setImporting] = useState(false);

  function parseExcelPaste(raw: string): ParsedStudent[] {
    const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const result: ParsedStudent[] = [];
    const seenNames = new Set<string>();
    const seenNIS = new Set<string>();

    // Existing students for append duplicate check
    const existingNames = new Set(roster.students.map((s) => s.name.toLowerCase()));
    const existingNIS = new Set(roster.students.map((s) => s.nis).filter(Boolean));

    lines.forEach((line, idx) => {
      let number: number;
      let nis: string;
      let name: string;

      if (line.includes("\t")) {
        // Tab-separated: "1\t12345\tANDI SAPUTRA"
        const parts = line.split("\t").map((p) => p.trim());
        if (parts.length >= 3) {
          number = parseInt(parts[0]) || (idx + 1);
          nis = parts[1] || "";
          name = parts.slice(2).join(" ").trim();
        } else if (parts.length === 2) {
          number = parseInt(parts[0]) || (idx + 1);
          nis = "";
          name = parts[1].trim();
        } else {
          number = idx + 1;
          nis = "";
          name = parts[0].trim();
        }
      } else if (line.includes(",")) {
        // CSV koma: "1,12345,ANDI SAPUTRA"
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 3) {
          number = parseInt(parts[0]) || (idx + 1);
          nis = parts[1] || "";
          name = parts.slice(2).join(" ").trim();
        } else if (parts.length === 2) {
          number = parseInt(parts[0]) || (idx + 1);
          nis = "";
          name = parts[1].trim();
        } else {
          number = idx + 1;
          nis = "";
          name = parts[0].trim();
        }
      } else if (line.includes(";")) {
        // CSV titik koma: "1;12345;ANDI SAPUTRA"
        const parts = line.split(";").map((p) => p.trim());
        if (parts.length >= 3) {
          number = parseInt(parts[0]) || (idx + 1);
          nis = parts[1] || "";
          name = parts.slice(2).join(" ").trim();
        } else if (parts.length === 2) {
          number = parseInt(parts[0]) || (idx + 1);
          nis = "";
          name = parts[1].trim();
        } else {
          number = idx + 1;
          nis = "";
          name = parts[0].trim();
        }
      } else {
        // Spasi-separated — deteksi pola
        const dotMatch = line.match(/^(\d+)[.\)]\s+(.+)$/);
        if (dotMatch) {
          // Format: "1. ANDI SAPUTRA" atau "1) ANDI SAPUTRA"
          number = parseInt(dotMatch[1]);
          nis = "";
          name = dotMatch[2].trim();
        } else {
          const parts = line.split(/\s+/);
          if (parts.length >= 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
            // Format: "1 12345 ANDI SAPUTRA"
            number = parseInt(parts[0]);
            nis = parts[1];
            name = parts.slice(2).join(" ").trim();
          } else if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
            // Format: "1 ANDI SAPUTRA"
            number = parseInt(parts[0]);
            nis = "";
            name = parts.slice(1).join(" ").trim();
          } else {
            // Hanya nama
            number = idx + 1;
            nis = "";
            name = line.trim();
          }
        }
      }

      if (!name) {
        result.push({ number, nis, name: `(baris ${idx + 1}: kosong)`, warning: "Nama kosong" });
        return;
      }

      const warnings: string[] = [];
      // Cek duplikat dalam batch import
      if (seenNames.has(name.toLowerCase())) warnings.push("Nama dobel (dalam import)");
      seenNames.add(name.toLowerCase());

      if (nis && seenNIS.has(nis)) warnings.push("NIS dobel (dalam import)");
      if (nis) seenNIS.add(nis);

      // Cek duplikat dengan siswa existing (untuk mode append)
      if (existingNames.has(name.toLowerCase())) warnings.push("Nama sudah ada di roster");
      if (nis && existingNIS.has(nis)) warnings.push("NIS sudah ada di roster");

      result.push({
        number,
        nis,
        name,
        warning: warnings.length > 0 ? warnings.join(", ") : undefined,
      });
    });

    return result;
  }

  function handleParse() {
    if (!text.trim()) {
      onError("Tempel data dulu.");
      return;
    }
    const result = parseExcelPaste(text);
    setParsed(result);
    setShowPreview(true);
  }

  function handleEditNumber(idx: number, value: string) {
    const next = [...parsed];
    next[idx] = { ...next[idx], number: Number(value) || 0 };
    setParsed(next);
  }

  function handleEditNIS(idx: number, value: string) {
    const next = [...parsed];
    next[idx] = { ...next[idx], nis: value };
    setParsed(next);
  }

  function handleEditName(idx: number, value: string) {
    const next = [...parsed];
    next[idx] = { ...next[idx], name: value };
    setParsed(next);
  }

  function handleRemoveRow(idx: number) {
    setParsed(parsed.filter((_, i) => i !== idx));
  }

  async function handleImport() {
    setImporting(true);
    try {
      const valid = parsed.filter((p) => p.name && !p.name.startsWith("(baris"));
      if (valid.length === 0) {
        onError("Tidak ada siswa valid untuk diimpor.");
        setImporting(false);
        return;
      }

      // UX-FOUND-03: typed confirm untuk mode "Ganti Semua" (replace)
      // Default ke "Tambahkan" bila roster sudah berisi siswa (lebih aman)
      if (importMode === "replace" && roster.students.length > 0) {
        const typed = window.prompt(
          `PERINGATAN: Mode "Ganti Semua" akan MENGHAPUS ${roster.students.length} siswa yang sudah ada ` +
          `dan menggantinya dengan ${valid.length} siswa baru.\n\n` +
          `Ketik GANTI untuk konfirmasi:`
        );
        if (typed !== "GANTI") {
          onError("Import dibatalkan. Ketik GANTI untuk konfirmasi ganti semua siswa.");
          setImporting(false);
          return;
        }
      }

      await onImportStudents(
        roster.id,
        valid.map((p) => ({ name: p.name, number: p.number, nis: p.nis || undefined })),
        importMode,
        roster.students.length,
      );
      onImported();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal impor.");
    } finally {
      setImporting(false);
    }
  }

  const hasWarnings = parsed.some((p) => p.warning);
  const validCount = parsed.filter((p) => p.name && !p.name.startsWith("(baris")).length;

  return (
    <Card>
      <CardHeader
        title={`Import Siswa — ${roster.classLabel}`}
        description="Tempel dari Excel: format 'No NIS Nama' atau 'No Nama' per baris. Bisa juga tab/koma separated."
      />

      {!showPreview ? (
        <div className="space-y-3">
          <Textarea
            label="Tempel Data Siswa"
            id="import-paste"
            value={text}
            onChange={setText}
            rows={12}
            placeholder={`1\t12345\tANDI SAPUTRA
2\t12346\tBUDI PRATAMA
3\t12347\tCITRA LESTARI

Atau:
1. ANDI SAPUTRA
2. BUDI PRATAMA
3. CITRA LESTARI

Atau cukup nama:
ANDI SAPUTRA
BUDI PRATAMA
CITRA LESTARI`}
          />
          <div className="flex gap-2">
            <Button onClick={handleParse}>Preview Data</Button>
            <Button variant="secondary" onClick={onClose}>Batal</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary + warnings */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="neutral">{validCount} siswa valid</Badge>
            {hasWarnings && <Badge variant="warning">Ada peringatan duplikat</Badge>}
            {roster.students.length > 0 && (
              <Badge variant="neutral">{roster.students.length} siswa existing</Badge>
            )}
          </div>

          {/* Mode: Replace / Append */}
          {roster.students.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant={importMode === "replace" ? "primary" : "secondary"}
                onClick={() => setImportMode("replace")}
                className="text-sm"
              >
                Ganti Semua
              </Button>
              <Button
                variant={importMode === "append" ? "primary" : "secondary"}
                onClick={() => setImportMode("append")}
                className="text-sm"
              >
                Tambahkan
              </Button>
            </div>
          )}

          {/* Preview table */}
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-2 w-16">No</th>
                  <th className="py-2 px-2 w-28">NIS/NISN</th>
                  <th className="py-2 px-2">Nama Siswa</th>
                  <th className="py-2 px-2 w-24">Status</th>
                  <th className="py-2 px-2 w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${p.warning ? "bg-amber-50" : ""}`}>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        className="w-12 px-1 py-0.5 border border-slate-300 rounded text-sm"
                        value={p.number}
                        onChange={(e) => handleEditNumber(i, e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        className="w-24 px-1 py-0.5 border border-slate-300 rounded text-sm"
                        value={p.nis}
                        onChange={(e) => handleEditNIS(i, e.target.value)}
                        placeholder="-"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        className="w-full px-1 py-0.5 border border-slate-300 rounded text-sm"
                        value={p.name}
                        onChange={(e) => handleEditName(i, e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      {p.warning ? <Badge variant="warning">{p.warning}</Badge> : <Badge variant="success">OK</Badge>}
                    </td>
                    <td className="py-1.5 px-2">
                      <button onClick={() => handleRemoveRow(i)} className="text-rose-600 hover:underline text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? "Mengimpor..." : `Simpan ${validCount} Siswa ${importMode === "replace" ? "(Ganti)" : "(Tambah)"}`}
            </Button>
            <Button variant="secondary" onClick={() => { setShowPreview(false); setParsed([]); }}>
              Ubah Data
            </Button>
            <Button variant="secondary" onClick={onClose}>Batal</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
