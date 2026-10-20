import { store } from '../store.js';
import { ask, bindPress, el, field, openSheet, toast } from '../ui.js';
import { CATEGORIES, categoryById } from '../categories.js';
import { parseQuickInput } from '../parser.js';
import { dateKey, formatMoney, monthKey, sumBy, weekStartKey } from '../utils.js';
import { openProductForm } from './products.js';

function openIncomeForm(onSaved) {
  openSheet({
    title: 'Daromad qo\'shish',
    build(body, close) {
      const source = el('input', { type: 'text', maxlength: '60', autocomplete: 'off', placeholder: 'masalan: Oylik' });
      const amount = el('input', { type: 'number', inputmode: 'numeric', min: '0', step: 'any', required: true, placeholder: '0' });
      const date = el('input', { type: 'date', value: dateKey() });

      body.append(
        el(
          'form',
          {
            class: 'form',
            onsubmit: async (event) => {
              event.preventDefault();
              const value = Number(amount.value);
              if (!(value > 0)) {
                toast('Summani kiriting');
                return;
              }
              await store.add('incomes', {
                name: source.value.trim() || 'Daromad',
                amount: value,
                date: date.value || dateKey(),
              });
              close();
              toast('Daromad saqlandi');
              onSaved();
            },
          },
          field('Manba', source),
          field('Summa', amount),
          field('Sana', date),
          el('button', { class: 'btn btn-block', type: 'submit', text: 'Saqlash' }),
        ),
      );
    },
  });
}

function openExpenseForm(expense, onSaved) {
  openSheet({
    title: 'Xarajatni tahrirlash',
    build(body, close) {
      const name = el('input', { type: 'text', maxlength: '60', required: true, autocomplete: 'off', value: expense.name });
      const amount = el('input', { type: 'number', inputmode: 'numeric', min: '0', step: 'any', required: true, value: expense.amount });
      const category = el(
        'select',
        {},
        CATEGORIES.map((item) => el('option', { value: item.id, text: item.name, selected: item.id === expense.category })),
      );
      const place = el('input', { type: 'text', maxlength: '60', autocomplete: 'off', value: expense.place ?? '' });
      const date = el('input', { type: 'date', value: expense.date });

      body.append(
        el(
          'form',
          {
            class: 'form',
            onsubmit: async (event) => {
              event.preventDefault();
              const value = Number(amount.value);
              if (!name.value.trim() || !(value > 0)) {
                toast("Nomi va summasini to'g'ri kiriting");
                return;
              }
              await store.update('expenses', expense.id, {
                name: name.value.trim(),
                amount: value,
                category: category.value,
                place: place.value.trim(),
                date: date.value || expense.date,
              });
              close();
              toast('Saqlandi');
              onSaved();
            },
          },
          field('Nomi', name),
          field('Summa', amount),
          field('Kategoriya', category),
          field('Joyi', place),
          field('Sana', date),
          el(
            'div',
            { class: 'row-actions' },
            el('button', { class: 'btn btn-ghost', type: 'button', onclick: close, text: 'Bekor' }),
            el('button', { class: 'btn', type: 'submit', text: 'Saqlash' }),
          ),
        ),
      );
    },
  });
}

function statCard(label, value) {
  return el('div', { class: 'stat' }, el('span', { class: 'muted', text: label }), el('b', { text: value }));
}

export async function render(root) {
  const [settings, expenses] = await Promise.all([store.getSettings(), store.list('expenses')]);
  const money = (amount) => formatMoney(amount, settings.currency);
  const rerender = () => render(root);

  const today = dateKey();
  const weekStart = weekStartKey(today);
  const month = monthKey();
  const todayItems = expenses.filter((expense) => expense.date === today);
  const weekItems = expenses.filter((expense) => expense.date >= weekStart && expense.date <= today);
  const monthItems = expenses.filter((expense) => expense.date.startsWith(month));

  async function saveQuick(text) {
    const parsed = parseQuickInput(text);
    if (!parsed?.amount) {
      toast('Summani yozing, masalan: taksi 30000');
      return;
    }
    const name = parsed.name || 'Xarajat';
    await store.add('expenses', {
      name,
      amount: parsed.amount,
      qty: 1,
      unitPrice: parsed.amount,
      category: parsed.category,
      place: '',
      productId: null,
      date: today,
    });
    toast(`Saqlandi: ${name} — ${money(parsed.amount)}`);
    await rerender();

    const products = await store.list('products');
    const known = products.some((product) => product.name.toLowerCase() === name.toLowerCase());
    if (!known) {
      openProductForm({
        title: 'Mahsulot qilib saqlaymi?',
        submitLabel: 'Ha, saqlash',
        cancelLabel: "Yo'q",
        prefill: { name, price: parsed.amount, category: parsed.category, place: '' },
        onSaved: rerender,
      });
    }
  }

  const input = el('input', { type: 'text', name: 'quick', placeholder: 'masalan: taksi 30000', autocomplete: 'off', enterkeyhint: 'done' });
  const quickForm = el(
    'form',
    {
      class: 'quick',
      onsubmit: async (event) => {
        event.preventDefault();
        await saveQuick(input.value);
      },
    },
    input,
    el('button', { class: 'btn', type: 'submit', text: 'Saqlash' }),
  );

  async function remove(expense) {
    const ok = await ask("Xarajatni o'chirish", `"${expense.name}" (${money(expense.amount)}) o'chirilsinmi?`, { yes: "O'chirish", danger: true });
    if (!ok) return;
    await store.remove('expenses', expense.id);
    toast("O'chirildi");
    await rerender();
  }

  function row(expense) {
    const category = categoryById(expense.category);
    return el(
      'li',
      { class: 'row' },
      el('span', { class: 'dot', style: `background:${category.color}` }),
      el(
        'div',
        { class: 'row-main' },
        el('strong', { text: expense.name }),
        el('small', { class: 'muted', text: [category.name, expense.place].filter(Boolean).join(' · ') }),
      ),
      el('span', { class: 'amount', text: money(expense.amount) }),
      el('button', { class: 'icon-btn small', type: 'button', 'aria-label': 'Tahrirlash', onclick: () => openExpenseForm(expense, rerender), text: '✎' }),
      el('button', { class: 'icon-btn small', type: 'button', 'aria-label': "O'chirish", onclick: () => remove(expense), text: '🗑' }),
    );
  }

  const todayList = todayItems
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(row);

  root.replaceChildren(
    el(
      'section',
      { class: 'summary' },
      statCard('Bugun', money(sumBy(todayItems, (e) => e.amount))),
      statCard('Hafta', money(sumBy(weekItems, (e) => e.amount))),
      statCard('Oy', money(sumBy(monthItems, (e) => e.amount))),
    ),
    el(
      'section',
      { class: 'card' },
      el('h2', { text: 'Tezkor kiritish' }),
      quickForm,
      el('p', { class: 'hint', text: 'Nom va summani yozing: "kofe 25000" yoki "5 ming taksi"' }),
    ),
    el('button', { class: 'btn btn-secondary btn-block', type: 'button', text: "+ Daromad qo'shish", onclick: () => openIncomeForm(rerender) }),
    el('h2', { class: 'section-title', text: 'Bugungi xarajatlar' }),
    todayList.length
      ? el('ul', { class: 'list card' }, todayList)
      : el('p', { class: 'empty', text: "Bugun hali xarajat yo'q" }),
  );
}
