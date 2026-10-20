import { store } from '../store.js';
import { ask, el, field, toast } from '../ui.js';
import { dateKey } from '../utils.js';
import { canPromptInstall, isIos, isStandalone, promptInstall } from '../pwa.js';

function section(title, ...children) {
  return el('section', { class: 'card' }, el('h2', { text: title }), ...children);
}

async function exportData() {
  const json = await store.exportJson();
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = el('a', { href: url, download: `xarajat-zaxira-${dateKey()}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Zaxira fayli yuklab olindi');
}

async function importData(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  const ok = await ask(
    'Ma\'lumotni tiklash',
    "Joriy barcha ma'lumotlar fayldagi ma'lumotlar bilan almashtiriladi. Davom etasizmi?",
    { yes: 'Tiklash', danger: true },
  );
  if (!ok) return;

  try {
    await store.importJson(await file.text());
    toast('Ma\'lumot tiklandi');
    location.hash = '#/home';
  } catch (error) {
    toast(error.message || "Faylni o'qib bo'lmadi");
  }
}

async function clearAll() {
  const ok = await ask("Hammasini o'chirish", "Barcha mahsulot, xarajat, kirim, kopilka va qarz yozuvlari butunlay o'chadi. Oldindan zaxira oling.", { yes: "Ha, o'chirish", danger: true });
  if (!ok) return;
  await store.clear();
  toast("Barcha ma'lumotlar o'chirildi");
  location.hash = '#/home';
}

function installBlock() {
  if (isStandalone()) {
    return el('p', { class: 'muted', text: "Ilova telefoningizga o'rnatilgan." });
  }
  if (canPromptInstall()) {
    return el('button', {
      class: 'btn btn-block',
      type: 'button',
      text: "Telefonga o'rnatish",
      onclick: async () => {
        const installed = await promptInstall();
        toast(installed ? "Ilova o'rnatildi" : "O'rnatish bekor qilindi");
      },
    });
  }
  if (isIos()) {
    return el('p', { class: 'hint', text: "iPhone'da: Safari'da «Ulashish» → «Bosh ekranga qo'shish» ni tanlang." });
  }
  return el('p', { class: 'hint', text: "Brauzer menyusidan «Ilovani o'rnatish» yoki «Bosh ekranga qo'shish» ni tanlang." });
}

export async function render(root) {
  const settings = await store.getSettings();

  const currency = el('input', { type: 'text', maxlength: '12', autocomplete: 'off', placeholder: "so'm", value: settings.currency });
  const fileInput = el('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    onchange: importData,
  });

  root.replaceChildren(
    section(
      'Umumiy',
      el(
        'form',
        {
          class: 'form',
          onsubmit: async (event) => {
            event.preventDefault();
            await store.updateSettings({ currency: currency.value.trim() });
            toast('Saqlandi');
          },
        },
        field('Valyuta belgisi', currency),
        el('button', { class: 'btn', type: 'submit', text: 'Saqlash' }),
      ),
    ),
    section(
      'Zaxira',
      el('p', { class: 'muted', text: "Ma'lumotlar shu qurilmada saqlanadi. Muhim ma'lumotni JSON fayl qilib saqlab qo'ying." }),
      el(
        'div',
        { class: 'row-actions' },
        el('button', { class: 'btn', type: 'button', text: 'Eksport (JSON)', onclick: exportData }),
        el('label', { class: 'btn btn-secondary file-btn' }, 'Import (JSON)', fileInput),
      ),
    ),
    section('Ilova', installBlock()),
    section(
      'Xavfli zona',
      el('button', { class: 'btn btn-danger btn-block', type: 'button', text: "Hammasini o'chirish", onclick: clearAll }),
    ),
    el('p', { class: 'hint center', text: 'Xarajatlar · v1' }),
  );
}
