import type { LKPD } from "@guru-admin/domain";

/** The shape of data passed to save/update an LKPD. */
export type LKPDFormData = Omit<
  LKPD,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "syncStatus"
  | "academicYearId"
  | "teacherId"
  | "status"
  | "finalizedAt"
>;

/** Message banner shown after actions. */
export type MessageBanner = {
  type: "success" | "error";
  text: string;
} | null;
