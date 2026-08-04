/**
 * Barrel export for DOCX/XLS exporters.
 * Sprint 6: Promes Merdeka + Rekap Semester landscape exporters.
 * Sprint 7: XLS exporter for Jurnal Mengajar (replaces DOCX).
 *
 * NOTE: promes-docx-exporter moved to @admin/perencanaan/promes/ to avoid
 * boundary violation (@shared must not import from modules).
 * PromesPage imports it directly from its module.
 */

export { downloadDocxBlob } from "./download-helpers";

export {
  exportRekapSemesterDocx,
  type RekapDocxFormat,
  type RekapDocxMeta,
  type AbsensiBulananDocxParams,
  type TatapMukaDocxParams,
  type NilaiDocxParams,
  type JurnalDocxParams,
  type RekapSemesterDocxExportParams,
  type RekapDocxExportResult,
} from "./rekap-semester-docx-exporter";

export {
  exportRekapXls,
  downloadRekapXls,
  downloadJurnalXls,
  type RekapXlsMeta,
  type RekapXlsExportParams,
  type JurnalXlsMeta,
  type JurnalXlsExportParams,
  type AbsensiBulananXlsParams,
  type TatapMukaXlsParams,
  type NilaiXlsParams,
  type JurnalXlsParams,
} from "./rekap-semester-xls-exporter";
