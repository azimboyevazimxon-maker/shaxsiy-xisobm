const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
const SHORT_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];

const pad = (n) => String(n).padStart(2, '0');

// Sana kalitlari "YYYY-MM-DD" ko'rinishida (mahalliy vaqt bo'yicha)
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function monthKey(date = new Date()) {
  return dateKey(date).slice(0, 7);
}

export function shiftMonth(key, delta) {
  const [year, month] = key.split('-').map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

export function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// Hafta dushanbadan boshlanadi
export function weekStartKey(key = dateKey()) {
  const date = parseKey(key);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateKey(date);
}

export function weekEndKey(startKey) {
  const date = parseKey(startKey);
  date.setDate(date.getDate() + 6);
  return dateKey(date);
}

export function formatDay(key) {
  const date = parseKey(key);
  return `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`;
}

export function formatMoney(amount, currency = "so'm") {
  const rounded = Math.round(Number(amount) || 0);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${rounded < 0 ? '-' : ''}${digits} ${currency}`.trim();
}

export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sumBy(items, pick) {
  return items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);
}

export function percent(part, whole) {
  return whole > 0 ? Math.min(100, (part / whole) * 100) : 0;
}
