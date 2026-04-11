export type BulgarianRegion = {
  id: number;
  name: string;
  aliases: string[];
};

const normalizeText = (value: string) => value
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '');

const createDefaultAliases = (name: string) => [name, `област ${name}`, `${name} област`];

export const bulgarianRegions: BulgarianRegion[] = [
  { id: 1, name: 'Благоевград', aliases: createDefaultAliases('Благоевград') },
  { id: 2, name: 'Бургас', aliases: createDefaultAliases('Бургас') },
  { id: 3, name: 'Варна', aliases: createDefaultAliases('Варна') },
  { id: 4, name: 'Велико Търново', aliases: createDefaultAliases('Велико Търново') },
  { id: 5, name: 'Видин', aliases: createDefaultAliases('Видин') },
  { id: 6, name: 'Враца', aliases: createDefaultAliases('Враца') },
  { id: 7, name: 'Габрово', aliases: createDefaultAliases('Габрово') },
  { id: 8, name: 'Добрич', aliases: createDefaultAliases('Добрич') },
  { id: 9, name: 'Кърджали', aliases: createDefaultAliases('Кърджали') },
  { id: 10, name: 'Кюстендил', aliases: createDefaultAliases('Кюстендил') },
  { id: 11, name: 'Ловеч', aliases: createDefaultAliases('Ловеч') },
  { id: 12, name: 'Монтана', aliases: createDefaultAliases('Монтана') },
  { id: 13, name: 'Пазарджик', aliases: createDefaultAliases('Пазарджик') },
  { id: 14, name: 'Перник', aliases: createDefaultAliases('Перник') },
  { id: 15, name: 'Плевен', aliases: createDefaultAliases('Плевен') },
  { id: 16, name: 'Пловдив', aliases: createDefaultAliases('Пловдив') },
  { id: 17, name: 'Разград', aliases: createDefaultAliases('Разград') },
  { id: 18, name: 'Русе', aliases: createDefaultAliases('Русе') },
  { id: 19, name: 'Силистра', aliases: createDefaultAliases('Силистра') },
  { id: 20, name: 'Сливен', aliases: createDefaultAliases('Сливен') },
  { id: 21, name: 'Смолян', aliases: createDefaultAliases('Смолян') },
  { id: 22, name: 'Софийска област', aliases: ['Софийска област', 'област Софийска област', 'София област', 'Sofia Province'] },
  { id: 23, name: 'София – град', aliases: ['София – град', 'София-град', 'София град', 'София', 'Sofia City', 'Sofia City Province'] },
  { id: 24, name: 'Стара Загора', aliases: createDefaultAliases('Стара Загора') },
  { id: 25, name: 'Търговище', aliases: createDefaultAliases('Търговище') },
  { id: 26, name: 'Хасково', aliases: createDefaultAliases('Хасково') },
  { id: 27, name: 'Шумен', aliases: createDefaultAliases('Шумен') },
  { id: 28, name: 'Ямбол', aliases: createDefaultAliases('Ямбол') },
];

const regionEntries = bulgarianRegions.flatMap((region) => region.aliases.map((alias) => ({
  region,
  normalizedAlias: normalizeText(alias),
})));

export const findBulgarianRegionByText = (...texts: Array<string | null | undefined>) => {
  for (const rawText of texts) {
    if (!rawText) {
      continue;
    }

    const normalizedText = normalizeText(rawText);

    if (!normalizedText) {
      continue;
    }

    const matchedEntry = regionEntries.find(({ normalizedAlias }) => (
      normalizedText === normalizedAlias
      || normalizedText.includes(normalizedAlias)
      || normalizedAlias.includes(normalizedText)
    ));

    if (matchedEntry) {
      return matchedEntry.region;
    }
  }

  return null;
};
