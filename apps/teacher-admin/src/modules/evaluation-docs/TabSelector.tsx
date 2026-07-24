/**
 * TabSelector — Card with tab buttons for switching between evaluation doc sections.
 */

import { Card, Button } from "../../shared/ui";
import type { Tab } from "./evaluation-docs-types";
import type { EvaluationDocsState } from "./useEvaluationDocsState";

interface TabSelectorProps {
  tab: Tab;
  setTab: EvaluationDocsState["setTab"];
  setShowDocument: EvaluationDocsState["setShowDocument"];
  blueprintResult: EvaluationDocsState["blueprintResult"];
}

export function TabSelector({
  tab,
  setTab,
  setShowDocument,
  blueprintResult,
}: TabSelectorProps) {
  return (
    <Card>
      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === "minggu-efektif" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("minggu-efektif"); setShowDocument(false); }}>Minggu Efektif</Button>
        <Button variant={tab === "kktp-analisis" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kktp-analisis"); setShowDocument(false); }}>Analisis KKTP</Button>
        <Button variant={tab === "kisi-kisi" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kisi-kisi"); setShowDocument(false); }}>Kisi-kisi Soal</Button>
        <Button variant={tab === "kartu-soal" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kartu-soal"); setShowDocument(false); }} disabled={!blueprintResult?.success}>Kartu Soal</Button>
        <Button variant={tab === "kisi-kisi-soal" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kisi-kisi-soal"); setShowDocument(false); }}>Kisi-Kisi Penulisan Soal</Button>
      </div>
    </Card>
  );
}
