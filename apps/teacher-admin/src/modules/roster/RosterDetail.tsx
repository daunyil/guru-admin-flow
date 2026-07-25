/**
 * RosterDetail — list + add/remove/edit siswa for a selected roster.
 */

import { useState } from "react";
import { Card, CardHeader, Input, Button } from "@shared/ui";
import type { ClassRoster } from "@guru-admin/domain";

interface RosterDetailProps {
  roster: ClassRoster;
  onChanged: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onRemoveStudent: (rosterId: string, studentId: string) => Promise<void>;
  onAddStudent: (rosterId: string, student: { name: string; number: number }) => Promise<void>;
}

export function RosterDetail({
  roster,
  onChanged,
  onError,
  onSuccess,
  onRemoveStudent,
  onAddStudent,
}: RosterDetailProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState(roster.students.length + 1);

  return (
    <Card>
      <CardHeader title={`Roster ${roster.classLabel}`} description={`${roster.students.length} siswa`} />
      <div className="space-y-2">
        {roster.students.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Belum ada siswa. Klik Import untuk paste dari Excel.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-2 w-12">No</th>
                  <th className="py-2 px-2 w-28">NIS/NISN</th>
                  <th className="py-2 px-2">Nama</th>
                  <th className="py-2 px-2 w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {roster.students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-1.5 px-2">{s.number}</td>
                    <td className="py-1.5 px-2 text-xs text-slate-500">{s.nis ?? "-"}</td>
                    <td className="py-1.5 px-2">{s.name}</td>
                    <td className="py-1.5 px-2">
                      <button
                        className="text-rose-600 hover:underline text-xs"
                        onClick={async () => {
                          await onRemoveStudent(roster.id, s.id);
                          onChanged();
                          onSuccess("Siswa dihapus.");
                        }}
                      >Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd ? (
        <div className="mt-4 p-3 border border-slate-200 rounded-md space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input label="No" id="s-num" type="number" value={String(newNumber)} onChange={(v) => setNewNumber(Number(v))} />
            <div className="col-span-2">
              <Input label="Nama" id="s-name" value={newName} onChange={setNewName} placeholder="Nama siswa" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                if (!newName.trim()) { onError("Nama wajib diisi"); return; }
                await onAddStudent(roster.id, { name: newName.trim(), number: newNumber });
                setNewName("");
                setNewNumber(newNumber + 1);
                onChanged();
                onSuccess("Siswa ditambahkan.");
              }}
            >Tambah</Button>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Selesai</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" onClick={() => setShowAdd(true)}>+ Tambah Siswa Manual</Button>
        </div>
      )}
    </Card>
  );
}
