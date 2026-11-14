/**
 * Rating figures announced by the organiser.
 *
 * They are informational (MMR for Dota 2, Elo for CS2), not limits, so the
 * number is rendered as-is with Russian thousand separators.
 */
export function formatRating(value: number): string {
  return value.toLocaleString("ru-RU");
}

export type TournamentRating = {
  rating_team: number | null;
  rating_player: number | null;
};

/**
 * Label for the public application page: «30 000 на команду · 7 000 на игрока».
 * When the organiser announced nothing, the old wording stays.
 */
export function tournamentRatingLabel(tournament: TournamentRating): string {
  const parts = [
    tournament.rating_team != null
      ? `${formatRating(tournament.rating_team)} на команду`
      : null,
    tournament.rating_player != null
      ? `${formatRating(tournament.rating_player)} на игрока`
      : null,
  ].filter((part): part is string => part !== null);

  return parts.length ? parts.join(" · ") : "не обязателен";
}
