import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { config } from './config.js';

const run = promisify(execFile);
const TAIL_BYTES = 64 * 1024;

// pm2 sets pm_id in the env of every process it starts, so the panel can
// recognise itself even if it was renamed.
export const isSelf = p => p.name === config.selfName || String(p.id) === process.env.pm_id;

export async function listProcesses() {
  const { stdout } = await run(config.pm2Bin, ['jlist'], { maxBuffer: 16 * 1024 * 1024 });
  const list = JSON.parse(stdout.slice(stdout.indexOf('[')) || '[]');
  return list.map(p => {
    const env = p.pm2_env || {};
    const online = env.status === 'online';
    return {
      id: p.pm_id,
      name: p.name,
      status: env.status || 'unknown',
      uptimeMs: online && env.pm_uptime ? Date.now() - env.pm_uptime : null,
      memory: p.monit?.memory ?? 0,
      restarts: env.restart_time ?? 0,
      outLog: env.pm_out_log_path,
      errLog: env.pm_err_log_path,
    };
  });
}

const ACTIONS = new Set(['start', 'stop', 'restart']);

export async function pm2Action(action, id) {
  if (!ACTIONS.has(action)) throw new Error(`Noma'lum amal: ${action}`);
  await run(config.pm2Bin, [action, String(id)], { timeout: 60000 });
}

// Last `lines` lines of a log file, read from the end so big logs stay cheap.
export async function tailFile(path, lines) {
  if (!path) return '';
  let fh;
  try {
    fh = await fs.open(path, 'r');
  } catch {
    return '';
  }
  try {
    const { size } = await fh.stat();
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, size - len);
    let text = buf.toString('utf8');
    if (len < size) text = text.slice(text.indexOf('\n') + 1);
    return text
      .replace(/\x1b\[[0-9;]*m/g, '')
      .replace(/\s+$/, '')
      .split('\n')
      .slice(-lines)
      .join('\n');
  } finally {
    await fh.close();
  }
}
