import { Card, CardHeader, Button, EmptyState, Select } from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";
import type { AcademicYear, TeachingAssignment } from "@guru-admin/domain";

interface AssignmentSelectorCardProps {
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  setSelectedAssignmentId: (id: string) => void;
  assignment: TeachingAssignment | undefined;
  year: AcademicYear | null;
  generating: boolean;
  handleGenerate: () => void;
}

export function AssignmentSelectorCard({
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
  assignment,
  year,
  generating,
  handleGenerate,
}: AssignmentSelectorCardProps) {
  return (
    <Card>
      <CardHeader
        title="1. Pilih Kelas dan Mapel"
        description="Engine akan baca semua data terkait assignment untuk membuat paket."
      />
      {assignments.length === 0 ? (
        <EmptyState
          title="Belum ada Kelas dan Mapel"
          description="Buka menu Kelas dan Mapel untuk membuat assignment dulu."
          action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
        />
      ) : (
        <div className="space-y-3">
          <Select
            label="Kelas dan Mapel"
            id="auto-doc-asg"
            value={selectedAssignmentId}
            onChange={setSelectedAssignmentId}
            options={[
              { value: "", label: "-- Pilih --" },
              ...assignments.map((a) => ({
                value: a.id,
                label: `${a.classLabel} · ${a.subject} · ${a.teacherName}`,
              })),
            ]}
          />
          {assignment && (
            <InfoCard
              entries={[
                { label: "Guru", value: assignment.teacherName },
                { label: "Mapel", value: assignment.subject },
                { label: "Kelas", value: assignment.classLabel },
                { label: "Semester", value: String(assignment.semester) },
                { label: "Tahun Pelajaran", value: year?.label ?? "-" },
              ]}
            />
          )}
          {assignment && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Menyusun..." : "Susun Paket Dokumen"}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
