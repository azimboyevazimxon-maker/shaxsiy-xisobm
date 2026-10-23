import { config } from './config.js';
import { listProcesses, isSelf } from './pm2.js';
import { getPhoneStatus } from './phone.js';
import { esc } from './format.js';

// Periodic checks that message the owners when something goes wrong.
// Alerts fire once per problem and re-arm only after recovery, so a low
// battery does not spam every two minutes.
export function createMonitor(bot) {
  const seen = new Map(); // pm_id -> { status, restarts }
  const alerted = { battery: false, temp: false };
  let timer = null;
  let running = false;

  async function notify(text) {
    for (const id of config.ownerIds) {
      await bot.api.sendMessage(id, text, { parse_mode: 'HTML' })
        .catch(err => console.error('Ogohlantirish yuborilmadi:', err.description ?? err.message));
    }
  }

  async function checkProcesses() {
    const procs = (await listProcesses()).filter(p => !isSelf(p));
    for (const p of procs) {
      const prev = seen.get(p.id);
      if (prev?.status === 'online' && p.status !== 'online') {
        await notify(`🔴 <b>${esc(p.name)}</b> to'xtab qoldi (holat: ${esc(p.status)})`);
      } else if (prev && p.restarts > prev.restarts) {
        await notify(`⚠️ <b>${esc(p.name)}</b> qayta ishga tushdi — crash bo'lgan bo'lishi mumkin`);
      }
      seen.set(p.id, { status: p.status, restarts: p.restarts });
    }
  }

  async function checkPhone() {
    const { battery: b, temperatureC: t } = await getPhoneStatus();

    if (b) {
      if (b.percentage <= config.batteryLow && !alerted.battery) {
        alerted.battery = true;
        await notify(`🪫 Batareya kam: <b>${b.percentage}%</b> (${config.batteryLow}% dan past)`);
      } else if (b.percentage >= config.batteryRecover) {
        alerted.battery = false;
      }
    }

    if (t !== null) {
      if (t > config.tempHigh && !alerted.temp) {
        alerted.temp = true;
        await notify(`🌡 Harorat yuqori: <b>${t.toFixed(1)} °C</b> (${config.tempHigh} °C dan oshdi)`);
      } else if (t <= config.tempRecover) {
        alerted.temp = false;
      }
    }
  }

  async function tick() {
    if (running) return;
    running = true;
    try {
      await checkProcesses();
    } catch (err) {
      console.error('Jarayonlarni tekshirishda xato:', err.message);
    }
    try {
      await checkPhone();
    } catch (err) {
      console.error('Telefonni tekshirishda xato:', err.message);
    } finally {
      running = false;
    }
  }

  return {
    start() {
      tick();
      timer = setInterval(tick, config.checkIntervalMs);
    },
    stop() {
      clearInterval(timer);
    },
    // Called after a panel action so the intentional stop/start is not reported as a crash.
    forget(id) {
      seen.delete(id);
    },
  };
}
