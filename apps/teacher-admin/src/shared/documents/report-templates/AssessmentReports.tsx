import {
  DocumentHeader,
  DocumentTitle,
  DocumentIdentityTable,
  DocumentSection,
  DocumentTable,
} from "../DocumentLayout";
import { ReportFrame, CommonHeader, CommonSignature } from "./ReportFrame";
import type {
  ReportTemplateProps,
  QuestionGridData,
  QuestionCardData,
  ExamPaperData,
} from "./types";
import { upper } from "./helpers";

export function QuestionGridDocument({ data, withPrintArea = true }: ReportTemplateProps<QuestionGridData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader context={data?.context} title="KISI-KISI SOAL" subtitle={data?.assessmentTitle || "Penilaian / Sumatif"} />
      <DocumentTable
        className="question-grid-table"
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "TP/KD", style: { width: '60pt' } }, { content: "Materi", style: { width: '80pt' } }, { content: "Indikator Soal" }, { content: "Level Kognitif", style: { width: '60pt' } }, { content: "Bentuk Soal", style: { width: '60pt' } }, { content: "Nomor Soal", style: { width: '60pt' } }]]}
        rows={(data?.rows ?? []).map((row, index) => [
          row.no ?? index + 1,
          row.competency || "—",
          row.material || "—",
          row.indicator || "—",
          row.cognitiveLevel || "—",
          row.questionForm || "—",
          row.questionNumbers || "—",
        ])}
      />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function QuestionCardDocument({ data, withPrintArea = true }: ReportTemplateProps<QuestionCardData>) {
  const items = data?.items ?? [];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="KARTU SOAL" subtitle={data?.assessmentTitle || "Penilaian / Sumatif"} />
      {items.length > 0 ? items.map((item, index) => (
        <DocumentSection key={`question-card-${index}`} title={`Kartu Soal Nomor ${item.number ?? index + 1}`} className="question-card">
          <DocumentIdentityTable
            columns={1}
            rows={[
              { label: "TP/KD", value: item.competency },
              { label: "Materi", value: item.material },
              { label: "Indikator Soal", value: item.indicator },
              { label: "Level Kognitif", value: item.cognitiveLevel },
              { label: "Bentuk Soal", value: item.questionForm },
              { label: "Kunci Jawaban", value: item.answerKey },
            ]}
          />
          <p className="document-paragraph"><strong>Butir Soal:</strong><br />{item.questionText || "Belum tersedia"}</p>
          {item.options && item.options.length > 0 ? (
            <ol className="question-options" type="A">
              {item.options.map((option) => <li key={option.label}>{option.text}</li>)}
            </ol>
          ) : null}
          <p className="document-paragraph"><strong>Pedoman Penskoran:</strong><br />{item.scoringGuide || "Belum tersedia"}</p>
        </DocumentSection>
      )) : <p className="document-empty-text">Belum tersedia</p>}
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function ExamPaperDocument({ data, withPrintArea = true }: ReportTemplateProps<ExamPaperData>) {
  const instructions = data?.instructions ?? [
    "Berdoalah sebelum mengerjakan soal.",
    "Tuliskan identitas dengan lengkap.",
    "Kerjakan soal dengan teliti dan jujur.",
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <DocumentHeader schoolName={data?.context?.schoolName} schoolAddress={data?.context?.schoolAddress} schoolOffice={data?.context?.schoolOffice} institutionName={data?.context?.institutionName} logoUrl={data?.context?.logoUrl} />
      <DocumentTitle title={upper(data?.title || "NASKAH SOAL")} subtitle={data?.duration ? `Waktu: ${data.duration}` : undefined} />
      <DocumentIdentityTable
        columns={1}
        rows={[
          { label: "Nama Siswa", value: "........................................" },
          { label: "Kelas", value: data?.context?.classLabel || "........................................" },
          { label: "Mata Pelajaran", value: data?.context?.subject },
          { label: "Tahun Pelajaran", value: data?.context?.academicYear },
        ]}
      />
      <DocumentSection title="Petunjuk Pengerjaan">
        <ol className="document-ordered-list">
          {instructions.map((instruction, index) => <li key={`${instruction}-${index}`}>{instruction}</li>)}
        </ol>
      </DocumentSection>
      <DocumentSection title="A. Pilihan Ganda">
        {(data?.multipleChoice ?? []).length > 0 ? (
          <ol className="exam-question-list">
            {(data?.multipleChoice ?? []).map((question, index) => (
              <li key={`pg-${index}`}>
                <div>{question.text}</div>
                {question.options && question.options.length > 0 ? (
                  <ol type="A">
                    {question.options.map((option) => <li key={option.label}>{option.text}</li>)}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        ) : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      <DocumentSection title="B. Esai">
        {(data?.essays ?? []).length > 0 ? (
          <ol className="exam-question-list">
            {(data?.essays ?? []).map((question, index) => <li key={`essay-${index}`}>{question.text}</li>)}
          </ol>
        ) : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
    </ReportFrame>
  );
}
