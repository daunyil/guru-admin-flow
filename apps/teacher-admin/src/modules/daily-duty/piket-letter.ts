import type { DutyRecord } from "@guru-admin/domain";

export type PiketLetterType = "parent_summons" | "student_statement";

export type BuildPiketLetterInput = {
  letterType: PiketLetterType;
  schoolName: string;
  schoolAddress?: string;
  principalName?: string;
  principalNip?: string;
  date: string;
  place?: string;
  studentName: string;
  studentNumber?: number;
  classLabel: string;
  totalPoints: number;
  totalRecords: number;
  statusLabel: string;
  records: DutyRecord[];
  dutyTeacherName: string;
};

export type PiketLetterRecordRow = {
  date: string;
  violation: string;
  points: number;
  note?: string;
};

export type PiketLetterDocument = {
  letterType: PiketLetterType;
  title: string;
  schoolName: string;
  schoolAddress?: string;
  place?: string;
  date: string;
  opening: string;
  studentIdentity: Array<{ label: string; value: string }>;
  bodyParagraphs: string[];
  recordRows: PiketLetterRecordRow[];
  additionalNote?: string;
  closing: string;
  signatureBlocks: Array<{ role: string; name?: string; nip?: string }>;
};

const MAX_RECORD_ROWS = 10;

export function buildPiketLetter(input: BuildPiketLetterInput): PiketLetterDocument {
  return input.letterType === "student_statement"
    ? buildStudentStatementLetter(input)
    : buildParentSummonsLetter(input);
}

export function buildParentSummonsLetter(input: BuildPiketLetterInput): PiketLetterDocument {
  return {
    letterType: "parent_summons",
    title: "SURAT PANGGILAN ORANG TUA/WALI SISWA",
    schoolName: input.schoolName,
    schoolAddress: input.schoolAddress,
    place: input.place,
    date: input.date,
    opening: "Dengan hormat,",
    studentIdentity: buildStudentIdentity(input),
    bodyParagraphs: [
      "Berdasarkan catatan kedisiplinan siswa pada buku piket sekolah, kami mengundang Bapak/Ibu orang tua/wali dari siswa berikut untuk hadir ke sekolah dalam rangka pembinaan dan klarifikasi terhadap beberapa catatan yang telah tercatat.",
      "Sehubungan dengan hal tersebut, kami mengharapkan kehadiran Bapak/Ibu di sekolah untuk berdiskusi bersama pihak sekolah mengenai langkah pembinaan yang tepat bagi siswa.",
      "Demikian surat panggilan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.",
    ],
    recordRows: buildRecordRows(input.records),
    additionalNote: buildAdditionalNote(input.records.length),
    closing: "Hormat kami,",
    signatureBlocks: [
      { role: "Guru Piket / Wali Kelas", name: input.dutyTeacherName },
      { role: "Kepala Sekolah", name: input.principalName, nip: input.principalNip },
    ],
  };
}

export function buildStudentStatementLetter(input: BuildPiketLetterInput): PiketLetterDocument {
  return {
    letterType: "student_statement",
    title: "SURAT PERNYATAAN SISWA",
    schoolName: input.schoolName,
    schoolAddress: input.schoolAddress,
    place: input.place,
    date: input.date,
    opening: "Saya yang bertanda tangan di bawah ini:",
    studentIdentity: buildStudentIdentity(input),
    bodyParagraphs: [
      "Dengan ini menyatakan bahwa saya telah mengetahui dan memahami catatan yang tercatat dalam buku piket sekolah.",
      "Saya berjanji akan memperbaiki sikap, menaati tata tertib sekolah, serta tidak mengulangi kesalahan yang sama di kemudian hari.",
      "Apabila saya mengulangi kesalahan tersebut, saya bersedia menerima pembinaan dan tindak lanjut sesuai ketentuan yang berlaku di sekolah.",
    ],
    recordRows: buildRecordRows(input.records),
    additionalNote: buildAdditionalNote(input.records.length),
    closing: "Demikian surat pernyataan ini saya buat dengan sebenar-benarnya dan penuh kesadaran.",
    signatureBlocks: [
      { role: "Mengetahui, Guru Piket / Wali Kelas", name: input.dutyTeacherName },
      { role: "Siswa yang Membuat Pernyataan", name: input.studentName },
      { role: "Orang Tua/Wali" },
    ],
  };
}

function buildStudentIdentity(input: BuildPiketLetterInput): Array<{ label: string; value: string }> {
  return [
    { label: "Nama Siswa", value: input.studentName },
    { label: "Kelas", value: input.classLabel },
    { label: "Nomor Absen", value: input.studentNumber ? String(input.studentNumber) : "-" },
    { label: "Jumlah Kejadian", value: `${input.totalRecords} kejadian` },
    { label: "Total Poin", value: `${input.totalPoints} poin` },
    { label: "Status Pembinaan", value: input.statusLabel },
  ];
}

function buildRecordRows(records: DutyRecord[]): PiketLetterRecordRow[] {
  return [...records]
    .filter((r) => !r.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_RECORD_ROWS)
    .map((r) => ({
      date: r.date,
      violation: r.ruleLabel,
      points: r.points,
      note: r.note,
    }));
}

function buildAdditionalNote(recordCount: number): string | undefined {
  if (recordCount <= MAX_RECORD_ROWS) return undefined;
  return "Catatan lainnya tersimpan dalam rekap piket sekolah.";
}
