/**
 * AssignmentSelector — Card for selecting Kelas dan Mapel.
 */

import { Card, CardHeader, Select, EmptyState } from "../../shared/ui";
import { InfoCard } from "../../shared/ui/ContextCard";
import type { AcademicYear, TeachingAssignment } from "@guru-admin/domain";
import type { EvaluationDocsState } from "./useEvaluationDocsState";

interface AssignmentSelectorProps {
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  setSelectedAssignmentId: EvaluationDocsState["setSelectedAssignmentId"];
  assignment: TeachingAssignment | undefined;
  year: AcademicYear | null;
}

export function AssignmentSelector({
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
  assignment,
  year,
}: AssignmentSelectorProps) {
  return (
    <Card>
      <CardHeader title="1. Pilih Kelas dan Mapel" description="Filter TP + konteks dari assignment." />
      {assignments.length === 0 ? (
        <EmptyState title="Belum ada Kelas dan Mapel" description="Buka menu Kelas dan Mapel dulu." />
      ) : (
        <div className="space-y-3">
          <Select
            label="Kelas dan Mapel"
            id="ev-asg"
            value={selectedAssignmentId}
            onChange={setSelectedAssignmentId}
            options={[
              { value: "", label: "-- Pilih --" },
              ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject} · ${a.teacherName}` })),
            ]}
          />
          {assignment && (
            <InfoCard entries={[
              { label: "Guru", value: assignment.teacherName },
              { label: "Mapel", value: assignment.subject },
              { label: "Kelas", value: assignment.classLabel },
              { label: "Semester", value: String(assignment.semester) },
              { label: "Tahun", value: year?.label ?? "-" },
            ]} />
          )}
        </div>
      )}
    </Card>
  );
}
