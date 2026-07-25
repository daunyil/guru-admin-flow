/**
 * Import Modal — dialog for importing Prota from JSON or Excel paste.
 */

import { useState } from "react";
import { Card, CardHeader, Select, Textarea, Input, Button } from "@shared/ui";
import {
  listProtaProfiles,
  saveProtaProfile,
  importProtaFromJSON,
} from "@shared/db/prota-repo";
import { getTeacherProfile } from "@shared/db/profile-repo";
import { parseProtaExcelPaste, type ProtaExcelParseResult } from "@guru-admin/domain";
import type { ProtaProfile } from "@guru-admin/domain";

export function ImportModal({
  academicYearId,
  onClose,
  onImported,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onImported: (p: ProtaProfile) => void;
  onError: (errs: string[]) => void;
}) {
  const [mode, setMode] = useState<"json" | "excel">("json");
  const [jsonText, setJsonText] = useState("");
  const [excelText, setExcelText] = useState("");
  const [excelPreview, setExcelPreview] = useState<ProtaExcelParseResult | null>(null);
  const [excelMeta, setExcelMeta] = useState({
    subject: "",
    grade: "",
    phase: "",
    annualIntraJP: 0,
    semester1IntraJP: 0,
    semester2IntraJP: 0,
  });
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) {
        onError(["Profil guru belum diisi. Lengkapi di menu Profil dulu."]);
        setImporting(false);
        return;
      }

      if (mode === "json") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch (e) {
          onError([`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`]);
          setImporting(false);
          return;
        }
        const result = await importProtaFromJSON(parsed, academicYearId, teacher.id);
        if (result.success && result.profile) {
          onImported(result.profile);
        } else {
          onError(result.errors);
        }
      } else {
        if (!excelPreview || excelPreview.units.length === 0) {
          onError(["Tidak ada unit valid untuk diimpor. Klik Preview dulu."]);
          setImporting(false);
          return;
        }
        if (!excelMeta.subject || !excelMeta.grade || !excelMeta.phase) {
          onError(["Subject, Grade, Phase wajib diisi untuk mode Excel paste."]);
          setImporting(false);
          return;
        }

        const existing = await listProtaProfiles(academicYearId);
        const duplicate = existing.find(
          (p) => p.subject === excelMeta.subject && p.grade === excelMeta.grade
        );
        if (duplicate) {
          onError([
            `Prota untuk ${excelMeta.subject} kelas ${excelMeta.grade} sudah ada (status: ${duplicate.status}). ` +
            `Hapus Prota yang lama dulu bila ingin import ulang, atau gunakan mode JSON (yang akan membuat profile baru terpisah).`,
          ]);
          setImporting(false);
          return;
        }

        const jpInconsistency: string[] = [];
        if (
          excelMeta.annualIntraJP > 0 &&
          excelMeta.semester1IntraJP + excelMeta.semester2IntraJP !== excelMeta.annualIntraJP
        ) {
          jpInconsistency.push(
            `Warning: semester1 (${excelMeta.semester1IntraJP}) + semester2 (${excelMeta.semester2IntraJP}) ≠ annual (${excelMeta.annualIntraJP}).`
          );
        }

        const ok = window.confirm(
          `Impor Prota ${excelMeta.subject} kelas ${excelMeta.grade} dengan ${excelPreview.units.length} unit? ` +
          (jpInconsistency.length > 0 ? jpInconsistency.join(" ") + " " : "") +
          `Lanjutkan?`
        );
        if (!ok) {
          setImporting(false);
          return;
        }

        const profile = await saveProtaProfile({
          subject: excelMeta.subject,
          grade: excelMeta.grade,
          phase: excelMeta.phase,
          annualIntraJP: excelMeta.annualIntraJP,
          semester1IntraJP: excelMeta.semester1IntraJP,
          semester2IntraJP: excelMeta.semester2IntraJP,
          academicYearId,
          teacherId: teacher.id,
          units: excelPreview.units.map((u) => ({
            semester: u.semester,
            title: u.title,
            learningOutcome: u.learningOutcome,
            jp: u.jp,
            order: u.order,
            code: u.code,
          })),
          status: "draft",
          sourceYearId: null,
        });
        onImported(profile);
      }
    } finally {
      setImporting(false);
    }
  }

  function handleExcelPreview() {
    const result = parseProtaExcelPaste(excelText);
    setExcelPreview(result);
  }

  return (
    <div className="doc-overlay no-print" onClick={onClose} role="dialog" aria-modal="true" aria-label="Impor Prota">
      <div className="doc-overlay-card" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader
            title="Impor Prota"
            description="Mode JSON (format guru-admin-flow/prota/v1) atau Excel paste. Prota baru akan dibuat dengan status draft."
          />
          <div className="space-y-3">
            <Select
              label="Mode Impor"
              id="prota-import-mode"
              value={mode}
              onChange={(v) => { setMode(v as "json" | "excel"); setExcelPreview(null); }}
              options={[
                { value: "json", label: "JSON (format guru-admin-flow/prota/v1)" },
                { value: "excel", label: "Excel Paste (tab/koma/semicolon)" },
              ]}
            />

            {mode === "json" ? (
              <Textarea
                label="JSON Prota"
                id="import-prota-json"
                value={jsonText}
                onChange={setJsonText}
                rows={12}
                placeholder={`{
  "$schema": "guru-admin-flow/prota/v1",
  "subject": "Pendidikan Pancasila",
  "grade": "VII",
  ...
}`}
              />
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input label="Subject" id="prota-excel-subject" value={excelMeta.subject} onChange={(v) => setExcelMeta({ ...excelMeta, subject: v })} />
                  <Input label="Grade" id="prota-excel-grade" value={excelMeta.grade} onChange={(v) => setExcelMeta({ ...excelMeta, grade: v })} />
                  <Input label="Phase" id="prota-excel-phase" value={excelMeta.phase} onChange={(v) => setExcelMeta({ ...excelMeta, phase: v })} />
                  <Input label="Annual Intra JP" id="prota-excel-annual" type="number" value={String(excelMeta.annualIntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, annualIntraJP: Number(v) || 0 })} />
                  <Input label="Sem 1 Intra JP" id="prota-excel-sem1" type="number" value={String(excelMeta.semester1IntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, semester1IntraJP: Number(v) || 0 })} />
                  <Input label="Sem 2 Intra JP" id="prota-excel-sem2" type="number" value={String(excelMeta.semester2IntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, semester2IntraJP: Number(v) || 0 })} />
                </div>
                <Textarea
                  label="Paste dari Excel (header: Semester, Materi, JP, Order, Code, Learning Outcome)"
                  id="import-prota-excel"
                  value={excelText}
                  onChange={(v) => { setExcelText(v); setExcelPreview(null); }}
                  rows={10}
                  placeholder={"Semester\tMateri\tJP\tOrder\tCode\tLearning Outcome\n1\tBab 1: Norma\t2\t1\tM1\tMemahami norma\n2\tBab 3: Hukum\t2\t2\tM3\tMemahami hukum"}
                />
                <Button variant="secondary" className="text-sm" onClick={handleExcelPreview} disabled={!excelText.trim()}>
                  Preview Parse
                </Button>
                {excelPreview && (
                  <div className="p-3 bg-slate-50 rounded-md text-sm space-y-2">
                    <p className="font-semibold text-emerald-700">
                      ✓ {excelPreview.units.length} unit siap diimpor
                      {excelPreview.skippedRows.length > 0 && (
                        <span className="text-amber-700"> · {excelPreview.skippedRows.length} baris di-skip</span>
                      )}
                    </p>
                    {excelPreview.skippedRows.length > 0 && (
                      <div className="max-h-32 overflow-y-auto text-xs text-rose-700">
                        <p className="font-semibold">Baris di-skip:</p>
                        {excelPreview.skippedRows.map((s, i) => (
                          <div key={i} className="p-1">Baris {s.lineNumber}: {s.reason}</div>
                        ))}
                      </div>
                    )}
                    {excelPreview.units.length > 0 && (
                      <div className="max-h-48 overflow-y-auto text-xs">
                        {excelPreview.units.map((u, i) => (
                          <div key={i} className="p-1 border-b border-slate-200">
                            S{u.semester} · <strong>{u.title}</strong> · {u.jp} JP · order {u.order}
                            {u.code && <span className="text-slate-500"> · {u.code}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={
                  importing ||
                  (mode === "json" ? !jsonText.trim() : !excelPreview || excelPreview.units.length === 0)
                }
              >
                {importing ? "Mengimpor..." : "Impor Prota"}
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={importing}>Batal</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
