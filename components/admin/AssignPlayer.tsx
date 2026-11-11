"use client";
import { useState } from "react";
import { Field, Select, Input } from "@/components/ui/Field";
import { CommandForm } from "@/components/player/TeamForms";
type Target = { id: number; version: number; label: string };
export function AssignPlayer({
  profileId,
  targets,
}: {
  profileId: string;
  targets: Target[];
}) {
  const [id, setId] = useState(targets[0]?.id ?? 0);
  const target = targets.find((t) => t.id === id);
  if (!target)
    return (
      <p className="text-sm text-ink-muted">
        Нет заявок команд. Сначала капитан создаёт командную заявку.
      </p>
    );
  return (
    <div className="space-y-4">
      <Field label="Командная заявка" htmlFor="target_application">
        <Select
          id="target_application"
          aria-label="Командная заявка"
          value={id}
          onChange={(e) => setId(Number(e.target.value))}
        >
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <CommandForm
        key={target.id}
        admin
        label="Добавить или переместить игрока"
        variant="primary"
        fields={{
          action: "admin_member",
          application_id: target.id,
          version: target.version,
          profile_id: profileId,
        }}
      >
        <Field label="Место в составе">
          <Select name="slot" aria-label="Место в составе">
            <option value="main">Основной</option>
            <option value="substitute">Запасной</option>
          </Select>
        </Field>
        <Input
          name="reason"
          aria-label="Причина изменения"
          placeholder="Причина изменения"
          required
          maxLength={1000}
        />
      </CommandForm>
      <p className="text-xs text-ink-muted">
        Подтверждение игрока не требуется. Если он уже в другом составе этого турнира,
        перемещение обновит оба состава одной транзакцией.
      </p>
    </div>
  );
}
