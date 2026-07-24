/**
 * KartuSoalTab — Kartu Soal (Question Card) section.
 * Includes Card Prompt, Paste JSON, Preview, and Document mode.
 */

import { Card, CardHeader, Textarea, Button, Badge } from "../../shared/ui";
import { PrintExportButtons } from "../../shared/ui/PrintExportButtons";
import { QuestionCardDocument } from "../../shared/documents";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import type { AssessmentType, ParseQuestionCardResult } from "@guru-admin/domain";
import type { AcademicYear, SchoolProfile, TeachingAssignment } from "@guru-admin/domain";
import type { QuestionCardItem } from "../../shared/documents";
import type { EvaluationDocsState } from "./useEvaluationDocsState";

interface KartuSoalTabProps {
  cardPrompt: string;
  copyToClipboard: EvaluationDocsState["copyToClipboard"];
  cardJsonInput: string;
  setCardJsonInput: EvaluationDocsState["setCardJsonInput"];
  handleParseCard: EvaluationDocsState["handleParseCard"];
  cardResult: ParseQuestionCardResult | null;
  showDocument: boolean;
  setShowDocument: EvaluationDocsState["setShowDocument"];
  school: SchoolProfile | undefined;
  year: AcademicYear | null;
  assignment: TeachingAssignment | undefined;
  title: string;
  assessmentType: AssessmentType;
}

export function KartuSoalTab({
  cardPrompt,
  copyToClipboard,
  cardJsonInput,
  setCardJsonInput,
  handleParseCard,
  cardResult,
  showDocument,
  setShowDocument,
  school,
  year,
  assignment,
  title,
  assessmentType,
}: KartuSoalTabProps) {
  return (
    <>
      {cardPrompt && (
        <Card>
          <CardHeader title="6. Prompt Kartu Soal untuk Claude" description="Copy, paste ke Claude, tunggu JSON." />
          <Textarea id="qc-prompt" label="" value={cardPrompt} onChange={() => {}} rows={10} />
          <div className="mt-2"><Button variant="secondary" onClick={() => copyToClipboard(cardPrompt)}>Salin Prompt ke AI</Button></div>
        </Card>
      )}

      <Card>
        <CardHeader title="7. Paste JSON Kartu Soal dari Claude" />
        <Textarea id="qc-json" label="" value={cardJsonInput} onChange={setCardJsonInput} rows={8} placeholder='{"questions":[...]}' />
        <div className="mt-2"><Button onClick={handleParseCard} disabled={!cardJsonInput.trim()}>Periksa &amp; Simpan Kartu Soal</Button></div>
      </Card>

      {cardResult?.success && cardResult.questions && (
        <>
          <Card>
            <CardHeader title="8. Preview Kartu Soal" description={`${cardResult.questions.length} soal`} />
            <div className="space-y-3">
              {cardResult.questions.map((q) => (
                <div key={q.questionNumber} className="p-3 border border-slate-200 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="neutral">No. {q.questionNumber}</Badge>
                    <Badge variant={q.questionType === "pg" ? "success" : "warning"}>{q.questionType.toUpperCase()}</Badge>
                    <Badge variant="neutral">{q.cognitiveLevel}</Badge>
                    <Badge variant="neutral">Skor: {q.score}</Badge>
                  </div>
                  <p className="text-sm font-medium">{q.stem}</p>
                  {q.options && (
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      <p>A. {q.options.A} {q.answerKey === "A" && "✓"}</p>
                      <p>B. {q.options.B} {q.answerKey === "B" && "✓"}</p>
                      <p>C. {q.options.C} {q.answerKey === "C" && "✓"}</p>
                      <p>D. {q.options.D} {q.answerKey === "D" && "✓"}</p>
                    </div>
                  )}
                  {q.essayAnswerGuide && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                      <p className="font-semibold">Pedoman Jawaban:</p>
                      <p>{q.essayAnswerGuide}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Preview" : "Mode Dokumen (Cetak)"}
              </Button>
              {showDocument && (
                <PrintExportButtons filename="kartu-soal" title="Kartu Soal" schoolName={school?.name} />
              )}
            </div>
          </Card>

          {showDocument && (
            <QuestionCardDocument
              withPrintArea={true}
              data={{
                context: {
                  schoolName: school?.name,
                  schoolAddress: school?.address,
                  schoolOffice: "Dinas Pendidikan",
                  academicYear: year?.label,
                  semester: assignment!.semester === 1 ? "Ganjil" : "Genap",
                  teacherName: assignment!.teacherName,
                  subject: assignment!.subject,
                  classLabel: assignment!.classLabel,
                  headmasterName: school?.headmasterName,
                  headmasterNip: school?.headmasterNip,
                  place: school?.regency ?? "",
                  dateLabel: formatLongDateID(todayISODate()),
                },
                assessmentTitle: `${title || assessmentType.toUpperCase()} — ${assignment!.subject} ${assignment!.classLabel}`,
                items: cardResult.questions.map((q): QuestionCardItem => ({
                  number: q.questionNumber,
                  competency: "—",
                  material: "—",
                  indicator: "—",
                  cognitiveLevel: q.cognitiveLevel,
                  questionForm: q.questionType === "pg" ? "Pilihan Ganda" : "Esai",
                  questionText: q.stem,
                  options: q.options ? [
                    { label: "A", text: q.options.A },
                    { label: "B", text: q.options.B },
                    { label: "C", text: q.options.C },
                    { label: "D", text: q.options.D },
                  ] : undefined,
                  answerKey: q.answerKey,
                  scoringGuide: q.essayAnswerGuide,
                })),
              }}
            />
          )}
        </>
      )}
    </>
  );
}
