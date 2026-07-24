/**
 * Paket Administrasi Guru — halaman pusat dokumen per Kelas dan Mapel.
 *
 * GENERATOR-COMPLETION-RC1 Phase 6.
 *
 * Pilih Kelas dan Mapel → app tampilkan checklist 14 dokumen administrasi
 * dengan status lengkap/belum lengkap + tombol preview per dokumen.
 *
 * Dokumen yang dicek:
 *   1. Program Tahunan (Prota)
 *   2. Program Semester (Promes)
 *   3. Bank TP (ATP)
 *   4. Kalender Pendidikan
 *   5. Jadwal Mengajar
 *   6. Daftar Siswa (Roster)
 *   7. Absensi (AttendanceRecord)
 *   8. Jurnal Mengajar
 *   9. Daftar Nilai (GradeBook)
 *  10. Program Remedial
 *  11. Program Pengayaan
 *  12. LKPD
 *  13. RPP (arsip RppDocument)
 *  14. Laporan Akhir Semester
 */

import { Card, Button } from "../../shared/ui";
import { LoadingState } from "../../shared/ui";
import { useAdminPackageState } from "./useAdminPackageState";
import { LengkapiTab } from "./LengkapiTab";
import { PreviewTab } from "./PreviewTab";
import { ModulTab } from "./ModulTab";

export function AdminPackagePage() {
  const state = useAdminPackageState();

  if (state.loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="page-header no-print">
        <h1 className="text-2xl font-bold text-slate-900">Paket Administrasi Guru</h1>
        <p className="text-sm text-slate-500 mt-1">
          {state.year ? `TP ${state.year.label}` : "Belum ada tahun aktif"} · Cek, susun, dan cetak dokumen administrasi berdasarkan kelas dan mapel.
        </p>
      </div>

      {/* ADMIN-PACKAGE-UX-MODED-01: 3 tab */}
      <Card className="no-print">
        <div className="flex gap-2 flex-wrap">
          <Button variant={state.activeTab === "lengkapi" ? "primary" : "secondary"} className="text-sm" onClick={() => state.setActiveTab("lengkapi")}>Lengkapi Dokumen</Button>
          <Button variant={state.activeTab === "preview" ? "primary" : "secondary"} className="text-sm" onClick={() => state.setActiveTab("preview")}>Preview & Cetak Paket</Button>
          <Button variant={state.activeTab === "modul" ? "primary" : "secondary"} className="text-sm" onClick={() => state.setActiveTab("modul")}>Semua Modul</Button>
        </div>
      </Card>

      {state.message && (
        <div className={`info-banner-${state.message.type === "success" ? "success" : "error"} no-print`}>
          {state.message.text}
        </div>
      )}

      {/* ====== TAB 1: LENGKAPI DOKUMEN ====== */}
      {state.activeTab === "lengkapi" && (
        <LengkapiTab
          assignments={state.assignments}
          selectedAssignmentId={state.selectedAssignmentId}
          setSelectedAssignmentId={state.setSelectedAssignmentId}
          assignment={state.assignment}
          year={state.year}
          lengkapCount={state.lengkapCount}
          belumCount={state.belumCount}
          kosongCount={state.kosongCount}
          totalDocs={state.totalDocs}
          completenessScore={state.completenessScore}
          semesterEnd={state.semesterEnd}
          daysToDeadline={state.daysToDeadline}
          docsByCategory={state.docsByCategory}
          nextDocs={state.nextDocs}
          expandedItemId={state.expandedItemId}
          setExpandedItemId={state.setExpandedItemId}
          handleExportChecklist={state.handleExportChecklist}
          setActiveTab={state.setActiveTab}
        />
      )}

      {/* ====== TAB 2: PREVIEW & CETAK PAKET ====== */}
      {state.activeTab === "preview" && (
        <PreviewTab
          assignments={state.assignments}
          selectedAssignmentId={state.selectedAssignmentId}
          setSelectedAssignmentId={state.setSelectedAssignmentId}
          assignment={state.assignment}
          year={state.year}
          teacher={state.teacher}
          school={state.school}
          printDate={state.printDate}
          setPrintDate={state.setPrintDate}
          printTempat={state.printTempat}
          setPrintTempat={state.setPrintTempat}
          printCatatan={state.printCatatan}
          setPrintCatatan={state.setPrintCatatan}
          docs={state.docs}
          lengkapCount={state.lengkapCount}
          belumCount={state.belumCount}
          kosongCount={state.kosongCount}
          totalDocs={state.totalDocs}
          completenessScore={state.completenessScore}
          handleExportChecklist={state.handleExportChecklist}
        />
      )}

      {/* ====== TAB 3: SEMUA MODUL ====== */}
      {state.activeTab === "modul" && (
        <ModulTab />
      )}
    </div>
  );
}
