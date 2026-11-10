/** Legacy game names are free text; never infer another game's rating. */
export function isDota(game: string): boolean {
  return /^(dota\s*2|dota2)$/i.test(game.trim());
}
