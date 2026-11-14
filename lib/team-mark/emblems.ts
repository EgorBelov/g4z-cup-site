/**
 * Team emblems.
 *
 * A fixed set of monochrome pictograms drawn in a 100×100 box. Every glyph lives
 * inside the same 12…88 safe area and is centred optically, so any two emblems
 * look equally sized regardless of where they are rendered. Knockouts (eyes,
 * windows, pips) are holes in a single evenodd path, so the mark stays clean on
 * any background and exports to PNG without a background colour.
 */
export type Emblem = {
  id: string;
  label: string;
  /** One evenodd path: the silhouette plus its holes. */
  path: string;
};

const emblems: Emblem[] = [
  {
    id: "crown",
    label: "Корона",
    path: "M24 66V34l16 14 10-20 10 20 16-14v32Z M24 70h52v10H24Z",
  },
  {
    id: "bolt",
    label: "Молния",
    path: "M58 6 24 54h20l-6 40 34-48H52Z",
  },
  {
    id: "crosshair",
    label: "Прицел",
    path: "M50 10a40 40 0 1 0 .01 0Z M50 18a32 32 0 1 1-.01 0Z M47 2h6v10h-6Z M47 88h6v10h-6Z M2 47h10v6H2Z M88 47h10v6H88Z M50 44a6 6 0 1 0 .01 0Z",
  },
  {
    id: "trophy",
    label: "Кубок",
    path: "M30 10h40v16c0 16-9 27-20 27S30 42 30 26Z M24 16h6v10c0 8 4 13 10 15l-2 6c-9-2-14-10-14-21Z M76 16h-6v10c0 8-4 13-10 15l2 6c9-2 14-10 14-21Z M45 53h10v16H45Z M32 74h36v10H32Z",
  },
  {
    id: "skull",
    label: "Череп",
    path: "M28 28a22 22 0 0 1 44 0v18c0 9-5 15-12 18v10H40V64c-7-3-12-9-12-18Z M37 34a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z M49 34a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z M44 64h4v10h-4Z M52 64h4v10h-4Z",
  },
  {
    id: "wolf",
    label: "Волк",
    path: "M12 20 32 4l9 24h18l9-24 20 16-6 32-17 18-14 10-14-10-17-18Z M35 38a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M53 38a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M44 58h12l-6 11Z",
  },
  {
    id: "flame",
    label: "Пламя",
    path: "M50 6c2 18 18 26 18 46a18 18 0 0 1-36 0c0-12 10-18 14-30 1-6 2-10 4-16Z M50 46c6 6 6 16 0 20-6-4-6-14 0-20Z",
  },
  {
    id: "mountain",
    label: "Гора",
    path: "M4 86 40 20l14 26 10-18 32 58Z M34 34 40 20l6 14-6 9Z",
  },
  {
    id: "gamepad",
    label: "Геймпад",
    path: "M26 38h48a18 18 0 0 1 18 18l2 14a8 8 0 0 1-14 6l-10-8H30l-10 8a8 8 0 0 1-14-6l2-14a18 18 0 0 1 18-18Z M25 52h5v-5h5v5h5v5h-5v5h-5v-5h-5Z M64 54a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z M72 64a5 5 0 1 0 10 0 5 5 0 0 0-10 0Z",
  },
  {
    id: "rocket",
    label: "Ракета",
    path: "M50 4c12 14 18 32 18 48l-10 14H42L32 52c0-16 6-34 18-48Z M50 24a8 8 0 1 0 .01 0Z M32 54 14 78l22-10Z M68 54l18 24-22-10Z M44 70 50 94 56 70Z",
  },
  {
    id: "dice",
    label: "Кости",
    path: "M30 18h40a12 12 0 0 1 12 12v40a12 12 0 0 1-12 12H30a12 12 0 0 1-12-12V30a12 12 0 0 1 12-12Z M32 34a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M56 34a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M44 50a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M32 66a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M56 66a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z",
  },
  {
    id: "star",
    label: "Звезда",
    path: "M50 6l13 30 32 3-24 21 7 32-28-17-28 17 7-32L5 39l32-3Z",
  },
  {
    id: "sword",
    label: "Меч",
    path: "M50 2l11 11v44H39V13Z M26 57h48v9H26Z M45 66h10v20H45Z M38 86h24v10H38Z",
  },
  {
    id: "mask",
    label: "Маска",
    path: "M50 10c19 0 30 13 30 30v10c0 18-13 33-30 40-17-7-30-22-30-40V40c0-17 11-30 30-30Z M34 40a8 6 0 1 0 16 0 8 6 0 0 0-16 0Z M50 40a8 6 0 1 0 16 0 8 6 0 0 0-16 0Z M40 64h20l-10 11Z",
  },
  {
    id: "chevrons",
    label: "Шевроны",
    path: "M50 8 84 42H68L50 24 32 42H16Z M50 46 84 80H68L50 62 32 80H16Z",
  },
  {
    id: "eye",
    label: "Око",
    path: "M50 24c23 0 39 18 46 26-7 8-23 26-46 26S11 58 4 50c7-8 23-26 46-26Z M50 34a16 16 0 1 0 .01 0Z M50 42a8 8 0 1 1-.01 0Z",
  },
  {
    id: "diamond",
    label: "Алмаз",
    path: "M50 6 88 50 50 94 12 50Z M50 22 74 50 50 78 26 50Z",
  },
  {
    id: "anchor",
    label: "Якорь",
    path: "M50 8a10 10 0 1 1-.01 0Z M46 22h8v52h-8Z M22 42h8v10c0 14 9 24 20 24s20-10 20-24V42h8v10c0 20-13 32-28 32S22 72 22 52Z",
  },
  {
    id: "compass",
    label: "Компас",
    path: "M50 10a40 40 0 1 0 .01 0Z M50 18a32 32 0 1 1-.01 0Z M50 26 58 50 50 74 42 50Z",
  },
  {
    id: "hourglass",
    label: "Песочные часы",
    path: "M28 8h44v8H28Z M28 84h44v8H28Z M34 16h32v10c0 10-8 18-16 22 8 4 16 12 16 22v10H34V70c0-10 8-18 16-22-8-4-16-12-16-22Z",
  },
  {
    id: "paw",
    label: "Лапа",
    path: "M50 50c11 0 22 10 22 19a12 12 0 0 1-13 12c-3 0-6-1-9-1s-6 1-9 1a12 12 0 0 1-13-12c0-9 11-19 22-19Z M26 24a9 10 0 1 0 .01 0Z M40 16a9 10 0 1 0 .01 0Z M54 16a9 10 0 1 0 .01 0Z M68 24a9 10 0 1 0 .01 0Z",
  },
  {
    id: "ghost",
    label: "Призрак",
    path: "M50 8c17 0 28 12 28 30v44l-9-7-9 7-9-7-9 7-9-7-9 7V38C24 20 33 8 50 8Z M39 36a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z M53 36a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z",
  },
  {
    id: "bomb",
    label: "Бомба",
    path: "M48 26a26 26 0 1 0 .01 0Z M64 22l7-7 5 5-7 7Z M72 8l6-6 6 6-6 6Z",
  },
  {
    id: "flag",
    label: "Флаг",
    path: "M24 6h9v88h-9Z M33 12h46l-9 15 9 15H33Z",
  },
  {
    id: "key",
    label: "Ключ",
    path: "M38 8a18 18 0 1 1-.01 0Z M38 18a8 8 0 1 1-.01 0Z M38 26h8v62h-8Z M46 58h16v8H46Z M46 74h12v8H46Z",
  },
  {
    id: "coin",
    label: "Монета",
    path: "M50 8a42 42 0 1 0 .01 0Z M50 16a34 34 0 1 1-.01 0Z M50 32 57 48 74 50 61 61 65 78 50 69 35 78 39 61 26 50 43 48Z",
  },
  {
    id: "alien",
    label: "Пришелец",
    path: "M50 8c19 0 30 14 30 32 0 22-17 46-30 52C37 86 20 62 20 40 20 22 31 8 50 8Z M34 36a9 12 0 1 0 .01 0Z M52 36a9 12 0 1 0 .01 0Z",
  },
  {
    id: "spark",
    label: "Искра",
    path: "M50 4 59 41 96 50 59 59 50 96 41 59 4 50 41 41Z",
  },
];

export const EMBLEMS: readonly Emblem[] = emblems;
export const EMBLEM_COUNT = emblems.length;
export const EMBLEM_IDS = emblems.map((emblem) => emblem.id);

const byId = new Map(emblems.map((emblem) => [emblem.id, emblem]));

export function emblemById(id: string): Emblem | undefined {
  return byId.get(id);
}
