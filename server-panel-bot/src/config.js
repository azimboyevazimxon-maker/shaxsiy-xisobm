import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const token = process.env.BOT_TOKEN?.trim();
if (!token) {
  console.error('BOT_TOKEN .env faylida yo\'q. .env.example ga qarang.');
  process.exit(1);
}

const ownerIds = (process.env.OWNER_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(Number);
if (!ownerIds.length || ownerIds.some(Number.isNaN)) {
  console.error('OWNER_IDS noto\'g\'ri. Masalan: OWNER_IDS=5990563852');
  process.exit(1);
}

export const config = {
  token,
  ownerIds,
  // The panel hides itself and refuses to control this pm2 process name.
  selfName: process.env.PANEL_NAME || 'server-panel-bot',
  checkIntervalMs: 2 * 60 * 1000,
  batteryLow: 20,
  batteryRecover: 25,
  tempHigh: 45,
  tempRecover: 42,
  logLines: 50,
  pm2Bin: process.env.PM2_BIN || 'pm2',
};
