/**
 * AssignmentsPage — manage "Kelas dan Mapel".
 *
 * PATCH-FLOW-RC2C: assignment = (academicYearId, semester, teacherId, subject, classId).
 * Halaman ini untuk:
 *   - Lihat semua assignment untuk semester aktif.
 *   - Tambah assignment manual.
 *   - Auto-generate dari TeachingSchedule (bila jadwal sudah diisi).
 *   - Hapus assignment.
 *
 * Setelah assignment ada, semua flow (Absensi/Jurnal/Nilai/Laporan) otomatis
 * terikat ke assignment context — tidak bercampur antar guru/mapel/kelas.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listAssignments,
  saveAssignment,
  deleteAssignment,
  autoGenerateFromSchedules,
} from "../../shared/db/teaching-assignment-repo";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { listTeachingSchedules } from "../../shared/db/teaching-schedule-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import type {
  AcademicYear,
  TeacherProfile,
  TeachingAssignment,
  ClassRoster,
  TeachingSchedule,
} from "@guru-admin/domain";

export function AssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [schedules, setSchedules] = useState<TeachingSchedule[]>([]);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formClassId, setFormClassId] = useState("");
  const [formClassLabel, setFormClassLabel] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formJpPerWeek, setFormJpPerWeek] = useState(2);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y) {
        setRosters(await listClassRosters(y.id));
        setSchedules(await listTeachingSchedules(y.id));
      }
      setLoading(false);
    })();
  }, []);

  async function reload() {
    if (!year) return;
    setAssignments(await listAssignments(year.id, semester));
  }

  useEffect(() => {
    void reload();
  }, [year, semester]);

  async function handleAdd() {
    if (!year || !teacher) return;
    if (!formClassId || !formSubject) {
      setMessage({ type: "error", text: "Kelas dan mapel wajib diisi." });
      return;
    }
    try {
      await saveAssignment({
        academicYearId: year.id,
        semester,
        teacherId: teacher.id,
        teacherName: teacher.name,
        subject: formSubject,
        classId: formClassId,
        classLabel: formClassLabel || formClassId,
        jpPerWeek: formJpPerWeek,
      });
      setMessage({
        type: "success",
        text: `Assignment ditambah: ${formClassLabel} · ${formSubject}`,
      });
      setFormClassId("");
      setFormClassLabel("");
      setFormSubject("");
      setFormJpPerWeek(2);
      setShowAddForm(false);
      await reload();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal simpan." });
    }
  }

  async function handleAutoGenerate() {
    if (!year || !teacher) return;
    try {
      const result = await autoGenerateFromSchedules({
        academicYear: year,
        teacher,
        schedules,
        semester,
      });
      const parts: string[] = [];
      parts.push(`${result.created.length} assignment baru`);
      if (result.skipped > 0) parts.push(`${result.skipped} sudah ada (skip)`);
      if (result.errors.length > 0) parts.push(`${result.errors.length} error`);
      setMessage({
        type: result.errors.length > 0 ? "error" : "success",
        text: parts.join(", "),
      });
      await reload();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal autogen." });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus assignment ini? Data absensi/jurnal/nilai TIDAK dihapus.")) return;
    await deleteAssignment(id);
    setMessage({ type: "success", text: "Assignment dihapus." });
    await reload();
  }

  function handleRosterPick(rosterId: string) {
    const r = rosters.find((rr) => rr.id === rosterId);
    if (r) {
      setFormClassId(r.classId);
      setFormClassLabel(r.classLabel);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Kelas dan Mapel</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Semester {semester}
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      {/* Semester selector + actions */}
      <Card>
        <div className="flex items-end gap-3 flex-wrap">
          <Select
            label="Semester"
            id="asg-sem"
            value={String(semester)}
            onChange={(v) => setSemester(Number(v) as 1 | 2)}
            options={[
              { value: "1", label: "Semester 1" },
              { value: "2", label: "Semester 2" },
            ]}
          />
          <div className="flex gap-2">
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Batal" : "+ Tambah"}
            </Button>
            <Button variant="secondary" onClick={handleAutoGenerate}>
              Auto-Gen dari Jadwal
            </Button>
          </div>
        </div>
      </Card>

      {/* Add form */}
      {showAddForm && (
        <Card>
          <CardHeader title="Tambah Kelas dan Mapel" description="Pilih kelas dari roster + isi mapel." />
          <div className="grid sm:grid-cols-2 gap-3">
            <Select
              label="Kelas (dari Roster)"
              id="asg-roster"
              value={rosters.find((r) => r.classId === formClassId)?.id ?? ""}
              onChange={handleRosterPick}
              options={[
                { value: "", label: "-- Pilih Kelas --" },
                ...rosters.map((r) => ({ value: r.id, label: r.classLabel })),
              ]}
            />
            <Input
              label="Mapel"
              id="asg-subject"
              value={formSubject}
              onChange={setFormSubject}
              placeholder={teacher?.subjects[0]?.subject ?? "Pendidikan Pancasila"}
            />
            <Input
              label="JP per minggu (intra)"
              id="asg-jp"
              type="number"
              value={String(formJpPerWeek)}
              onChange={(v) => setFormJpPerWeek(Number(v) || 2)}
            />
            <Input
              label="Nama Guru (otomatis)"
              id="asg-teacher"
              value={teacher?.name ?? ""}
              onChange={() => {}}
              hint="Diisi dari profil guru aktif."
            />
          </div>
          <div className="mt-3">
            <Button onClick={handleAdd}>Simpan Assignment</Button>
          </div>
        </Card>
      )}

      {/* List assignments */}
      <Card>
        <CardHeader
          title="Daftar Kelas dan Mapel"
          description={`${assignments.length} assignment untuk semester ${semester}`}
        />
        {assignments.length === 0 ? (
          <EmptyState
            title="Belum ada Kelas dan Mapel"
            description="Tambah manual, atau klik 'Auto-Gen dari Jadwal' bila sudah ada jadwal mengajar."
          />
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="p-3 border border-slate-200 rounded-md flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {a.classLabel} · {a.subject}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.teacherName}
                    {a.jpPerWeek ? ` · ${a.jpPerWeek} JP/minggu` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="neutral">Sem {a.semester}</Badge>
                  <Button
                    variant="secondary"
                    className="text-xs px-2 py-1"
                    onClick={() => handleDelete(a.id)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Info card */}
      <Card>
        <CardHeader title="Cara Pakai" description="Kenapa Kelas dan Mapel penting?" />
        <div className="text-sm text-slate-700 space-y-2">
          <p>
            <strong>1 assignment = 1 paket mengajar</strong> (guru + mapel + kelas + semester + tahun pelajaran).
          </p>
          <p>
            Setelah assignment dibuat, semua modul (Absensi, Jurnal, Nilai, Laporan) otomatis memakai
            context assignment. Data tidak bercampur antar guru/mapel/kelas.
          </p>
          <p>
            <strong>Auto-Gen dari Jadwal</strong>: bila sudah ada jadwal mengajar (menu Jadwal),
            klik tombol ini untuk auto-buat assignment dari setiap kombinasi (kelas, mapel) yang unik.
          </p>
          <p className="text-xs text-slate-500 italic">
            Tip: label yang muncul di modul = "{`{kelas}`} · {`{mapel}`} · {`{guru}`}". Contoh: "VII A · Pendidikan Pancasila · Emi Ramdani".
          </p>
        </div>
      </Card>
    </div>
  );
}
