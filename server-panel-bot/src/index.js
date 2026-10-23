import { createBot } from './bot.js';

const { bot, monitor } = createBot();

const me = await bot.api.getMe();
console.log(`@${me.username} ishga tushdi (polling).`);

monitor.start();

const shutdown = () => {
  monitor.stop();
  bot.stop();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

// Drop updates queued while the bot was down, so an old "Restart all"
// button press can't fire unexpectedly after a restart.
await bot.start({ drop_pending_updates: true });
