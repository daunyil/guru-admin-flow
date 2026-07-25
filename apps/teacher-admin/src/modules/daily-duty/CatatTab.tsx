import { Card, CardHeader, Input, Button, EmptyState, Textarea } from "@shared/ui";
import { Chip } from "./Chip";
import { categoryLabel } from "./utils";
import type { ClassRoster, DutyRule, StudentSearchable } from "@guru-admin/domain";

interface CatatTabProps {
  catatClassFilter: string;
  setCatatClassFilter: (f: string) => void;
  studentQuery: string;
  setStudentQuery: (q: string) => void;
  ruleQuery: string;
  setRuleQuery: (q: string) => void;
  selectedStudent: StudentSearchable | null;
  handleSelectStudent: (s: StudentSearchable) => void;
  selectedRule: DutyRule | null;
  setSelectedRule: (r: DutyRule | null) => void;
  catatan: string;
  setCatatan: (n: string) => void;
  tindakLanjut: string;
  setTindakLanjut: (n: string) => void;
  reportFinalized: boolean;
  rosters: ClassRoster[];
  filteredStudents: StudentSearchable[];
  filteredRules: DutyRule[];
  handleCatat: () => Promise<void>;
}

export function CatatTab(props: CatatTabProps) {
  const {
    catatClassFilter, setCatatClassFilter,
    studentQuery, setStudentQuery,
    ruleQuery, setRuleQuery,
    selectedStudent, handleSelectStudent,
    selectedRule, setSelectedRule,
    catatan, setCatatan,
    tindakLanjut, setTindakLanjut,
    reportFinalized,
    rosters,
    filteredStudents,
    filteredRules,
    handleCatat,
  } = props;

  return (
    <Card>
      <CardHeader title="Catat Kejadian Siswa" description="Cari siswa → kelas otomatis. Cari pelanggaran → poin otomatis." />
      {rosters.length === 0 ? (
        <EmptyState
          title="Belum ada data kelas/siswa"
          description="Buka menu 'Kelas dan Mapel' atau import roster siswa dulu sebelum mencatat pelanggaran."
          action={<Button variant="secondary" onClick={() => (window.location.hash = "#/roster")}>Buka Roster</Button>}
        />
      ) : (<>
      {reportFinalized && <div className="p-2 bg-amber-50 rounded text-xs text-amber-800 mb-3">⚠ Laporan sudah difinalisasi. Buka revisi dulu.</div>}
      <div className="space-y-4">
        <div>
          <label className="label">Filter kelas</label>
          <div className="flex gap-2 flex-wrap">
            <Chip active={catatClassFilter === "all"} onClick={() => setCatatClassFilter("all")}>Semua</Chip>
            {rosters.map((r) => <Chip key={r.classId} active={catatClassFilter === r.classId} onClick={() => setCatatClassFilter(r.classId)}>{r.classLabel}</Chip>)}
          </div>
        </div>
        <Input label="Cari siswa" id="student-search" value={studentQuery} onChange={setStudentQuery} placeholder="Cari siswa... (nama / nomor / NIS)" />
        {filteredStudents.length === 0 ? <p className="text-xs text-slate-500">Tidak ada siswa.</p> : (
          <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {filteredStudents.slice(0, 50).map((s) => (
              <li key={`${s.classId}-${s.id}`}>
                <button type="button" onClick={() => handleSelectStudent(s)} className={`w-full text-left px-3 py-2 text-sm ${selectedStudent?.id === s.id && selectedStudent?.classId === s.classId ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                  <span className="font-medium">{s.name}</span><span className="text-xs text-slate-500 ml-2">{s.classLabel} · No. {s.number ?? "-"}{s.nis ? ` · NIS ${s.nis}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Input label="Cari pelanggaran" id="rule-search" value={ruleQuery} onChange={setRuleQuery} placeholder="Cari pelanggaran... (nama / kategori / sinonim)" />
        {filteredRules.length === 0 ? <p className="text-xs text-slate-500">Tidak ada pelanggaran.</p> : (
          <ul className="mt-2 space-y-1 border border-slate-200 rounded-lg divide-y divide-slate-100">
            {filteredRules.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSelectedRule(r)} className={`w-full text-left px-3 py-2 text-sm ${selectedRule?.id === r.id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                  <span className="font-medium">{r.label}</span><span className="text-xs text-slate-500 ml-2">{categoryLabel(r.category)} · {r.points} poin</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {(selectedStudent || selectedRule) && (
          <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-sm">
            {selectedStudent && <p><span className="font-medium">{selectedStudent.name}</span><span className="text-xs text-slate-500"> — {selectedStudent.classLabel}</span></p>}
            {selectedRule && <p>{selectedRule.label}<span className="text-xs text-slate-500 ml-1">· {selectedRule.points} poin</span></p>}
          </div>
        )}
        <Textarea label={`Catatan tambahan${selectedRule?.type === "other" ? " (wajib untuk Lainnya)" : " (opsional)"}`} id="duty-note" value={catatan} onChange={setCatatan} rows={2} />
        <Textarea label="Tindak Lanjut (opsional)" id="duty-followup" value={tindakLanjut} onChange={setTindakLanjut} rows={2} />
        <Button onClick={handleCatat} disabled={reportFinalized}>Simpan Catatan</Button>
      </div>
      </>)}
    </Card>
  );
}
