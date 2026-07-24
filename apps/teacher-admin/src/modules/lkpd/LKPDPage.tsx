/**
 * LKPD — Lembar Kerja Peserta Didik.
 *
 * APP-USABLE-RC1 Issue 4: LKPD jadi modul nyata, bukan cuma prompt AI.
 *
 * Fitur:
 *   - List LKPD per guru (filter by subject/class optional)
 *   - Buat LKPD dari TP (pilih ATPEntry → auto-fill subject/grade/TP)
 *   - Form lengkap: judul, tujuan, alat/bahan, langkah, pertanyaan pemandu, penilaian
 *   - Simpan Draft vs Setujui & Finalkan
 *   - Preview/cetak sederhana (mode dokumen)
 *   - Terikat ke (academicYearId, teacherId, subject, classId?) + atpEntryId
 */

import { Card, Button, EmptyState } from "../../shared/ui";
import { LoadingState } from "../../shared/ui";
import { useLKPDState } from "./useLKPDState";
import { LKPDForm } from "./LKPDForm";
import { LKPDPreview } from "./LKPDPreview";
import { LKPDItemCard } from "./LKPDItemCard";

export function LKPDPage() {
  const {
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
  } = useLKPDState();

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">LKPD</h1>
        <p className="text-sm text-slate-500 mt-1">
          Lembar Kerja Peserta Didik · {year ? `TP ${year.label}` : "Belum ada tahun aktif"}
        </p>
      </div>

      {(!year || !teacher) && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-xl">⚠</span>
            <div>
              <p className="font-semibold text-amber-900">Profil/tahun belum lengkap</p>
              <p className="text-sm text-amber-800 mt-1">Lengkapi profil sekolah dan guru terlebih dahulu untuk menggunakan fitur LKPD.</p>
              <Button variant="secondary" className="text-sm mt-2" onClick={() => (window.location.hash = "#/profile")}>Lengkapi Profil</Button>
            </div>
          </div>
        </Card>
      )}

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      <Card>
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            Buat LKPD dari TP. LKPD wajib terikat ke Tujuan Pembelajaran.
          </p>
          <Button onClick={openCreateForm} disabled={!year || !teacher || atpEntries.length === 0}>
            + Buat LKPD
          </Button>
        </div>
        {atpEntries.length === 0 ? (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm font-semibold text-amber-900">Belum ada TP (Tujuan Pembelajaran)</p>
            <p className="text-xs text-amber-800 mt-1">
              LKPD wajib terikat ke TP. Tambah TP dulu di menu <strong>Bank TP</strong> (import dari ATP atau input manual). Setelah TP ada, tombol "Buat LKPD" akan aktif.
            </p>
            <Button variant="secondary" className="text-xs mt-2" onClick={() => (window.location.hash = "#/atp")}>
              Buka Bank TP
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-2">
            {atpEntries.length} TP tersedia · {rosters.length} kelas terdaftar
          </p>
        )}
      </Card>

      {showForm && (
        <LKPDForm
          editing={editing}
          atpEntries={atpEntries}
          rosters={rosters}
          defaultTeacherName={teacher?.name ?? ""}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}

      {lkpds.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada LKPD"
            description="Buat LKPD pertama dari TP yang sudah ada."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {lkpds.map((l) => (
            <LKPDItemCard
              key={l.id}
              lkpd={l}
              onPreview={() => openPreview(l)}
              onEdit={() => openEditForm(l)}
              onFinalize={() => handleFinalize(l.id)}
              onOpenRevision={() => handleOpenRevision(l)}
              onDelete={() => handleDelete(l.id)}
            />
          ))}
        </div>
      )}

      {previewing && (
        <LKPDPreview
          lkpd={previewing}
          schoolName={school?.name ?? "Sekolah"}
          teacherName={teacher?.name ?? "Guru"}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
