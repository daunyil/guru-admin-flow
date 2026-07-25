/**
 * PATCH-01B: Import Data Siswa — paste Excel, preview, simpan ke roster.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §3 (updated)
 *
 * Flow: Pilih Kelas → Paste Excel/Upload CSV → Preview → Cek duplikat → Simpan
 *
 * This file is now a slim orchestrator — state logic lives in useRosterState,
 * UI sections live in dedicated sub-component files.
 */

import { useRosterState } from "./useRosterState";
import { RosterHeader } from "./RosterHeader";
import { NewRosterForm } from "./NewRosterForm";
import { ImportModal } from "./ImportModal";
import { RosterDetail } from "./RosterDetail";
import { Card, CardHeader, Button, EmptyState, Badge, LoadingState } from "@shared/ui";

export function RosterPage() {
  const {
    loading,
    year,
    rosters,
    selectedId,
    setSelectedId,
    showNew,
    setShowNew,
    showImport,
    setShowImport,
    error,
    setError,
    success,
    setSuccess,
    selected,
    reload,
    handleImportStudents,
    handleRemoveStudent,
    handleAddStudent,
  } = useRosterState();

  if (loading) return <LoadingState />;

  if (!year) {
    return (
      <div className="space-y-4">
        <RosterHeader />
        <Card><EmptyState title="Belum ada tahun pelajaran aktif" description="Buat tahun pelajaran dulu di menu Profil." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RosterHeader yearLabel={year.label} count={rosters.length} />

      {error && <div className="info-banner-error" role="status" aria-live="polite">{error}</div>}
      {success && <div className="info-banner-success" role="status" aria-live="polite">{success}</div>}

      <div className="flex gap-2">
        <Button onClick={() => setShowNew(true)}>+ Buat Kelas</Button>
        <Button variant="secondary" onClick={() => selected ? setShowImport(true) : setError("Pilih kelas dulu")}>
          Import Siswa (Paste Excel)
        </Button>
      </div>

      {showNew && (
        <NewRosterForm
          academicYearId={year.id}
          onClose={() => setShowNew(false)}
          onSaved={(r) => { setShowNew(false); setSelectedId(r.id); setSuccess(`Kelas ${r.classLabel} dibuat.`); void reload(); }}
          onError={(msg) => setError(msg)}
        />
      )}

      {showImport && selected && (
        <ImportModal
          roster={selected}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); setSuccess("Siswa diimpor."); void reload(); }}
          onError={(msg) => setError(msg)}
          onImportStudents={handleImportStudents}
        />
      )}

      <Card>
        <CardHeader title="Daftar Kelas" description={`${rosters.length} kelas`} />
        {rosters.length === 0 ? (
          <EmptyState title="Belum ada kelas" description="Buat kelas dulu, lalu import siswa." />
        ) : (
          <div className="space-y-2">
            {rosters.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  selectedId === r.id ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{r.classLabel}</span>
                    <Badge variant="neutral">{r.students.length} siswa</Badge>
                  </div>
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => { setShowImport(true); setSelectedId(r.id); }}>
                    Import
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <RosterDetail
          roster={selected}
          onChanged={() => { void reload(); }}
          onError={(msg) => setError(msg)}
          onSuccess={(msg) => setSuccess(msg)}
          onRemoveStudent={handleRemoveStudent}
          onAddStudent={handleAddStudent}
        />
      )}
    </div>
  );
}
