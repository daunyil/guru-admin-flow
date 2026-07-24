/**
 * Daftar Placeholder Didukung — info card showing available placeholders.
 */

import type { RppIdentityContext } from "@guru-admin/domain";
import { RPP_IDENTITY_PLACEHOLDERS, buildPlaceholderMap } from "@guru-admin/domain";
import { Card, CardHeader } from "../../shared/ui";

interface PlaceholderReferenceCardProps {
  ctx: RppIdentityContext;
}

export function PlaceholderReferenceCard({ ctx }: PlaceholderReferenceCardProps) {
  return (
    <Card>
      <CardHeader title="Daftar Placeholder Didukung" description="Tempel placeholder ini di RPP lama untuk auto-replace." />
      <div className="grid sm:grid-cols-3 gap-2 text-xs">
        {RPP_IDENTITY_PLACEHOLDERS.map((ph) => {
          const map = buildPlaceholderMap(ctx);
          return (
            <div key={ph} className="p-2 bg-slate-50 rounded">
              <code className="text-brand-700">{ph}</code>
              <p className="text-slate-600 mt-1">→ {map[ph] || "(kosong)"}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
