// Umumiy DOM yordamchilari. Foydalanuvchi matni hech qachon innerHTML orqali qo'yilmaydi.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else if (key === 'value') node.value = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  const nodes = children
    .flat(Infinity)
    .filter((child) => child !== null && child !== undefined && child !== false)
    .map((child) => (child instanceof Node ? child : document.createTextNode(String(child))));
  node.append(...nodes);
  return node;
}

export function field(label, control) {
  return el('label', { class: 'field' }, el('span', { text: label }), control);
}

export function empty(text) {
  return el('p', { class: 'empty', text });
}

let toastTimer;
export function toast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}

export function openSheet({ title, build, onClose }) {
  const root = document.getElementById('sheet-root');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    root.replaceChildren();
    document.body.classList.remove('sheet-open');
    onClose?.();
  };

  const body = el('div', { class: 'sheet-body' });
  const backdrop = el(
    'div',
    { class: 'backdrop', onclick: (event) => { if (event.target === backdrop) close(); } },
    el(
      'section',
      { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('div', { class: 'sheet-handle' }),
      el(
        'header',
        { class: 'sheet-head' },
        el('h2', { text: title }),
        el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Yopish', onclick: close, text: '✕' }),
      ),
      body,
    ),
  );

  root.replaceChildren(backdrop);
  document.body.classList.add('sheet-open');
  build(body, close);
  return close;
}

export function ask(title, text, { yes = 'Ha', no = "Yo'q", danger = false } = {}) {
  return new Promise((resolve) => {
    openSheet({
      title,
      onClose: () => resolve(false),
      build(body, close) {
        body.append(
          el('p', { class: 'muted', text }),
          el(
            'div',
            { class: 'row-actions' },
            el('button', { class: 'btn btn-ghost', type: 'button', onclick: close, text: no }),
            el('button', {
              class: danger ? 'btn btn-danger' : 'btn',
              type: 'button',
              text: yes,
              onclick: () => { resolve(true); close(); },
            }),
          ),
        );
      },
    });
  });
}

// Bosish va uzoq bosish: bitta bosish onTap, ushlab turish onLongPress
export function bindPress(node, { onTap, onLongPress, delay = 450 }) {
  let timer = null;
  let longPressed = false;
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  node.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    longPressed = false;
    timer = setTimeout(() => {
      longPressed = true;
      timer = null;
      navigator.vibrate?.(15);
      onLongPress();
    }, delay);
  });
  node.addEventListener('pointerup', cancel);
  node.addEventListener('pointerleave', cancel);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('contextmenu', (event) => event.preventDefault());
  node.addEventListener('click', (event) => {
    if (longPressed) {
      longPressed = false;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    onTap(event);
  });
}
