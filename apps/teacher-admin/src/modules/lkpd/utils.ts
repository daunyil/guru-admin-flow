import { formatLongDateID } from "@guru-admin/shared";

/**
 * DOCUMENT-OUTPUT-FIXPACK-01: safe date formatting — tidak crash bila createdAt
 * malformed/missing (mis. data lama hasil migrasi atau backup restore bug).
 */
export function safeFormatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  try {
    return formatLongDateID(iso);
  } catch {
    return iso.slice(0, 10) ?? "-";
  }
}
