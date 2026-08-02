import type { LessonSession } from "@guru-admin/domain";

/* ============================================================ */
/*  Cascading Selector Types                                     */
/* ============================================================ */

export type ClassOption = {
  classId: string;
  classLabel: string;
};

export type SubjectOption = {
  subject: string;
  classId: string;
};

export type SessionOption = {
  session: LessonSession;
  meetingNumber: number;
  statusLabel: string;
  statusIcon: string;
  isToday: boolean;
  isDone: boolean;
  isUnfilled: boolean;
};

/* ============================================================ */
/*  Structured Note Types                                        */
/* ============================================================ */

/** Must match keys of STRUCTURED_NOTE_CATEGORIES in ./constants */
export type StructuredNoteCategory = "activities" | "studentResponse" | "obstacle" | "followUp";

export type StructuredNoteState = {
  activities: string[];
  studentResponse: string[];
  obstacle: string[];
  followUp: string[];
};

/* ============================================================ */
/*  Dashboard Types                                              */
/* ============================================================ */

export type SessionStatus = "done" | "partial" | "unfilled";

export type DashboardCard = {
  session: LessonSession;
  status: SessionStatus;
  statusLabel: string;
  statusIcon: string;
  attendanceSummary: string;
  hasJournal: boolean;
  journalLocked: boolean;
  realizationStatus: string;
  meetingNumber: number;
};

export type DashboardClassGroup = {
  classId: string;
  classLabel: string;
  cards: DashboardCard[];
};

export type DaySummary = {
  total: number;
  done: number;
  partial: number;
  unfilled: number;
};

/* ============================================================ */
/*  Re-export StepState from AccordionCard (backward compat)     */
/* ============================================================ */

export type { StepState } from "@shared/ui/mobile/AccordionCard";
