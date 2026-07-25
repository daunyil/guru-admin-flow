/**
 * Shared utility helpers for Report Center tabs.
 */

import type { SchoolProfile, TeacherProfile } from "@guru-admin/domain";
import type { DocumentContext } from "@shared/documents/ReportTemplates";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export function makeDocContext(
  school?: SchoolProfile,
  teacher?: TeacherProfile,
  extra?: Partial<DocumentContext>,
): DocumentContext {
  return {
    schoolName: school?.name,
    schoolAddress: [school?.village, school?.district, school?.regency].filter(Boolean).join(", "),
    institutionName: school?.name,
    headmasterName: school?.headmasterName,
    headmasterNip: school?.headmasterNip,
    teacherName: teacher?.name,
    teacherNip: teacher?.nip,
    place: school?.regency,
    dateLabel: formatLongDateID(todayISODate()),
    ...extra,
  };
}
