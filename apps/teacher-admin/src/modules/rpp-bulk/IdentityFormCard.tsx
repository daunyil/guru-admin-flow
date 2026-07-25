/**
 * Step 1: Identitas Baru — assignment selector + identity form fields.
 */

import type { TeachingAssignment, RppIdentityContext } from "@guru-admin/domain";
import { Card, CardHeader, Input, Select } from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";

interface IdentityFormCardProps {
  ctx: RppIdentityContext;
  setCtx: React.Dispatch<React.SetStateAction<RppIdentityContext>>;
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  onAssignmentPick: (id: string) => void;
}

export function IdentityFormCard({
  ctx,
  setCtx,
  assignments,
  selectedAssignmentId,
  onAssignmentPick,
}: IdentityFormCardProps) {
  return (
    <Card>
      <CardHeader
        title="1. Identitas Baru"
        description="Auto-fill dari Profil Sekolah + Guru. Pilih Kelas dan Mapel untuk auto-fill mapel/kelas/semester."
      />
      <div className="space-y-3">
        {assignments.length > 0 && (
          <Select
            label="Kelas dan Mapel (opsional, untuk auto-fill mapel/kelas/semester)"
            id="rpp-asg"
            value={selectedAssignmentId}
            onChange={onAssignmentPick}
            options={[
              { value: "", label: "-- Tidak pakai assignment --" },
              ...assignments.map((a) => ({
                value: a.id,
                label: `${a.classLabel} · ${a.subject} · ${a.teacherName}`,
              })),
            ]}
          />
        )}

        <InfoCard
          entries={[
            { label: "Sekolah", value: ctx.schoolName || "-" },
            { label: "Guru", value: ctx.teacherName || "-" },
            { label: "Mapel", value: ctx.subject || "-" },
            { label: "Kelas", value: ctx.classLabel || "-" },
            { label: "Semester", value: ctx.semester },
          ]}
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Nama Sekolah" id="rpp-school" value={ctx.schoolName} onChange={(v) => setCtx({ ...ctx, schoolName: v })} />
          <Input label="Kepala Sekolah" id="rpp-head" value={ctx.headmasterName} onChange={(v) => setCtx({ ...ctx, headmasterName: v })} />
          <Input label="NIP Kepala Sekolah" id="rpp-headnip" value={ctx.headmasterNip} onChange={(v) => setCtx({ ...ctx, headmasterNip: v })} />
          <Input label="Nama Guru" id="rpp-teacher" value={ctx.teacherName} onChange={(v) => setCtx({ ...ctx, teacherName: v })} />
          <Input label="NIP Guru" id="rpp-teachernip" value={ctx.teacherNip} onChange={(v) => setCtx({ ...ctx, teacherNip: v })} />
          <Input label="Mata Pelajaran" id="rpp-subject" value={ctx.subject} onChange={(v) => setCtx({ ...ctx, subject: v })} />
          <Input label="Kelas" id="rpp-class" value={ctx.classLabel} onChange={(v) => setCtx({ ...ctx, classLabel: v })} />
          <Select
            label="Semester"
            id="rpp-sem"
            value={ctx.semester === "Ganjil" ? "1" : "2"}
            onChange={(v) => setCtx({ ...ctx, semester: v === "1" ? "Ganjil" : "Genap" })}
            options={[{ value: "1", label: "Ganjil" }, { value: "2", label: "Genap" }]}
          />
          <Input label="Tahun Pelajaran" id="rpp-year" value={ctx.academicYearLabel} onChange={(v) => setCtx({ ...ctx, academicYearLabel: v })} />
          <Input label="Fase" id="rpp-fase" value={ctx.fase} onChange={(v) => setCtx({ ...ctx, fase: v })} />
          <Input label="Tempat TTD" id="rpp-place" value={ctx.place} onChange={(v) => setCtx({ ...ctx, place: v })} />
          <Input label="Tanggal" id="rpp-date" type="date" value={ctx.date} onChange={(v) => setCtx({ ...ctx, date: v })} />
        </div>
        <Input label="Alamat Sekolah" id="rpp-addr" value={ctx.schoolAddress} onChange={(v) => setCtx({ ...ctx, schoolAddress: v })} />
      </div>
    </Card>
  );
}
