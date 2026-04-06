export type FinalStandingRow = {
  place: number;
  teamName: string;
  note?: string;
};

export type TournamentMvp = {
  nickname: string;
  teamName: string;
  note?: string;
};

export const finalStandings: FinalStandingRow[] = [
  { place: 1, teamName: "Team REHUB", note: "Чемпион" },
  { place: 2, teamName: "Team BLOODY VALENTINE", note: "Финалист" },
  { place: 3, teamName: "Team PUBLIC", note: "Бронза" },
  { place: 4, teamName: "Team G4ZIKI" },
  { place: 5, teamName: "Team ALENDVIC" },
  { place: 6, teamName: "Team НЕДРЫ ЧИЛИ" },
  { place: 7, teamName: "Team ПИЗДАТЫЕ ПЕРМЬ" },
];

export const tournamentMvp: TournamentMvp = {
  nickname: "bodhiq-",
  teamName: "Team REHUB",
  note: "Самый ценный игрок турнира",
};