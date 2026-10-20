import { store } from '../store.js';
import { ask, el, empty, field, openSheet, toast } from '../ui.js';
import { dateKey, formatMoney, sumBy } from '../utils.js';

// Yozuv turlari: "olgan" — men olganman, "qaytargan" — men qaytarganman
const ENTRY_LABELS = { olgan: 'Oldim', qaytargan: 'Qaytardim' };

function openEntryForm(debt, type, onSaved) {
  openSheet({
    title: `${debt.name}: ${ENTRY_LABELS[type].toLowerCase()}`,
    build(body, close) {
      const amount = el('input', { type: 'number', inputmode: 'numeric', min: '0', step: 'any', required: true, placeholder: '0' });
      const date = el('input', { type: 'date', value: dateKey() });
      const note = el('input', { type: 'text', maxlength: '60', autocomplete: 'off', placeholder: 'Izoh (ixtiyoriy)' });

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
              await store.add('debtEntries', {
                debtId: debt.id,
                type,
                amount: value,
                date: date.value || dateKey(),
                note: note.value.trim(),
              });
              close();
              toast('Yozildi');
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

function openNewPersonForm(onSaved) {
  openSheet({
    title: "Yangi odam",
    build(body, close) {
      const name = el('input', { type: 'text', maxlength: '40', required: true, autocomplete: 'off', placeholder: 'masalan: Akmal' });
      body.append(
        el(
          'form',
          {
            class: 'form',
            onsubmit: async (event) => {
              event.preventDefault();
              const value = name.value.trim();
              if (!value) {
                toast('Ismini kiriting');
                return;
              }
              await store.add('debts', { name: value });
              close();
              toast('Qo\'shildi');
              onSaved();
            },
          },
          field('Ism', name),
          el('button', { class: 'btn btn-block', type: 'submit', text: 'Saqlash' }),
        ),
      );
    },
  });
}

export async function render(root) {
  const [settings, debts, entries] = await Promise.all([
    store.getSettings(),
    store.list('debts'),
    store.list('debtEntries'),
  ]);
  const money = (amount) => formatMoney(amount, settings.currency);
  const rerender = () => render(root);

  const entriesOf = (debt) => entries.filter((entry) => entry.debtId === debt.id);
  const balanceOf = (debt) =>
    sumBy(entriesOf(debt), (entry) => (entry.type === 'olgan' ? entry.amount : -entry.amount));

  const people = debts
    .map((debt) => ({ debt, balance: balanceOf(debt) }))
    .sort((a, b) => b.balance - a.balance || a.debt.name.localeCompare(b.debt.name, 'uz'));
  const totalOwed = sumBy(people.filter((p) => p.balance > 0), (p) => p.balance);

  async function removePerson(debt) {
    const ok = await ask("Odamni o'chirish", `"${debt.name}" va uning barcha yozuvlari o'chiriladi.`, { yes: "O'chirish", danger: true });
    if (!ok) return;
    await store.removeWhere('debtEntries', (entry) => entry.debtId === debt.id);
    await store.remove('debts', debt.id);
    toast("O'chirildi");
    await rerender();
  }

  async function removeEntry(entry) {
    const ok = await ask("Yozuvni o'chirish", `${ENTRY_LABELS[entry.type]}: ${money(entry.amount)} o'chirilsinmi?`, { yes: "O'chirish", danger: true });
    if (!ok) return;
    await store.remove('debtEntries', entry.id);
    toast("O'chirildi");
    await rerender();
  }

  function openPerson(debt) {
    const balance = balanceOf(debt);
    const history = entriesOf(debt).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    openSheet({
      title: debt.name,
      build(body) {
        body.append(
          el('div', { class: 'person-balance' }, el('span', { class: 'muted', text: 'Qoldiq' }), el('b', { class: balance > 0 ? 'neg' : 'pos', text: money(balance) })),
          el(
            'div',
            { class: 'row-actions' },
            el('button', { class: 'btn', type: 'button', text: '+ Oldim', onclick: () => openEntryForm(debt, 'olgan', rerender) }),
            el('button', { class: 'btn btn-secondary', type: 'button', text: '+ Qaytardim', onclick: () => openEntryForm(debt, 'qaytargan', rerender) }),
          ),
          history.length
            ? el(
              'ul',
              { class: 'list' },
              history.map((entry) =>
                el(
                  'li',
                  { class: 'row' },
                  el('div', { class: 'row-main' }, el('strong', { text: ENTRY_LABELS[entry.type] }), el('small', { class: 'muted', text: [entry.date, entry.note].filter(Boolean).join(' · ') })),
                  el('span', { class: `amount ${entry.type === 'olgan' ? 'neg' : 'pos'}`, text: `${entry.type === 'olgan' ? '+' : '−'}${money(entry.amount)}` }),
                  el('button', { class: 'icon-btn small', type: 'button', 'aria-label': "O'chirish", onclick: () => removeEntry(entry), text: '🗑' }),
                ),
              ),
            )
            : empty("Hali yozuv yo'q"),
          el('button', { class: 'btn btn-danger-ghost btn-block', type: 'button', text: "Odamni o'chirish", onclick: () => removePerson(debt) }),
        );
      },
    });
  }

  const personRow = ({ debt, balance }) => {
    const status = balance > 0 ? 'Qarzingiz bor' : balance === 0 ? 'Qarz yopilgan' : 'Ortiqcha qaytarilgan';
    return el(
      'li',
      {},
      el(
        'button',
        { class: 'person', type: 'button', onclick: () => openPerson(debt) },
        el('span', { class: 'avatar', text: debt.name.charAt(0).toUpperCase() }),
        el('div', { class: 'row-main' }, el('strong', { text: debt.name }), el('small', { class: 'muted', text: status })),
        el('span', { class: `amount ${balance > 0 ? 'neg' : 'pos'}`, text: money(Math.abs(balance)) }),
      ),
    );
  };

  root.replaceChildren(
    el(
      'section',
      { class: 'card balance-summary' },
      el('span', { class: 'muted', text: 'Jami qarzingiz' }),
      el('b', { class: 'big neg', text: money(totalOwed) }),
    ),
    el('button', { class: 'btn btn-block', type: 'button', text: "+ Yangi odam qo'shish", onclick: () => openNewPersonForm(rerender) }),
    people.length
      ? el('ul', { class: 'list card' }, people.map(personRow))
      : empty("Hali qarz yozuvi yo'q"),
  );
}
