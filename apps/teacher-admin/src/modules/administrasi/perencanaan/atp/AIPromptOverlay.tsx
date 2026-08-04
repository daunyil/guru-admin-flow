/**
 * AI Prompt Overlay — lets the teacher copy an AI-ready prompt for a TP entry.
 */

import { Button, CardHeader } from "@shared/ui";
import type { ATPEntry } from "@guru-admin/domain";
import { AI_PROMPT_TYPES, type AIPromptType } from "./atpUtils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AIPromptOverlayProps {
  entry: ATPEntry | null;
  onGenerate: (entry: ATPEntry, type: AIPromptType) => string;
  onCopy: (text: string) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIPromptOverlay({
  entry,
  onGenerate,
  onCopy,
  onClose,
}: AIPromptOverlayProps) {
  if (!entry) return null;

  return (
    <div
      className="doc-overlay no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Prompt AI"
    >
      <div
        className="doc-overlay-card"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <CardHeader
          title="Prompt AI"
          description="Klik Salin lalu paste ke AI eksternal."
        />
        <div className="p-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {AI_PROMPT_TYPES.map((type) => (
              <Button
                key={type}
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={() => {
                  const prompt = onGenerate(entry, type);
                  onCopy(prompt);
                }}
              >
                Salin {type.toUpperCase()}
              </Button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Tidak ada API key. Tidak ada data dikirim. Guru paste manual ke AI.
          </p>
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
