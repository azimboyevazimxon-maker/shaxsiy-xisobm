import { Bot, InlineKeyboard } from 'grammy';
import { config } from './config.js';
import { listProcesses, pm2Action, tailFile, isSelf } from './pm2.js';
import { mainMenu, processScreen, phoneScreen } from './screens.js';
import { createMonitor } from './monitor.js';
import { esc } from './format.js';

const ACTION_DONE = { start: 'yoqildi', stop: 'o\'chirildi', restart: 'qayta yoqildi' };
const LOG_CHARS = 1800;

export function createBot() {
  const bot = new Bot(config.token);
  const monitor = createMonitor(bot);

  // Owners only. Everyone else gets no reply at all.
  bot.use(async (ctx, next) => {
    if (ctx.from && config.ownerIds.includes(ctx.from.id)) await next();
  });

  // Edits the message that held the button, or sends a new one for commands.
  async function show(ctx, { text, keyboard }) {
    const opts = { parse_mode: 'HTML', reply_markup: keyboard };
    if (!ctx.callbackQuery) return ctx.reply(text, opts);
    try {
      await ctx.editMessageText(text, opts);
    } catch (err) {
      if (!/message is not modified/.test(err.description ?? '')) throw err;
    }
  }

  async function sendLogs(ctx, proc) {
    const out = await tailFile(proc.outLog, config.logLines);
    const err = await tailFile(proc.errLog, config.logLines);
    const clip = s => (s.length > LOG_CHARS ? `…${s.slice(-LOG_CHARS)}` : s);

    const parts = [`📄 <b>${esc(proc.name)}</b> — oxirgi ${config.logLines} qator`];
    parts.push(`<pre>${esc(out ? clip(out) : 'Log bo\'sh yoki topilmadi')}</pre>`);
    if (err) parts.push(`⚠️ <b>stderr:</b>\n<pre>${esc(clip(err))}</pre>`);
    await ctx.reply(parts.join('\n'), { parse_mode: 'HTML' });
  }

  bot.command(['start', 'menu'], async ctx => show(ctx, mainMenu()));

  bot.callbackQuery('menu', async ctx => {
    await ctx.answerCallbackQuery();
    await show(ctx, mainMenu());
  });

  bot.callbackQuery('procs', async ctx => {
    await ctx.answerCallbackQuery();
    await show(ctx, await processScreen());
  });

  bot.callbackQuery('phone', async ctx => {
    await ctx.answerCallbackQuery();
    await show(ctx, await phoneScreen());
  });

  bot.callbackQuery('noop', ctx => ctx.answerCallbackQuery());

  bot.callbackQuery(/^p:(start|stop|restart|logs):(\d+)$/, async ctx => {
    const [, action, idStr] = ctx.match;
    const proc = (await listProcesses()).find(p => p.id === Number(idStr));

    if (!proc) {
      await ctx.answerCallbackQuery({ text: 'Jarayon topilmadi', show_alert: true });
      return show(ctx, await processScreen());
    }
    if (isSelf(proc)) {
      return ctx.answerCallbackQuery({ text: '🚫 Panel botni boshqarib bo\'lmaydi', show_alert: true });
    }

    if (action === 'logs') {
      await ctx.answerCallbackQuery();
      return sendLogs(ctx, proc);
    }

    try {
      await pm2Action(action, proc.id);
      monitor.forget(proc.id);
      await ctx.answerCallbackQuery({ text: `✅ ${proc.name} ${ACTION_DONE[action]}` });
    } catch (err) {
      await ctx.answerCallbackQuery({ text: `❌ Xatolik: ${err.message.slice(0, 150)}`, show_alert: true });
    }
    await show(ctx, await processScreen());
  });

  bot.callbackQuery('restart_ask', async ctx => {
    await ctx.answerCallbackQuery();
    await show(ctx, {
      text: '⚠️ Panel botdan tashqari <b>barcha</b> jarayonlar qayta yoqiladi.\n\nTasdiqlaysizmi?',
      keyboard: new InlineKeyboard()
        .text('✅ Ha, qayta yoqish', 'restart_yes')
        .text('❌ Bekor', 'menu'),
    });
  });

  bot.callbackQuery('restart_yes', async ctx => {
    await ctx.answerCallbackQuery({ text: 'Qayta yoqilmoqda...' });
    const procs = (await listProcesses()).filter(p => !isSelf(p));
    const results = await Promise.allSettled(procs.map(p => pm2Action('restart', p.id)));

    const failed = [];
    results.forEach((r, i) => {
      monitor.forget(procs[i].id);
      if (r.status === 'rejected') failed.push(procs[i].name);
    });

    const ok = procs.length - failed.length;
    const lines = [`✅ ${ok} ta jarayon qayta yoqildi.`];
    if (failed.length) lines.push(`❌ Xatolik: ${failed.map(esc).join(', ')}`);
    await show(ctx, {
      text: lines.join('\n'),
      keyboard: new InlineKeyboard().text('📋 Jarayonlar', 'procs').text('🏠 Menyu', 'menu'),
    });
  });

  bot.catch(err => console.error('Bot xatosi:', err.error?.message ?? err.message));

  return { bot, monitor };
}
