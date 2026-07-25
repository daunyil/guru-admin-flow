import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button } from "@shared/ui";
import { listProtaProfiles } from "@shared/db/prota-repo";
import {
  listLessonSessions,
  applyPromesLink,
} from "@shared/db/lesson-session-repo";
import type { ProtaUnit } from "@guru-admin/domain";
import { linkPromesToLessons } from "@guru-admin/domain";
import { DEFAULT_CADANGAN_JP } from "@guru-admin/shared";

interface LinkerSectionProps {
  academicYearId: string;
  semester: 1 | 2;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export function LinkerSection({
  academicYearId,
  semester,
  onError,
  onSuccess,
}: LinkerSectionProps) {
  const [linking, setLinking] = useState(false);
  const [protas, setProtas] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedProtaId, setSelectedProtaId] = useState("");
  const [cadanganJP, setCadanganJP] = useState(DEFAULT_CADANGAN_JP);

  useEffect(() => {
    void (async () => {
      const ps = await listProtaProfiles(academicYearId);
      const options = ps.map((p) => ({ id: p.id, label: `${p.subject} — ${p.grade}` }));
      setProtas(options);
      if (options.length > 0) setSelectedProtaId(options[0].id);
    })();
  }, [academicYearId]);

  async function handleLink() {
    if (!selectedProtaId) {
      onError("Pilih Prota dulu.");
      return;
    }
    setLinking(true);
    try {
      // Load prota + sessions
      const allProtas = await listProtaProfiles(academicYearId);
      const prota = allProtas.find((p) => p.id === selectedProtaId);
      if (!prota) throw new Error("Prota tidak ditemukan");

      const semesterUnits = prota.units.filter((u) => u.semester === semester);
      if (semesterUnits.length === 0) {
        throw new Error(`Tidak ada unit Prota untuk semester ${semester}`);
      }

      const allSessions = await listLessonSessions(academicYearId, semester);
      if (allSessions.length === 0) {
        throw new Error("Belum ada sesi. Generate sesi dulu.");
      }

      // Run linker pure function
      const result = linkPromesToLessons({
        sessions: allSessions,
        units: semesterUnits as ProtaUnit[],
        cadanganJP,
        reserveFromEnd: true,
      });

      if (result.errors.length > 0) {
        onError(result.errors.join("; "));
        setLinking(false);
        return;
      }

      // Apply ke Dexie: update plannedUnitId per session
      const linkedUpdates = result.linkedSessions.map((s) => ({
        id: s.id,
        plannedUnitId: s.plannedUnitId ?? null,
      }));
      await applyPromesLink(linkedUpdates);

      const msg = `${result.summary.distributedJP} JP materi terdistribusi ke ${result.linkedSessions.filter((s) => s.plannedUnitId).length} sesi. ` +
        `${result.summary.cadanganSessions} sesi cadangan. ` +
        `Status: ${result.summary.allocationStatus}.`;
      onSuccess(msg);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal link.");
    } finally {
      setLinking(false);
    }
  }

  if (protas.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Link Promes-Lesson (Assign Materi ke Sesi)"
        description="Distribusikan ProtaUnit ke LessonSession secara massal. Cadangan dari intra capacity (sesuai §0 CRITICAL PROMES RULE)."
      />
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="Prota (Mapel - Kelas)"
            id="link-prota"
            value={selectedProtaId}
            onChange={setSelectedProtaId}
            options={protas.map((p) => ({ value: p.id, label: p.label }))}
          />
          <Input
            label="Cadangan (JP, dari intra)"
            id="link-cad"
            type="number"
            value={String(cadanganJP)}
            onChange={(v) => setCadanganJP(Number(v) || 0)}
            hint="Default 6 JP. Di-reserve dari sesi terakhir."
          />
        </div>
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
          ℹ️ Linker akan meng-assign plannedUnitId ke setiap sesi planned. Sesi cancelled tidak dialokasikan.
          Sesi yang sudah punya plannedUnitId akan di-overwrite.
        </div>
        <Button onClick={handleLink} disabled={linking || !selectedProtaId}>
          {linking ? "Linking..." : "Link Materi ke Sesi"}
        </Button>
      </div>
    </Card>
  );
}
