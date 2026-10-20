// Kalit so'zlar avtomatik kategoriyani aniqlash uchun ishlatiladi
export const CATEGORIES = [
  {
    id: 'ovqat', name: 'Ovqat', color: '#f59e0b',
    words: ['ovqat', 'tushlik', 'nonushta', 'kechki', 'obed', 'restoran', 'osh', 'lavash', 'somsa', 'non', 'market', 'bozor', "go'sht", 'sabzavot', 'meva', 'pitsa', 'burger', 'fastfood', 'choyxona'],
  },
  {
    id: 'ichimlik', name: 'Ichimlik', color: '#8b5cf6',
    words: ['kofe', 'qahva', 'choy', 'cola', 'pepsi', 'suv', 'sok', 'ichimlik', 'pivo', 'energetik', 'latte', 'cappuccino'],
  },
  {
    id: 'yol', name: "Taksi/yo'l", color: '#0ea5e9',
    words: ['taksi', "yo'l", 'yol', 'avtobus', 'metro', 'benzin', "yoqilg'i", 'bus', 'marshrutka', 'yandex', 'poyezd', 'parvoz', 'bilet', 'parking', 'mashina', 'moshina'],
  },
  {
    id: 'samokat', name: 'Samokat/velo', color: '#22c55e',
    words: ['samokat', 'velo', 'velosiped', 'scooter', 'bike'],
  },
  {
    id: 'dostlar', name: "Do'stlar bilan", color: '#ec4899',
    words: ["do'st", 'dostlar', 'dam', 'kino', 'bar', 'mehmon', "tug'ilgan", "sovg'a", 'tadbir', 'klub', 'konsert', "o'yin"],
  },
  {
    id: 'uy', name: "Uy-ro'zg'or", color: '#64748b',
    words: ['uy', "ro'zg'or", 'kommunal', 'gaz', 'svet', 'elektr', 'internet', 'sovun', 'chang', 'ijara', 'kvartira', 'dori', 'ta\'mir', 'kir'],
  },
  {
    id: 'boshqa', name: 'Boshqa', color: '#94a3b8',
    words: [],
  },
];

export const DEFAULT_CATEGORY = 'boshqa';

export function categoryById(id) {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES.at(-1);
}

// Turli xil apostrof belgilarini bir xil ko'rinishga keltiradi (o‘, o', oʻ)
export function normalizeText(text) {
  return text.toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").trim();
}

export function guessCategory(name) {
  const tokens = normalizeText(name).split(/[\s,./-]+/).filter(Boolean);
  const match = CATEGORIES.find((category) =>
    category.words.some((word) => tokens.some((token) => token.startsWith(word))),
  );
  return (match ?? categoryById(DEFAULT_CATEGORY)).id;
}
