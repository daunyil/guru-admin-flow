/**
 * LengkapiTab — Tab 1 content for "Lengkapi Dokumen".
 * Shows assignment selector, summary, next docs, and checklist.
 */

import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge, Select } from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";
import { DefaultChecklist } from "./DefaultChecklist";
import type { AdminPackageState } from "./useAdminPackageState";

type LengkapiTabProps = Pick<AdminPackageState,
  | "assignments"
  | "selectedAssignmentId"
  | "setSelectedAssignmentId"
  | "assignment"
  | "year"
  | "lengkapCount"
  | "belumCount"
  | "kosongCount"
  | "totalDocs"
  | "completenessScore"
  | "semesterEnd"
  | "daysToDeadline"
  | "docsByCategory"
  | "nextDocs"
  | "expandedItemId"
  | "setExpandedItemId"
  | "handleExportChecklist"
  | "setActiveTab"
>;

export function LengkapiTab(props: LengkapiTabProps) {
  const {
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    assignment,
    year,
    lengkapCount,
    belumCount,
    kosongCount,
    totalDocs,
    completenessScore,
    semesterEnd,
    daysToDeadline,
    docsByCategory,
    nextDocs,
    expandedItemId,
    setExpandedItemId,
    handleExportChecklist,
    setActiveTab,
  } = props;

  return (
    <>
      {/* Step 1: pilih konteks dulu */}
      <Card className="no-print">
        <CardHeader title="1. Pilih Kelas dan Mapel" description="Pilih dulu agar app hanya menampilkan dokumen yang sesuai kelas, mapel, semester, dan guru." />
        {assignments.length === 0 ? (
          <EmptyState title="Belum ada Kelas dan Mapel" description="Buka menu Kelas dan Mapel untuk membuat assignment dulu." action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>} />
        ) : (
          <div className="space-y-3">
            <Select label="Kelas dan Mapel" id="pkg-asg" value={selectedAssignmentId} onChange={setSelectedAssignmentId} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject} · ${a.teacherName}` }))]} />
            {assignment && (
              <InfoCard entries={[{ label: "Guru", value: assignment.teacherName }, { label: "Mapel", value: assignment.subject }, { label: "Kelas", value: assignment.classLabel }, { label: "Semester", value: String(assignment.semester) }, { label: "Tahun Pelajaran", value: year?.label ?? "-" }]} />
            )}
          </div>
        )}
      </Card>

      {/* Step 2: ringkasan — SELALU tampil, notice bila belum pilih assignment */}
      <Card>
        <CardHeader title="2. Ringkasan Paket" description={assignment ? `${lengkapCount} / ${totalDocs} dokumen lengkap · ${belumCount} belum · ${kosongCount} kosong` : "Pilih kelas & mapel di atas untuk melihat status kelengkapan"} />
        {assignment ? (
          <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Skor Kelengkapan</span><span className="font-bold text-slate-900">{completenessScore}%</span></div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all ${completenessScore >= 80 ? "bg-emerald-500" : completenessScore >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${completenessScore}%` }} />
                </div>
              </div>
              {daysToDeadline !== null && (
                <div className={`p-2 rounded text-xs flex items-center gap-2 ${daysToDeadline < 0 ? "bg-rose-50 text-rose-800" : daysToDeadline <= 14 ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700"}`}>
                  <span className="font-semibold">{daysToDeadline < 0 ? `Akhir semester ${semesterEnd} sudah lewat ${Math.abs(daysToDeadline)} hari` : daysToDeadline === 0 ? "Hari ini adalah akhir semester" : `Akhir semester ${semesterEnd} — sisa ${daysToDeadline} hari`}</span>
                </div>
              )}
            </div>
            <div className="flex md:flex-col gap-2 flex-wrap">
              <Button variant="secondary" className="text-sm" onClick={handleExportChecklist}>Download Checklist</Button>
              <Button variant="secondary" className="text-sm" onClick={() => setActiveTab("preview")}>Preview & Cetak</Button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            Pilih kelas dan mapel di atas untuk melihat skor kelengkapan dan deadline administrasi.
          </div>
        )}
      </Card>

      {/* Step 3: lanjutkan — hanya tampil bila ada assignment dengan dokumen belum lengkap */}
      {assignment && nextDocs.length > 0 && (
        <Card>
          <CardHeader title="3. Lanjutkan yang Belum Selesai" description="Prioritas dokumen yang perlu dibuka agar paket administrasi cepat lengkap." />
          <div className="grid sm:grid-cols-2 gap-3">
            {nextDocs.map((doc) => (
              <Link key={doc.id} to={doc.link}>
                <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold text-sm text-slate-900">{doc.name}</p><p className="text-xs text-slate-500 mt-1">{doc.detail}</p></div>
                    <Badge variant={doc.status === "belum" ? "warning" : "error"}>{doc.status === "belum" ? "Belum" : "Kosong"}</Badge>
                  </div>
                  <p className="text-xs font-semibold text-brand-700 mt-3">{doc.actionLabel ?? "Buka"} →</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Step 4: checklist — SELALU tampil meski belum pilih assignment */}
      {!assignment && (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600 flex items-center gap-2">
          <span className="text-amber-500">⚠</span>
          Checklist 14 dokumen di bawah ditampilkan tanpa status. Pilih kelas & mapel untuk melihat status detail.
        </div>
      )}
      {assignment && docsByCategory.length > 0 ? (
        <div className="space-y-4">
          {docsByCategory.map((group) => (
            <Card key={group.category}>
              <CardHeader title={group.label} description={`${group.items.filter((d) => d.status === "lengkap").length} / ${group.items.length} lengkap`} />
              <div className="space-y-2">
                {group.items.map((doc) => (
                  <div key={doc.id} className={`p-3 border rounded-md ${expandedItemId === doc.id ? "border-brand-300 bg-brand-50" : "border-slate-200"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${doc.status === "lengkap" ? "bg-emerald-500" : doc.status === "belum" ? "bg-amber-500" : "bg-rose-500"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap"><p className="font-medium text-sm">{doc.name}</p>{doc.autoGeneratable && <Badge variant="neutral">Otomatis</Badge>}</div>
                          <p className="text-xs text-slate-500">{doc.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={doc.status === "lengkap" ? "success" : doc.status === "belum" ? "warning" : "error"}>{doc.status === "lengkap" ? "Lengkap" : doc.status === "belum" ? "Belum" : "Kosong"}</Badge>
                        {doc.expandDetails && <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setExpandedItemId(expandedItemId === doc.id ? null : doc.id)}>{expandedItemId === doc.id ? "Tutup" : "Detail"}</Button>}
                        <Link to={doc.link}><Button variant="secondary" className="text-xs px-2 py-1">{doc.actionLabel ?? "Buka"}</Button></Link>
                      </div>
                    </div>
                    {expandedItemId === doc.id && doc.expandDetails && (
                      <div className="mt-3 pt-3 border-t border-slate-200"><p className="text-xs font-semibold text-slate-600 mb-1">Detail:</p><ul className="text-xs text-slate-700 space-y-1 ml-4 list-disc">{doc.expandDetails.map((d, i) => <li key={i}>{d}</li>)}</ul></div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : !assignment ? (
        <DefaultChecklist />
      ) : null}
    </>
  );
}
