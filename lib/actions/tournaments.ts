"use server";

import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guard";
import { writeClient } from "@/lib/supabase/write";
import { audit } from "@/lib/audit";
import { invalidate } from "@/lib/actions/revalidate";
import { tags } from "@/lib/cache/tags";
import { fail, parseForm, type ActionState } from "@/lib/actions/state";
import { tournamentIdSchema, tournamentSchema } from "@/lib/validation/schemas";
import { fromDateTimeLocal } from "@/lib/format/date";
import type { Tournament } from "@/lib/types/database";

export async function saveTournamentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const parsed = parseForm(tournamentSchema, formData);
  if (parsed.state) return parsed.state;

  const input = parsed.data;
  const client = writeClient();
  const zone = input.time_zone;

  const row = {
    slug: input.slug,
    name: input.name,
    edition: input.edition,
    status: input.status,
    starts_at: input.starts_at ? fromDateTimeLocal(input.starts_at, zone) : null,
    ends_at: input.ends_at ? fromDateTimeLocal(input.ends_at, zone) : null,
    time_zone: zone,
    format_summary: input.format_summary,
    description: input.description,
    prize_pool: input.prize_pool,
    stream_url: input.stream_url,
    telegram_url: input.telegram_url,
    logo_url: input.logo_url,
  };

  const existingId = formData.get("tournament_id");
  const isUpdate = existingId !== null && existingId !== "";

  if (isUpdate) {
    const { error } = await client
      .from("tournaments")
      .update(row)
      .eq("id", Number(existingId));

    if (error) return fail(`Не удалось сохранить турнир: ${error.message}`);

    await audit({
      action: "tournament.update",
      entity: "tournament",
      entityId: Number(existingId),
      summary: `Обновлён турнир ${row.name}`,
      payload: row,
    });
  } else {
    const { data, error } = await client
      .from("tournaments")
      .insert(row)
      .select("id")
      .single();

    if (error) return fail(`Не удалось создать турнир: ${error.message}`);

    await audit({
      action: "tournament.create",
      entity: "tournament",
      entityId: (data as { id: number }).id,
      summary: `Создан турнир ${row.name}`,
      payload: row,
    });
  }

  invalidate(tags.tournaments(), tags.tournament(input.slug));
  redirect(`/admin/t/${input.slug}`);
}

export async function setCurrentTournamentAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const parsed = parseForm(tournamentIdSchema, formData);
  if (parsed.state) throw new Error(parsed.state.error ?? "Некорректный запрос");

  const client = writeClient();
  const id = parsed.data.tournament_id;

  const { data: target, error: loadError } = await client
    .from("tournaments")
    .select("id, slug, name")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !target) {
    throw new Error("Турнир не найден");
  }

  // The partial unique index allows only one current tournament, so clear the
  // old one first.
  const cleared = await client
    .from("tournaments")
    .update({ is_current: false })
    .eq("is_current", true);

  if (cleared.error) throw new Error(cleared.error.message);

  const { error } = await client
    .from("tournaments")
    .update({ is_current: true })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { slug, name } = target as Pick<Tournament, "slug" | "name">;

  await audit({
    action: "tournament.set_current",
    entity: "tournament",
    entityId: id,
    summary: `Текущим турниром выбран ${name}`,
  });

  invalidate(tags.tournaments(), tags.tournament(slug));
}

export async function deleteTournamentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const id = Number(formData.get("tournament_id"));
  const slug = String(formData.get("slug") ?? "");
  const confirmation = String(formData.get("confirm_slug") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0 || !slug) {
    return fail("Некорректный запрос");
  }

  if (confirmation !== slug) {
    return fail(
      `Для удаления введите слаг турнира (${slug}) — это удалит все матчи, команды и результаты.`,
    );
  }

  const { error } = await writeClient().from("tournaments").delete().eq("id", id);
  if (error) return fail(`Не удалось удалить турнир: ${error.message}`);

  await audit({
    action: "tournament.delete",
    entity: "tournament",
    entityId: id,
    summary: `Удалён турнир ${slug}`,
  });

  invalidate(tags.tournaments(), tags.tournament(slug));

  redirect("/admin");
}
