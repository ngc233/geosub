import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';

// A three-day lag is a collection cutoff, never a settlement assertion.
export function googleCollectionWindow(now = new Date()) {
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year:'numeric',month:'2-digit',day:'2-digit' }).format(now);
  const shift = n => new Date(Date.parse(`${localDate}T00:00:00Z`) + n * 86400000).toISOString().slice(0,10);
  return { startDate: shift(-30), endDate: shift(-3) };
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const window = googleCollectionWindow();
  process.stdout.write(`${window.startDate} ${window.endDate}\n`);
}
