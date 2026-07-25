/**
 * ATP Form overlay — add / edit a Tujuan Pembelajaran entry.
 */

import { useState } from "react";
import { Input, Textarea, Button, CardHeader } from "../../shared/ui";
import type { ATPEntry } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ATPFormOnSaveData = Omit<
  ATPEntry,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "academicYearId" | "teacherId" | "status"
>;

export interface ATPFormProps {
  editing: ATPEntry | null;
  defaultSubject: string;
  defaultGrade: string;
  defaultPhase: string;
  onSave: (data: ATPFormOnSaveData) => void;
  onCancel: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ATPForm({
  editing,
  defaultSubject,
  defaultGrade,
  defaultPhase,
  onSave,
  onCancel,
}: ATPFormProps) {
  const [form, setForm] = useState({
    subject: editing?.subject ?? defaultSubject,
    grade: editing?.grade ?? defaultGrade,
    phase: editing?.phase ?? defaultPhase,
    bab: editing?.bab ?? "",
    elemen: editing?.elemen ?? "",
    cp: editing?.cp ?? "",
    tp: editing?.tp ?? "",
    profilPelajar: editing?.profilPelajar ?? "",
    kataKunci: editing?.kataKunci ?? "",
    alokasiJP: editing?.alokasiJP ?? 2,
    teacherName: editing?.teacherName ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="doc-overlay no-print" onClick={onCancel} role="dialog" aria-modal="true" aria-label={editing ? "Edit TP" : "Tambah TP"}>
      <div className="doc-overlay-card" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <CardHeader title={editing ? "Edit TP" : "Tambah TP"} description="Wajib: Mapel, Kelas, Fase, Elemen, CP, TP, Alokasi JP." />
        <div className="space-y-3 p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Mapel" id="atp-subject" value={form.subject} onChange={(v) => set("subject", v)} />
            <Input label="Kelas" id="atp-grade" value={form.grade} onChange={(v) => set("grade", v)} placeholder="VII" />
            <Input label="Fase" id="atp-phase" value={form.phase} onChange={(v) => set("phase", v)} placeholder="D" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Bab" id="atp-bab" value={form.bab} onChange={(v) => set("bab", v)} placeholder="Bab 1" />
            <Input label="Elemen" id="atp-elemen" value={form.elemen} onChange={(v) => set("elemen", v)} />
          </div>
          <Textarea label="Capaian Pembelajaran (CP)" id="atp-cp" value={form.cp} onChange={(v) => set("cp", v)} rows={2} />
          <Textarea label="Tujuan Pembelajaran (TP)" id="atp-tp" value={form.tp} onChange={(v) => set("tp", v)} rows={3} />
          <Input label="Profil Pelajar Pancasila" id="atp-profil" value={form.profilPelajar} onChange={(v) => set("profilPelajar", v)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Kata Kunci" id="atp-kk" value={form.kataKunci} onChange={(v) => set("kataKunci", v)} />
            <Input label="Alokasi JP" id="atp-jp" type="number" value={String(form.alokasiJP)} onChange={(v) => set("alokasiJP", Number(v) || 2)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onSave(form)}>Simpan</Button>
            <Button variant="secondary" onClick={onCancel}>Batal</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
