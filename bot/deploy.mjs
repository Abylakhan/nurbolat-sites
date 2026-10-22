// One-command launch of the bot on Cloudflare from your own computer.
//   node bot/deploy.mjs              first launch (asks for the bot token)
//   node bot/deploy.mjs --admin ID   send orders to this chat id (from /myid)
// Cloudflare login opens in the browser; the token never leaves your computer.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const TOML = join(DIR, 'wrangler.toml');
const WRANGLER = ['--yes', 'wrangler@4'];

function wrangler(args, { input, capture } = {}) {
  const res = spawnSync('npx', [...WRANGLER, ...args], {
    cwd: DIR, input, encoding: 'utf8', shell: process.platform === 'win32',
    stdio: capture || input !== undefined ? ['pipe', 'pipe', 'inherit'] : 'inherit'
  });
  if (res.status !== 0) {
    if (res.stdout) console.log(res.stdout);
    throw new Error(`wrangler ${args.join(' ')} failed`);
  }
  return res.stdout || '';
}

const putSecret = (name, value) => wrangler(['secret', 'put', name], { input: value + '\n' });
const step = text => console.log(`\n▶ ${text}`);

async function main() {
  const adminIdx = process.argv.indexOf('--admin');
  if (adminIdx > -1) {
    const id = process.argv[adminIdx + 1];
    if (!/^-?\d+$/.test(id || '')) throw new Error('Укажите число из /myid: node bot/deploy.mjs --admin 123456789');
    step('Сохраняю ваш chat id, чтобы заявки приходили вам');
    putSecret('ADMIN_CHAT_ID', id);
    console.log('\n✅ Готово. Заявки и вопросы клиентов теперь будут приходить вам в Telegram.');
    return;
  }

  step('Вход в Cloudflare (откроется браузер, если вы ещё не вошли)');
  const who = spawnSync('npx', [...WRANGLER, 'whoami'], { cwd: DIR, encoding: 'utf8', shell: process.platform === 'win32' });
  if (who.status !== 0 || /not authenticated/i.test(who.stdout + who.stderr)) wrangler(['login']);

  let toml = readFileSync(TOML, 'utf8');
  if (!/^\[\[kv_namespaces\]\]/m.test(toml)) {
    step('Создаю память для диалогов (KV)');
    const out = wrangler(['kv', 'namespace', 'create', 'HISTORY'], { capture: true });
    const id = (out.match(/[0-9a-f]{32}/) || [])[0];
    if (!id) throw new Error('Не нашёл id KV в ответе wrangler:\n' + out);
    toml = toml.replace(/# \[\[kv_namespaces\]\]\n# binding = "HISTORY"\n# id = ""/, `[[kv_namespaces]]\nbinding = "HISTORY"\nid = "${id}"`);
    writeFileSync(TOML, toml);
  }

  let token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    token = (await rl.question('\nВставьте токен бота от @BotFather и нажмите Enter: ')).trim();
    rl.close();
  }
  const me = await (await fetch(`https://api.telegram.org/bot${token}/getMe`)).json();
  if (!me.ok) throw new Error('Telegram не принял токен. Скопируйте его из @BotFather ещё раз.');

  step('Загружаю бота в Cloudflare');
  const out = wrangler(['deploy'], { capture: true });
  console.log(out);
  const url = (out.match(/https:\/\/[\w.-]+\.workers\.dev/) || [])[0];
  if (!url) throw new Error('Не нашёл адрес воркера в ответе wrangler');

  step('Сохраняю ключи');
  const secret = randomBytes(24).toString('hex');
  putSecret('BOT_TOKEN', token);
  putSecret('WEBHOOK_SECRET', secret);

  step('Подключаю бота к Telegram');
  let hook = {};
  for (let i = 0; i < 6 && !hook.ok; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try { hook = await (await fetch(`${url}/setup?secret=${secret}`)).json(); } catch { hook = {}; }
  }
  if (!hook.ok) throw new Error(`Webhook не подключился, откройте вручную: ${url}/setup?secret=${secret}`);

  console.log(`\n✅ Бот работает: https://t.me/${me.result.username}`);
  console.log('Последний шаг: напишите боту /myid и запустите');
  console.log('   node bot/deploy.mjs --admin <число из ответа бота>');
}

main().catch(err => { console.error('\n❌ ' + err.message); process.exit(1); });
