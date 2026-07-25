import { useEffect, useState } from "react";
import {
  listLKPDs,
  saveLKPD,
  updateLKPD,
  deleteLKPD,
  finalizeLKPD,
} from "@shared/db/lkpd-repo";
import { listATPEntries } from "@shared/db/atp-entry-repo";
import { listClassRosters } from "@shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "@shared/db/profile-repo";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  ATPEntry,
  LKPD,
  ClassRoster,
} from "@guru-admin/domain";
import type { LKPDFormData, MessageBanner } from "./types";

export function useLKPDState() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [lkpds, setLkpds] = useState<LKPD[]>([]);
  const [atpEntries, setAtpEntries] = useState<ATPEntry[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LKPD | null>(null);
  const [previewing, setPreviewing] = useState<LKPD | null>(null);
  const [message, setMessage] = useState<MessageBanner>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([
        getActiveAcademicYear(),
        getTeacherProfile(),
        getSchoolProfile(),
      ]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (y && tp) {
        const [ls, atps, rs] = await Promise.all([
          listLKPDs({ academicYearId: y.id, teacherId: tp.id }),
          listATPEntries({ academicYearId: y.id, teacherId: tp.id }),
          listClassRosters(y.id),
        ]);
        setLkpds(ls);
        setAtpEntries(atps);
        setRosters(rs);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  async function reload() {
    if (!year || !teacher) return;
    setLkpds(await listLKPDs({ academicYearId: year.id, teacherId: teacher.id }));
  }

  async function handleSave(data: LKPDFormData) {
    if (!year || !teacher) return;
    try {
      if (editing) {
        await updateLKPD(editing.id, data);
        setMessage({ type: "success", text: "LKPD diperbarui." });
      } else {
        await saveLKPD({
          ...data,
          academicYearId: year.id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: "draft",
        });
        setMessage({ type: "success", text: "LKPD ditambahkan." });
      }
      setShowForm(false);
      setEditing(null);
      void reload();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal simpan." });
    }
  }

  // UX-DOC-01: konfirmasi sebelum finalkan
  async function handleFinalize(id: string) {
    const ok = window.confirm(
      "Finalkan LKPD? Setelah final, LKPD tidak bisa diedit langsung. " +
      "Untuk mengubah, gunakan tombol 'Buka Revisi' terlebih dahulu."
    );
    if (!ok) return;
    try {
      const result = await finalizeLKPD(id);
      if (result.success) {
        setMessage({ type: "success", text: "LKPD difinalkan." });
        void reload();
      } else {
        setMessage({ type: "error", text: result.errors.join(", ") });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal finalisasi LKPD." });
    }
  }

  // UX-DOC-02: Buka Revisi — ubah status final → draft supaya bisa edit lagi
  async function handleOpenRevision(lkpd: LKPD) {
    const ok = window.confirm(
      `Buka revisi untuk "${lkpd.title}"? Status akan kembali ke Draf dan LKPD bisa diedit lagi.`
    );
    if (!ok) return;
    try {
      await updateLKPD(lkpd.id, { status: "draft" as const, finalizedAt: null });
      setMessage({ type: "success", text: "LKPD dibuka untuk revisi (status: Draf)." });
      void reload();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal membuka revisi LKPD." });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus LKPD ini?")) return;
    try {
      await deleteLKPD(id);
      setMessage({ type: "success", text: "LKPD dihapus." });
      void reload();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal menghapus LKPD." });
    }
  }

  function openCreateForm() {
    setEditing(null);
    setShowForm(true);
  }

  function openEditForm(lkpd: LKPD) {
    setEditing(lkpd);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function openPreview(lkpd: LKPD) {
    setPreviewing(lkpd);
  }

  function closePreview() {
    setPreviewing(null);
  }

  return {
    loading,
    year,
    teacher,
    school,
    lkpds,
    atpEntries,
    rosters,
    showForm,
    editing,
    previewing,
    message,
    handleSave,
    handleFinalize,
    handleOpenRevision,
    handleDelete,
    openCreateForm,
    openEditForm,
    closeForm,
    openPreview,
    closePreview,
  };
}
