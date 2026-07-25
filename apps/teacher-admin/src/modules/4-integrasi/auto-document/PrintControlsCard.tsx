import { Card, Button, downloadHTML } from "@shared/ui";
import type { AdminDocumentPackage, SchoolProfile } from "@guru-admin/domain";

interface PrintControlsCardProps {
  showDocument: boolean;
  setShowDocument: (v: boolean) => void;
  pkg: AdminDocumentPackage;
  school: SchoolProfile | undefined;
}

export function PrintControlsCard({ showDocument, setShowDocument, pkg, school }: PrintControlsCardProps) {
  return (
    <Card className="no-print">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowDocument(!showDocument)}>
          {showDocument ? "Mode Ringkasan" : "Mode Dokumen (Cetak)"}
        </Button>
        {showDocument && (
          <>
            <Button variant="secondary" onClick={() => window.print()}>Cetak</Button>
            <Button variant="secondary" onClick={() => {
              const docEl = document.querySelector(".print-area .document-page");
              if (docEl) {
                downloadHTML({
                  filename: `paket-administrasi-${pkg?.assignment.classLabel}-${pkg?.assignment.subject}`.replace(/\s+/g, "-"),
                  title: "Paket Administrasi Guru",
                  content: docEl.innerHTML,
                  schoolName: school?.name,
                });
              }
            }}>Download HTML</Button>
          </>
        )}
      </div>
    </Card>
  );
}
