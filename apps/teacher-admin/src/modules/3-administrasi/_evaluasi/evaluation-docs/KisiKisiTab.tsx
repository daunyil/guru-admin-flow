/**
 * KisiKisiTab — Kisi-kisi Soal (Blueprint) section.
 * Includes Assessment Plan form, Blueprint Prompt, Paste JSON, and Preview.
 */

import { Card, CardHeader, Input, Textarea, Button, Badge, Select } from "@shared/ui";
import type { AssessmentType } from "@guru-admin/domain";
import type { ATPEntry, ParseBlueprintResult } from "@guru-admin/domain";
import type { EvaluationDocsState } from "./useEvaluationDocsState";
import type { Tab } from "./evaluation-docs-types";

interface KisiKisiTabProps {
  assessmentType: AssessmentType;
  setAssessmentType: EvaluationDocsState["setAssessmentType"];
  title: string;
  setTitle: EvaluationDocsState["setTitle"];
  pgCount: number;
  setPgCount: EvaluationDocsState["setPgCount"];
  essayCount: number;
  setEssayCount: EvaluationDocsState["setEssayCount"];
  filteredATP: ATPEntry[];
  selectedTpIds: Set<string>;
  toggleTp: EvaluationDocsState["toggleTp"];
  handleGenerateBlueprintPrompt: EvaluationDocsState["handleGenerateBlueprintPrompt"];
  blueprintPrompt: string;
  copyToClipboard: EvaluationDocsState["copyToClipboard"];
  blueprintJsonInput: string;
  setBlueprintJsonInput: EvaluationDocsState["setBlueprintJsonInput"];
  handleParseBlueprint: EvaluationDocsState["handleParseBlueprint"];
  blueprintResult: ParseBlueprintResult | null;
  handleGenerateCardPrompt: EvaluationDocsState["handleGenerateCardPrompt"];
  setTab: (tab: Tab) => void;
}

export function KisiKisiTab({
  assessmentType,
  setAssessmentType,
  title,
  setTitle,
  pgCount,
  setPgCount,
  essayCount,
  setEssayCount,
  filteredATP,
  selectedTpIds,
  toggleTp,
  handleGenerateBlueprintPrompt,
  blueprintPrompt,
  copyToClipboard,
  blueprintJsonInput,
  setBlueprintJsonInput,
  handleParseBlueprint,
  blueprintResult,
  handleGenerateCardPrompt,
  setTab,
}: KisiKisiTabProps) {
  return (
    <>
      <Card>
        <CardHeader title="2. Buat Assessment Plan" description="Pilih TP, jenis penilaian, jumlah soal." />
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select label="Jenis Penilaian" id="ev-type" value={assessmentType} onChange={(v) => setAssessmentType(v as AssessmentType)}
              options={[{value:"sumatif",label:"Sumatif"},{value:"pts",label:"PTS"},{value:"pas",label:"PAS"},{value:"uas",label:"UAS"}]} />
            <Input label="Judul" id="ev-title" value={title} onChange={setTitle} placeholder="Sumatif Bab 1" />
            <Input label="Jumlah PG" id="ev-pg" type="number" value={String(pgCount)} onChange={(v) => setPgCount(Number(v) || 0)} />
            <Input label="Jumlah Esai" id="ev-essay" type="number" value={String(essayCount)} onChange={(v) => setEssayCount(Number(v) || 0)} />
          </div>

          <div>
            <p className="label">Pilih TP (dari Bank TP):</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredATP.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada TP untuk assignment ini. Tambah di menu Bank TP.</p>
              ) : (
                filteredATP.map((tp) => (
                  <label key={tp.id} className="flex items-start gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={selectedTpIds.has(tp.id)} onChange={() => toggleTp(tp.id)} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-medium">{tp.tp}</p>
                      <p className="text-xs text-slate-500">Bab {tp.bab ?? "-"} · {tp.alokasiJP} JP · {tp.elemen ?? "-"}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <Button onClick={handleGenerateBlueprintPrompt} disabled={selectedTpIds.size === 0}>
            Buat Prompt AI Kisi-kisi
          </Button>
        </div>
      </Card>

      {blueprintPrompt && (
        <Card>
          <CardHeader title="3. Prompt Kisi-kisi untuk Claude" description="Copy prompt ini, paste ke Claude, tunggu jawaban JSON." />
          <Textarea id="bp-prompt" label="" value={blueprintPrompt} onChange={() => {}} rows={10} />
          <div className="mt-2"><Button variant="secondary" onClick={() => copyToClipboard(blueprintPrompt)}>Salin Prompt ke AI</Button></div>
        </Card>
      )}

      <Card>
        <CardHeader title="4. Paste JSON dari Claude" description="Paste hasil JSON dari Claude di sini." />
        <Textarea id="bp-json" label="" value={blueprintJsonInput} onChange={setBlueprintJsonInput} rows={8} placeholder='{"blueprints":[...]}' />
        <div className="mt-2"><Button onClick={handleParseBlueprint} disabled={!blueprintJsonInput.trim()}>Periksa &amp; Simpan Kisi-kisi</Button></div>
      </Card>

      {blueprintResult?.success && blueprintResult.blueprints && (
        <Card>
          <CardHeader title="5. Preview Kisi-kisi" description={`${blueprintResult.blueprints.length} kelompok soal`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b border-slate-200 text-left">
                <th className="py-2 px-2">No</th><th className="py-2 px-2">TP</th><th className="py-2 px-2">Materi</th>
                <th className="py-2 px-2">Kognitif</th><th className="py-2 px-2">Tipe</th><th className="py-2 px-2">Nomor Soal</th>
              </tr></thead>
              <tbody>
                {blueprintResult.blueprints.map((bp, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 px-2">{i + 1}</td>
                    <td className="py-1.5 px-2 text-xs">{bp.tpText}</td>
                    <td className="py-1.5 px-2 text-xs">{bp.material ?? "-"}</td>
                    <td className="py-1.5 px-2"><Badge variant="neutral">{bp.cognitiveLevel}</Badge></td>
                    <td className="py-1.5 px-2"><Badge variant={bp.questionType === "pg" ? "success" : "warning"}>{bp.questionType.toUpperCase()}</Badge></td>
                    <td className="py-1.5 px-2 text-xs">{bp.questionNumbers.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <Button onClick={handleGenerateCardPrompt}>Buat Prompt AI Kartu Soal</Button>
            <Button variant="secondary" className="ml-2" onClick={() => setTab("kartu-soal")}>Lanjut ke Kartu Soal</Button>
          </div>
        </Card>
      )}
    </>
  );
}
