import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/auth/guard";
import { adminAudit } from "@/lib/queries/admin";
import { formatDateTime } from "@/lib/format/date";

export default async function AdminAuditPage() {
  await requireAdmin();

  const entries = await adminAudit(200);

  return (
    <AdminShell
      title="Журнал изменений"
      subtitle="Что и когда менялось в турнирах — включая неудачные попытки входа"
    >
      <Card>
        <CardHeader title="Последние действия" hint={`Записей: ${entries.length}`} />
        <div className="p-5">
          {entries.length === 0 ? (
            <EmptyState title="Журнал пуст" />
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-control border border-edge bg-surface-sunken/60 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{entry.summary ?? entry.action}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {entry.action} · {entry.entity}
                      {entry.entity_id ? ` #${entry.entity_id}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-ink-faint tabular-nums">
                    {formatDateTime(entry.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </AdminShell>
  );
}
