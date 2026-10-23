import { InlineKeyboard } from 'grammy';
import { listProcesses, isSelf } from './pm2.js';
import { getPhoneStatus } from './phone.js';
import { config } from './config.js';
import { esc, fmtBytes, fmtDuration } from './format.js';

const isOnline = p => p.status === 'online';
const icon = p => (isOnline(p) ? '🟢' : '🔴');

const CHARGE_LABEL = {
  CHARGING: 'zaryad olmoqda',
  DISCHARGING: 'zaryadsiz',
  FULL: 'to\'liq',
  NOT_CHARGING: 'zaryad olmayapti',
};

export function mainMenu() {
  return {
    text: '🖥 <b>Server panel</b>\n\nKerakli bo\'limni tanlang:',
    keyboard: new InlineKeyboard()
      .text('📋 Jarayonlar', 'procs').row()
      .text('📱 Telefon holati', 'phone').row()
      .text('🔄 Hammasini qayta yoqish', 'restart_ask'),
  };
}

export async function processScreen() {
  const procs = (await listProcesses()).filter(p => !isSelf(p));
  const running = procs.filter(isOnline).length;

  const body = procs.length
    ? procs.map(p => {
      const uptime = fmtDuration(p.uptimeMs);
      return `${icon(p)} <b>${esc(p.name)}</b> — ${esc(p.status)}\n    ⏱ ${uptime} · 🧠 ${fmtBytes(p.memory)}`;
    }).join('\n')
    : 'Jarayon topilmadi.';

  const keyboard = new InlineKeyboard();
  for (const p of procs) {
    keyboard
      .text(`${icon(p)} ${p.name}`, 'noop').row()
      .text('▶️ Yoqish', `p:start:${p.id}`)
      .text('⏹ O\'chirish', `p:stop:${p.id}`)
      .text('🔄 Qayta', `p:restart:${p.id}`)
      .text('📄 Log', `p:logs:${p.id}`).row();
  }
  keyboard.text('🔁 Yangilash', 'procs').text('🏠 Menyu', 'menu');

  return {
    text: `📋 <b>Jarayonlar</b> (${running}/${procs.length} ishlamoqda)\n\n${body}`,
    keyboard,
  };
}

export async function phoneScreen() {
  const s = await getPhoneStatus();
  const b = s.battery;

  const batteryLine = b
    ? `${b.percentage <= config.batteryLow ? '🪫' : '🔋'} Batareya: <b>${b.percentage}%</b> (${CHARGE_LABEL[b.status] ?? esc(b.status.toLowerCase())})`
    : '🔋 Batareya: ma\'lumot yo\'q (Termux:API o\'rnatilganmi?)';
  const tempLine = s.temperatureC != null
    ? `🌡 Harorat: <b>${s.temperatureC.toFixed(1)} °C</b>`
    : '🌡 Harorat: ma\'lumot yo\'q';

  const text = [
    '📱 <b>Telefon holati</b>',
    '',
    batteryLine,
    tempLine,
    `⚙️ CPU yuklamasi: <b>${s.cpuPercent}%</b> (${s.cores} yadro)`,
    `🧠 RAM: <b>${fmtBytes(s.memUsed)} / ${fmtBytes(s.memTotal)}</b> (bo'sh ${fmtBytes(s.memFree)})`,
    `⏱ Server uptime: ${fmtDuration(s.uptimeMs)}`,
  ].join('\n');

  const keyboard = new InlineKeyboard().text('🔁 Yangilash', 'phone').text('🏠 Menyu', 'menu');
  return { text, keyboard };
}
