/**
 * DefaultChecklist — 14 dokumen administrasi yang SELALU tampil
 * meskipun belum ada assignment yang dipilih. Guru bisa melihat
 * format dan struktur dokumen yang perlu dilengkapi.
 */

import { Link } from "react-router-dom";
import { Card, CardHeader, Badge, Button } from "@shared/ui";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "./admin-package-types";
import type { DocCategory } from "./admin-package-types";

function DefaultChecklist() {
  const defaultDocs: Array<{ category: DocCategory; name: string; link: string; autoGeneratable: boolean }> = [
    { category: "perencanaan", name: "Program Tahunan (Prota)", link: "/prota", autoGeneratable: false },
    { category: "perencanaan", name: "Program Semester (Promes)", link: "/promes", autoGeneratable: true },
    { category: "perencanaan", name: "Bank TP (Tujuan Pembelajaran)", link: "/atp", autoGeneratable: false },
    { category: "perencanaan", name: "Kalender Pendidikan", link: "/calendar", autoGeneratable: false },
    { category: "perencanaan", name: "Jadwal Mengajar", link: "/schedule", autoGeneratable: false },
    { category: "harian", name: "Daftar Siswa (Roster)", link: "/roster", autoGeneratable: false },
    { category: "harian", name: "Absensi Semester", link: "/attendance", autoGeneratable: false },
    { category: "harian", name: "Jurnal Mengajar", link: "/journal", autoGeneratable: false },
    { category: "evaluasi", name: "Daftar Nilai (GradeBook)", link: "/grades", autoGeneratable: false },
    { category: "evaluasi", name: "Program Remedial", link: "/remedial", autoGeneratable: true },
    { category: "evaluasi", name: "Program Pengayaan", link: "/pengayaan", autoGeneratable: true },
    { category: "dokumen", name: "LKPD (Lembar Kerja Peserta Didik)", link: "/lkpd", autoGeneratable: false },
    { category: "dokumen", name: "RPP / Dokumen Lama (Arsip)", link: "/rpp-bulk", autoGeneratable: false },
    { category: "laporan", name: "Laporan Akhir Semester", link: "/semester-report", autoGeneratable: true },
  ];

  const groups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: defaultDocs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.category}>
          <CardHeader title={group.label} description={`${group.items.length} dokumen`} />
          <div className="space-y-2">
            {group.items.map((doc) => (
              <div key={doc.name} className="p-3 border rounded-md border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-3 h-3 rounded-full shrink-0 bg-slate-300" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{doc.name}</p>
                        {doc.autoGeneratable && <Badge variant="neutral">Otomatis</Badge>}
                      </div>
                      <p className="text-xs text-slate-400">Pilih kelas &amp; mapel untuk melihat status</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="neutral">Menunggu</Badge>
                    <Link to={doc.link}><Button variant="secondary" className="text-xs px-2 py-1">Buka</Button></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export { DefaultChecklist };
