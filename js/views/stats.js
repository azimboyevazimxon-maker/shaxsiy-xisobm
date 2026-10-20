import { store } from '../store.js';
import { ask, el, empty, toast } from '../ui.js';
import { categoryById } from '../categories.js';
import { dateKey, formatMoney, monthKey, monthLabel, shiftMonth, sumBy } from '../utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let viewedMonth = monthKey();

function svgEl(tag, props = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  return node;
}

function donut(parts, total, currency) {
  const size = 180;
  const radius = 70;
  const width = 26;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const svg = svgEl('svg', { class: 'donut', viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': 'Kategoriyalar bo\'yicha diagramma' });

  let offset = 0;
  for (const { category, amount } of parts) {
    const length = (amount / total) * circumference;
    svg.append(svgEl('circle', {
      cx: center,
      cy: center,
      r: radius,
      fill: 'none',
      stroke: category.color,
      'stroke-width': width,
      'stroke-dasharray': `${length} ${circumference - length}`,
      'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${center} ${center})`,
    }));
    offset += length;
  }

  svg.append(
    svgEl('text', { x: center, y: center - 2, 'text-anchor': 'middle', class: 'donut-total', text: formatMoney(total, '') }),
    svgEl('text', { x: center, y: center + 16, 'text-anchor': 'middle', class: 'donut-sub', text: currency }),
  );
  return svg;
}

export async function render(root) {
  const [settings, expenses, incomes] = await Promise.all([
    store.getSettings(),
    store.list('expenses'),
    store.list('incomes'),
  ]);
  const money = (amount) => formatMoney(amount, settings.currency);
  const rerender = () => render(root);

  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(viewedMonth));
  const monthIncomes = incomes
    .filter((income) => income.date.startsWith(viewedMonth))
    .sort((a, b) => b.date.localeCompare(a.date));
  const spent = sumBy(monthExpenses, (e) => e.amount);
  const earned = sumBy(monthIncomes, (i) => i.amount);
  const balance = earned - spent;

  const groups = new Map();
  for (const expense of monthExpenses) {
    const id = categoryById(expense.category).id;
    groups.set(id, (groups.get(id) ?? 0) + expense.amount);
  }
  const parts = [...groups]
    .map(([id, amount]) => ({ category: categoryById(id), amount }))
    .sort((a, b) => b.amount - a.amount);

  async function removeIncome(income) {
    const ok = await ask("Kirimni o'chirish", `"${income.name}" (${money(income.amount)}) o'chirilsinmi?`, { yes: "O'chirish", danger: true });
    if (!ok) return;
    await store.remove('incomes', income.id);
    toast("O'chirildi");
    await rerender();
  }

  const incomeRows = monthIncomes.map((income) =>
    el(
      'li',
      { class: 'row' },
      el('div', { class: 'row-main' }, el('strong', { text: income.name }), el('small', { class: 'muted', text: income.date })),
      el('span', { class: 'amount pos', text: `+${money(income.amount)}` }),
      el('button', { class: 'icon-btn small', type: 'button', 'aria-label': "O'chirish", onclick: () => removeIncome(income), text: '🗑' }),
    ),
  );

  const legend = el(
    'ul',
    { class: 'legend' },
    parts.map(({ category, amount }) =>
      el(
        'li',
        {},
        el('span', { class: 'dot', style: `background:${category.color}` }),
        el('span', { class: 'legend-name', text: category.name }),
        el('span', { class: 'muted', text: `${Math.round((amount / spent) * 100)}%` }),
        el('strong', { text: money(amount) }),
      ),
    ),
  );

  root.replaceChildren(
    el(
      'div',
      { class: 'month-nav' },
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Oldingi oy', text: '‹', onclick: () => { viewedMonth = shiftMonth(viewedMonth, -1); rerender(); } }),
      el('strong', { text: monthLabel(viewedMonth) }),
      el('button', {
        class: 'icon-btn',
        type: 'button',
        'aria-label': 'Keyingi oy',
        text: '›',
        disabled: viewedMonth >= monthKey(),
        onclick: () => { viewedMonth = shiftMonth(viewedMonth, 1); rerender(); },
      }),
    ),
    el(
      'section',
      { class: 'card balance' },
      el('div', {}, el('span', { class: 'muted', text: 'Kirim' }), el('b', { class: 'pos', text: money(earned) })),
      el('div', {}, el('span', { class: 'muted', text: 'Chiqim' }), el('b', { class: 'neg', text: money(spent) })),
      el(
        'div',
        { class: 'bal-full' },
        el('span', { class: 'muted', text: 'Oy oxirida kirim - chiqim' }),
        el('b', { class: `big ${balance >= 0 ? 'pos' : 'neg'}`, text: `${balance > 0 ? '+' : ''}${money(balance)}` }),
      ),
    ),
    el(
      'section',
      { class: 'card' },
      el('h2', { text: 'Kategoriyalar bo\'yicha' }),
      parts.length
        ? el('div', {}, donut(parts, spent, settings.currency), legend)
        : empty("Bu oyda xarajat yo'q"),
    ),
    el(
      'section',
      { class: 'card' },
      el('h2', { text: 'Kirimlar' }),
      incomeRows.length ? el('ul', { class: 'list' }, incomeRows) : empty("Bu oyda kirim yo'q"),
    ),
  );
}
