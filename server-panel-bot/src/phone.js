import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import { promisify } from 'node:util';

const run = promisify(execFile);

// termux-battery-status lives in Termux's prefix. Inside a proot distro the
// same binary is often not on PATH, so try the absolute path too.
// Set TERMUX_BATTERY_CMD in .env to override.
const BATTERY_CMDS = [
  process.env.TERMUX_BATTERY_CMD,
  'termux-battery-status',
  '/data/data/com.termux/files/usr/bin/termux-battery-status',
].filter(Boolean);

const SYSFS_BATTERY = '/sys/class/power_supply/battery';

// sysfs reports tenths of a degree on most devices, millidegrees on some.
const normalizeTemp = raw => (raw > 1000 ? raw / 1000 : raw / 10);

async function termuxBattery() {
  for (const cmd of BATTERY_CMDS) {
    try {
      const { stdout } = await run(cmd, [], { timeout: 15000 });
      const j = JSON.parse(stdout);
      const percentage = Number(j.percentage);
      if (!Number.isFinite(percentage)) continue;
      return {
        percentage,
        status: String(j.status || 'UNKNOWN').toUpperCase(),
        temperatureC: typeof j.temperature === 'number' ? j.temperature : null,
        source: cmd,
      };
    } catch {
      // Not found, Termux:API app missing, or bad output: try the next source.
    }
  }
  return null;
}

async function sysfsBattery() {
  const read = name => fs.readFile(`${SYSFS_BATTERY}/${name}`, 'utf8').then(s => s.trim(), () => null);
  const capacity = await read('capacity');
  if (capacity === null) return null;
  const status = await read('status');
  const temp = await read('temp');
  return {
    percentage: Number(capacity),
    status: (status || 'UNKNOWN').toUpperCase().replace(/ /g, '_'),
    temperatureC: temp === null ? null : normalizeTemp(Number(temp)),
    source: 'sysfs',
  };
}

export async function getBattery() {
  return (await termuxBattery()) ?? (await sysfsBattery());
}

export async function getPhoneStatus() {
  const battery = await getBattery();
  const cores = os.cpus().length || 1;
  const total = os.totalmem();
  const free = os.freemem();
  return {
    battery,
    temperatureC: battery?.temperatureC ?? null,
    cpuPercent: Math.round((os.loadavg()[0] / cores) * 100),
    cores,
    memTotal: total,
    memUsed: total - free,
    memFree: free,
    uptimeMs: os.uptime() * 1000,
  };
}
