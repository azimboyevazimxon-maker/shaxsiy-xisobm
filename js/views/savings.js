import { store } from '../store.js';
import { ask, el, empty, field, openSheet, toast } from '../ui.js';
import { dateKey, formatDay, formatMoney, percent, sumBy, weekEndKey, weekStartKey } from '../utils.js';

function openDepositForm(onSaved) {
  openSheet({
    title: "Pul qo'shish",
    build(body, close) {
      const amount = el('input', { type: 'number', inputmode: 'numeric', min: '0', step: 'any', required: true, placeholder: '0' });
      const date = el('input', { type: 'date', value: dateKey() });
      const note = el('input', { type: 'text', maxlength: '60', autocomplete: 'off', placeholder: 'masalan: Oylik dan' });

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
              await store.add('deposits', { amount: value, date: date.value || dateKey(), note: note.value.trim() });
              close();
              toast("Kopilkaga qo'shildi");
              onSaved();
            },
          },
          field('Summa', amount),
          field('Sana', date),
          field('Izoh', note),
          el('button', { class: 'btn btn-block', type: 'submit', text: 'Saqlash' }),
        ),
      );
    },
  });
}

function openGoalForm(settings, onSaved) {
  openSheet({
    title: 'Maqsadni o\'zgartirish',
    build(body, close) {
      const title = el('input', { type: 'text', maxlength: '40', autocomplete: 'off', value: settings.savingsTitle ?? '' });
      const target = el('input', { type: 'number', inputmode: 'numeric', min: '0', step: 'any', value: settings.savingsTarget || '' });

      body.append(
        el(
          'form',
          {
            class: 'form',
            onsubmit: async (event) => {
              event.preventDefault();
              await store.updateSettings({
                savingsTitle: title.value.trim() || 'Kopilka',
                savingsTarget: Math.max(0, Number(target.value) || 0),
              });
              close();
              toast('Maqsad saqlandi');
              onSaved();
            },
          },
          field('Maqsad nomi', title),
          field('Maqsad summasi', target),
          el('button', { class: 'btn btn-block', type: 'submit', text: 'Saqlash' }),
        ),
      );
    },
  });
}

export async function render(root) {
  const [settings, deposits] = await Promise.all([store.getSettings(), store.list('deposits')]);
  const money = (amount) => formatMoney(amount, settings.currency);
  const rerender = () => render(root);

  const saved = sumBy(deposits, (d) => d.amount);
  const target = Number(settings.savingsTarget) || 0;
  const progress = percent(saved, target);

  async function removeDeposit(deposit) {
    const ok = await ask("Qo'shimchani o'chirish", `${money(deposit.amount)} (${deposit.date}) o'chirilsinmi?`, { yes: "O'chirish", danger: true });
    if (!ok) return;
    await store.remove('deposits', deposit.id);
    toast("O'chirildi");
    await rerender();
  }

  // Har haftaning jami: dushanbadan yakshanbagacha
  const weeks = new Map();
  for (const deposit of deposits) {
    const key = weekStartKey(deposit.date);
    weeks.set(key, [...(weeks.get(key) ?? []), deposit]);
  }
  const weekBlocks = [...weeks]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([start, items]) =>
      el(
        'div',
        { class: 'week' },
        el(
          'div',
          { class: 'week-head' },
          el('strong', { text: `${formatDay(start)} – ${formatDay(weekEndKey(start))}` }),
          el('span', { class: 'pos', text: `+${money(sumBy(items, (d) => d.amount))}` }),
        ),
        el(
          'ul',
          { class: 'list' },
          items
            .slice()
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((deposit) =>
              el(
                'li',
                { class: 'row' },
                el('div', { class: 'row-main' }, el('strong', { text: money(deposit.amount) }), el('small', { class: 'muted', text: [deposit.date, deposit.note].filter(Boolean).join(' · ') })),
                el('button', { class: 'icon-btn small', type: 'button', 'aria-label': "O'chirish", onclick: () => removeDeposit(deposit), text: '🗑' }),
              ),
            ),
        ),
      ),
    );

  root.replaceChildren(
    el(
      'section',
      { class: 'card goal' },
      el(
        'div',
        { class: 'goal-head' },
        el('div', {}, el('span', { class: 'muted', text: 'Maqsad' }), el('h2', { text: settings.savingsTitle || 'Kopilka' })),
        el('button', { class: 'btn btn-ghost', type: 'button', text: 'Tahrirlash', onclick: () => openGoalForm(settings, rerender) }),
      ),
      el('div', { class: 'progress' }, el('span', { style: `width:${progress}%` })),
      el(
        'div',
        { class: 'goal-stats' },
        el('b', { text: `${progress.toFixed(1)}%` }),
        el('span', { class: 'muted', text: target ? `${money(saved)} / ${money(target)}` : `${money(saved)} (maqsad belgilanmagan)` }),
      ),
      target ? el('p', { class: 'muted', text: `Qoldi: ${money(Math.max(0, target - saved))}` }) : null,
    ),
    el('button', { class: 'btn btn-block', type: 'button', text: "+ Pul qo'shish", onclick: () => openDepositForm(rerender) }),
    el('h2', { class: 'section-title', text: "Haftalik qo'shimchalar" }),
    weekBlocks.length ? weekBlocks : empty("Hali qo'shimcha yo'q"),
  );
}
