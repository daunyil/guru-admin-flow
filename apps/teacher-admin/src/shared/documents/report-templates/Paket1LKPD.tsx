import { DocumentSection, DocumentIdentityTable, DocumentTable } from "../DocumentLayout";
import { ReportFrame, CommonHeader } from "./ReportFrame";
import type { ReportTemplateProps, LKPDData } from "./types";
import { upper } from "./helpers";

export function LKPDDocument({ data, withPrintArea = true }: ReportTemplateProps<LKPDData>) {
  const objectives = data?.learningObjectives ?? [];
  const instructions = data?.instructions ?? [];
  const activities = data?.activities ?? [];
  const identityFields = data?.studentIdentityFields ?? ["Nama", "Kelas", "No. Absen", "Kelompok"];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title={upper(data?.title || "LEMBAR KERJA PESERTA DIDIK")} subtitle="LKPD Pembelajaran" />
      <DocumentSection title="Identitas Peserta Didik">
        <DocumentIdentityTable columns={1} rows={identityFields.map((field) => ({ label: field, value: "........................................" }))} />
      </DocumentSection>
      <DocumentSection title="Tujuan Pembelajaran">
        {objectives.length > 0 ? <ol className="document-ordered-list">{objectives.map((objective, index) => <li key={`${objective}-${index}`}>{objective}</li>)}</ol> : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      <DocumentSection title="Petunjuk Pengerjaan">
        {instructions.length > 0 ? <ol className="document-ordered-list">{instructions.map((instruction, index) => <li key={`${instruction}-${index}`}>{instruction}</li>)}</ol> : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      {activities.length > 0 ? activities.map((activity, activityIndex) => (
        <DocumentSection key={`${activity.title}-${activityIndex}`} title={`Kegiatan ${activityIndex + 1}: ${activity.title}`} subtitle={activity.instruction}>
          <DocumentTable headers={[["No", "Pertanyaan/Tugas", "Jawaban"]]} rows={(activity.questions ?? []).map((question, index) => [question.no ?? index + 1, question.text, question.answerSpace || "................................................................................................"])} />
        </DocumentSection>
      )) : <DocumentSection title="Kegiatan Pembelajaran"><p className="document-empty-text">Belum tersedia</p></DocumentSection>}
      <DocumentSection title="Catatan Penilaian">
        <p className="document-paragraph">{data?.assessmentNote || "Penilaian dilakukan berdasarkan kelengkapan jawaban, ketepatan konsep, kerja sama, dan kemampuan menyampaikan pendapat."}</p>
      </DocumentSection>
    </ReportFrame>
  );
}
