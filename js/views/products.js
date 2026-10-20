import { store } from '../store.js';
import { ask, bindPress, el, empty, field, openSheet, toast } from '../ui.js';
import { CATEGORIES, categoryById } from '../categories.js';
import { dateKey, formatMoney } from '../utils.js';

// Mahsulotdan xarajat yaratadi (home va products sahifalari ishlatadi)
export async function logProduct(product, qty, currency) {
  const amount = product.price * qty;
  await store.add('expenses', {
    name: qty > 1 ? `${product.name} ×${qty}` : product.name,
    amount,
    qty,
    unitPrice: product.price,
    category: product.category,
    place: product.place ?? '',
    productId: product.id,
    date: dateKey(),
  });
  return formatMoney(amount, currency);
}

export function openProductForm({ product = null, prefill = {}, title, submitLabel = 'Saqlash', cancelLabel = 'Bekor', onSaved }) {
  openSheet({
    title: title ?? (product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'),
    build(body, close) {
      const current = product ?? prefill;
      const name = el('input', { type: 'text', required: true, maxlength: '60', autocomplete: 'off', placeholder: 'masalan: Kofe', value: current.name ?? '' });
      const price = el('input', { type: 'number', inputmode: 'numeric', min: '0', step: 'any', required: true, placeholder: '50000', value: current.price ?? '' });
      const category = el(
        'select',
        {},
        CATEGORIES.map((item) => el('option', { value: item.id, text: item.name, selected: item.id === (current.category ?? 'boshqa') })),
      );
      const place = el('input', { type: 'text', maxlength: '60', autocomplete: 'off', placeholder: 'masalan: Kafelito', value: current.place ?? '' });

      const submit = async (event) => {
        event.preventDefault();
        const value = {
          name: name.value.trim(),
          price: Number(price.value),
          category: category.value,
          place: place.value.trim(),
        };
        if (!value.name || !(value.price > 0)) {
          toast("Nomi va narxini to'g'ri kiriting");
          return;
        }
        if (product) await store.update('products', product.id, value);
        else await store.add('products', value);
        close();
        toast('Mahsulot saqlandi');
        onSaved?.();
      };

      const remove = async () => {
        const ok = await ask("Mahsulotni o'chirish", `"${product.name}" ro'yxatdan o'chiriladi. Oldingi xarajatlar o'zgarmaydi.`, { yes: "O'chirish", danger: true });
        if (!ok) return;
        await store.remove('products', product.id);
        close();
        toast("Mahsulot o'chirildi");
        onSaved?.();
      };

      body.append(
        el(
          'form',
          { class: 'form', onsubmit: submit },
          field('Nomi', name),
          field('Narxi', price),
          field('Kategoriya', category),
          field('Joyi', place),
          el(
            'div',
            { class: 'row-actions' },
            el('button', { class: 'btn btn-ghost', type: 'button', onclick: close, text: cancelLabel }),
            el('button', { class: 'btn', type: 'submit', text: submitLabel }),
          ),
          product ? el('button', { class: 'btn btn-danger-ghost btn-block', type: 'button', onclick: remove, text: "O'chirish" }) : null,
        ),
      );
    },
  });
}

export async function render(root) {
  const settings = await store.getSettings();
  const products = (await store.list('products')).sort((a, b) => a.name.localeCompare(b.name, 'uz'));
  const money = (amount) => formatMoney(amount, settings.currency);
  const rerender = () => render(root);

  const search = el('input', { class: 'search', type: 'search', placeholder: 'Qidirish...', autocomplete: 'off', oninput: () => drawGrid() });
  const grid = el('div', { class: 'grid' });

  async function log(product, qty) {
    const text = await logProduct(product, qty, settings.currency);
    toast(`✓ ${product.name}${qty > 1 ? ` ×${qty}` : ''} — ${text} qo'shildi`);
  }

  function openQuantity(product) {
    openSheet({
      title: product.name,
      build(body, close) {
        const input = el('input', { class: 'qty-input', type: 'number', inputmode: 'numeric', min: '1', max: '999', value: '1' });
        const total = el('p', { class: 'total' });
        const readQty = () => Math.max(1, Math.min(999, Math.floor(Number(input.value)) || 1));
        const refresh = () => {
          total.textContent = `${readQty()} × ${money(product.price)} = ${money(product.price * readQty())}`;
        };
        const setQty = (value) => {
          input.value = String(Math.max(1, Math.min(999, value)));
          refresh();
        };
        input.addEventListener('input', refresh);

        body.append(
          el('p', { class: 'muted', text: `Narxi: ${money(product.price)}` }),
          el(
            'div',
            { class: 'stepper' },
            el('button', { class: 'btn btn-secondary', type: 'button', text: '−', onclick: () => setQty(readQty() - 1) }),
            input,
            el('button', { class: 'btn btn-secondary', type: 'button', text: '+', onclick: () => setQty(readQty() + 1) }),
          ),
          el('div', { class: 'chips' }, [2, 3, 5, 10].map((n) => el('button', { class: 'chip-btn', type: 'button', text: String(n), onclick: () => setQty(n) }))),
          total,
          el('button', {
            class: 'btn btn-block',
            type: 'button',
            text: "Xarajatga qo'shish",
            onclick: async () => {
              const qty = readQty();
              close();
              await log(product, qty);
            },
          }),
        );
        refresh();
      },
    });
  }

  function card(product) {
    const category = categoryById(product.category);
    const main = el(
      'button',
      { class: 'product-main', type: 'button' },
      el('span', { class: 'chip', style: `--accent:${category.color}`, text: category.name }),
      el('strong', { class: 'product-name', text: product.name }),
      el('span', { class: 'product-price', text: money(product.price) }),
      el('small', { class: 'muted', text: product.place || ' ' }),
    );
    bindPress(main, {
      onTap: () => log(product, 1),
      onLongPress: () => openQuantity(product),
    });
    return el(
      'div',
      { class: 'product-card' },
      main,
      el('button', { class: 'product-edit', type: 'button', onclick: () => openProductForm({ product, onSaved: rerender }), text: '✎ Tahrirlash' }),
    );
  }

  function drawGrid() {
    const query = search.value.trim().toLowerCase();
    const shown = products.filter((product) =>
      !query || product.name.toLowerCase().includes(query) || (product.place ?? '').toLowerCase().includes(query),
    );
    grid.replaceChildren(
      ...(shown.length
        ? shown.map(card)
        : [empty(products.length ? 'Hech narsa topilmadi' : "Hali mahsulot yo'q. \"+ Yangi\" tugmasi bilan qo'shing.")]),
    );
  }

  root.replaceChildren(
    el('div', { class: 'toolbar' }, search, el('button', { class: 'btn', type: 'button', text: '+ Yangi', onclick: () => openProductForm({ onSaved: rerender }) })),
    el('p', { class: 'hint', text: "Bosing — darhol xarajatga qo'shiladi. Ushlab turing — miqdorni tanlang." }),
    grid,
  );
  drawGrid();
}
