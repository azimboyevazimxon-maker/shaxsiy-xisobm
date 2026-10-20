import { guessCategory } from './categories.js';

// "30 000", "30.000", "1,5 mln", "5 ming" kabi summalar
const NUMBER = String.raw`\d+(?:[ .,'’]\d{3})*(?:[.,]\d+)?`;
const UNIT = String.raw`(ming|k|mln|million)`;
const CURRENCY = String.raw`(?:\s*(?:so['ʻ’‘]?m|sum|uzs))?`;

// "taksi 30000" — summa oxirida
const AMOUNT_AT_END = new RegExp(String.raw`(?:^|\s)(${NUMBER})\s*${UNIT}?${CURRENCY}\s*$`, 'i');
// "5 ming taksi" — summa boshida
const AMOUNT_AT_START = new RegExp(String.raw`^(${NUMBER})\s*${UNIT}?${CURRENCY}\s+(.+)$`, 'i');

const MULTIPLIERS = { ming: 1000, k: 1000, mln: 1000000, million: 1000000 };

function toAmount(numberText, unit) {
  const multiplier = MULTIPLIERS[unit?.toLowerCase()];
  if (multiplier) {
    return Math.round(parseFloat(numberText.replace(/[ ’']/g, '').replace(',', '.')) * multiplier);
  }
  return Number(numberText.replace(/\D/g, ''));
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Qaytaradi: { name, amount, category } yoki summa topilmasa amount = null
export function parseQuickInput(input) {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return null;

  let name = '';
  let number = null;
  let unit;

  const atEnd = text.match(AMOUNT_AT_END);
  const atStart = atEnd ? null : text.match(AMOUNT_AT_START);
  if (atEnd) {
    name = text.slice(0, atEnd.index).trim();
    [, number, unit] = atEnd;
  } else if (atStart) {
    [, number, unit, name] = atStart;
  }

  const amount = number ? toAmount(number, unit) : 0;
  if (!amount || amount <= 0) {
    return { name: capitalize(text), amount: null, category: guessCategory(text) };
  }
  const cleanName = capitalize(name);
  return { name: cleanName, amount, category: guessCategory(cleanName) };
}
