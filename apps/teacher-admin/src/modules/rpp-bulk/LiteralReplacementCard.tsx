/**
 * Step 1b: Ganti Teks Identitas Lama (Literal Replacements).
 */

import type { LiteralReplacement } from "@guru-admin/domain";
import { Card, CardHeader, Input, Button } from "../../shared/ui";

interface LiteralMatchPreview {
  oldText: string;
  count: number;
}

interface LiteralReplacementCardProps {
  literalReplacements: LiteralReplacement[];
  validLiterals: LiteralReplacement[];
  liveLiteralMatches: LiteralMatchPreview[];
  onUpdate: (idx: number, field: "oldText" | "newText", value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  inputText: string;
}

export function LiteralReplacementCard({
  literalReplacements,
  validLiterals,
  liveLiteralMatches,
  onUpdate,
  onAdd,
  onRemove,
  inputText,
}: LiteralReplacementCardProps) {
  return (
    <Card>
      <CardHeader
        title="1b. Ganti Teks Identitas Lama (Opsional)"
        description="Untuk RPP yang identitasnya ditulis langsung sebagai teks (bukan kode). Contoh: 'SMA Negeri 1' → 'SMPN 8 Bantan'."
      />
      <div className="space-y-2">
        {literalReplacements.map((r, i) => (
          <div key={i} className="flex gap-2 items-end">
            <Input
              label={i === 0 ? "Teks Lama" : ""}
              id={`rpp-old-${i}`}
              value={r.oldText}
              onChange={(v) => onUpdate(i, "oldText", v)}
              placeholder="SMA Negeri 1"
            />
            <span className="pb-2 text-slate-400">→</span>
            <Input
              label={i === 0 ? "Teks Baru" : ""}
              id={`rpp-new-${i}`}
              value={r.newText}
              onChange={(v) => onUpdate(i, "newText", v)}
              placeholder="SMPN 8 Bantan"
            />
            <Button
              variant="danger"
              className="text-xs px-2 py-2 mb-0"
              onClick={() => onRemove(i)}
              disabled={literalReplacements.length === 1}
            >
              ×
            </Button>
          </div>
        ))}
        <Button variant="secondary" className="text-sm" onClick={onAdd}>
          + Tambah Pasangan
        </Button>
        {validLiterals.length > 0 && inputText && (
          <div className="p-3 bg-slate-50 rounded-md text-xs space-y-1">
            <p className="font-semibold text-slate-700">Preview Literal Match:</p>
            {liveLiteralMatches.map((m, i) => (
              <p key={i}>
                <code>{m.oldText}</code> → ditemukan <strong>{m.count}</strong> kali
              </p>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
