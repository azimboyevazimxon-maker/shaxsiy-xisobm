import { el } from './ui.js';
import { initInstallPrompt, registerServiceWorker } from './pwa.js';
import * as home from './views/home.js';
import * as products from './views/products.js';
import * as stats from './views/stats.js';
import * as savings from './views/savings.js';
import * as debts from './views/debts.js';
import * as settings from './views/settings.js';

const routes = {
  home: { title: 'Asosiy', view: home },
  products: { title: 'Mahsulotlarim', view: products },
  stats: { title: 'Statistika', view: stats },
  savings: { title: 'Kopilka', view: savings },
  debts: { title: 'Qarzlar', view: debts },
  settings: { title: 'Sozlamalar', view: settings },
};

const main = document.getElementById('view');
const titleNode = document.getElementById('page-title');
const backLink = document.getElementById('back-link');
const settingsLink = document.getElementById('settings-link');

function currentRoute() {
  const name = location.hash.replace(/^#\//, '') || 'home';
  return routes[name] ? name : 'home';
}

async function show() {
  const name = currentRoute();
  const route = routes[name];
  const isSettings = name === 'settings';

  document.title = `${route.title} · Xarajatlar`;
  titleNode.textContent = route.title;
  backLink.hidden = !isSettings;
  settingsLink.hidden = isSettings;
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === name);
  });

  main.replaceChildren();
  window.scrollTo(0, 0);
  try {
    await route.view.render(main);
  } catch (error) {
    console.error(error);
    main.append(el('p', { class: 'empty', text: `Xatolik: ${error.message}` }));
  }
}

initInstallPrompt();
registerServiceWorker();
window.addEventListener('hashchange', show);
show();
