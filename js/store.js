import { uid } from './utils.js';

// Ma'lumot qatlami. Hozir localStorage'da ishlaydi.
// Firebase'ga o'tganda faqat shu fayl almashtiriladi: barcha metodlar async,
// id'lar esa Firestore hujjat id'siga mos keladigan UUID.

const STORAGE_KEY = 'xarajat-pwa:v1';
const COLLECTIONS = ['products', 'expenses', 'incomes', 'deposits', 'debts', 'debtEntries'];

function emptyData() {
  return {
    settings: { currency: "so'm", savingsTitle: 'Kopilka', savingsTarget: 0 },
    ...Object.fromEntries(COLLECTIONS.map((name) => [name, []])),
  };
}

function normalize(input) {
  const data = emptyData();
  if (!input || typeof input !== 'object') return data;
  if (input.settings && typeof input.settings === 'object') {
    data.settings = { ...data.settings, ...input.settings };
  }
  for (const name of COLLECTIONS) {
    if (Array.isArray(input[name])) {
      data[name] = input[name].filter((item) => item && typeof item === 'object' && item.id);
    }
  }
  return data;
}

function readStorage() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    // Buzilgan ma'lumotni yo'qotmaslik uchun zaxira kalitga ko'chiramiz
    if (raw) {
      try { localStorage.setItem(`${STORAGE_KEY}:buzilgan`, raw); } catch { /* ignore */ }
    }
    return normalize(null);
  }
}

let data = readStorage();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new Error("Ma'lumotni saqlab bo'lmadi. Xotira to'lgan bo'lishi mumkin.");
  }
}

export const store = {
  async list(name) {
    return data[name].slice();
  },

  async add(name, fields) {
    const item = { ...fields, id: uid(), createdAt: Date.now() };
    data[name].push(item);
    persist();
    return item;
  },

  async update(name, id, patch) {
    const item = data[name].find((entry) => entry.id === id);
    if (!item) return;
    Object.assign(item, patch);
    persist();
  },

  async remove(name, id) {
    data[name] = data[name].filter((entry) => entry.id !== id);
    persist();
  },

  async removeWhere(name, predicate) {
    data[name] = data[name].filter((entry) => !predicate(entry));
    persist();
  },

  async getSettings() {
    return { ...data.settings };
  },

  async updateSettings(patch) {
    data.settings = { ...data.settings, ...patch };
    persist();
  },

  async exportJson() {
    return JSON.stringify(
      { app: 'xarajat-pwa', version: 1, exportedAt: new Date().toISOString(), data },
      null,
      2,
    );
  },

  async importJson(text) {
    const parsed = JSON.parse(text);
    const payload = parsed?.data ?? parsed;
    if (!payload || !COLLECTIONS.some((name) => Array.isArray(payload[name]))) {
      throw new Error("Fayl noto'g'ri formatda");
    }
    data = normalize(payload);
    persist();
  },

  async clear() {
    data = emptyData();
    persist();
  },
};
