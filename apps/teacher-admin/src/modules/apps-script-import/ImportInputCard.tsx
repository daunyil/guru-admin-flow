import { Card, CardHeader, Button, Textarea } from "../../shared/ui";
import type { AppsScriptImportState } from "./useAppsScriptImportState";

interface ImportInputCardProps {
  state: AppsScriptImportState;
}

export function ImportInputCard({ state }: ImportInputCardProps) {
  return (
    <Card>
      <CardHeader
        title="1. Masukkan JSON dari file export HP"
        description="Upload file .json atau paste teks file export."
      />
      <div className="space-y-3">
        <div>
          <label className="label">Upload File JSON (opsional)</label>
          <input
            ref={state.fileInputRef as React.Ref<HTMLInputElement>}
            type="file"
            accept=".json,application/json"
            onChange={state.handleFileUpload}
            className="input"
          />
          {state.filename && <p className="text-xs text-slate-500 mt-1">File: {state.filename}</p>}
        </div>

        <Textarea
          label="Atau Paste JSON"
          id="as-json"
          value={state.inputText}
          onChange={state.handleInputChange}
          rows={10}
          placeholder='{"source":"apps_script","exportedAt":"...","academicYearLabel":"2025/2026","semester":1,"students":[...],"gurus":[...],"absensi":[...],"jurnal":[...],"nilai":[...]}'
        />

        <div className="flex gap-2 flex-wrap">
          <Button onClick={state.handleValidate} disabled={!state.inputText.trim()}>
            Validasi & Preview
          </Button>
          <Button variant="secondary" onClick={state.handleLoadSample}>
            Muat Contoh JSON
          </Button>
        </div>
      </div>
    </Card>
  );
}
