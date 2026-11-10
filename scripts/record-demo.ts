import { chromium, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { Store } from '../server/db.js';
import { seed } from '../server/seed.js';
import { createUser } from '../server/auth.js';

// This records the real application. There are no intercepted or mocked provider responses.
const chapters = [
  {
    start: 0,
    end: 15,
    title: 'GOOD PRODUCTS. SECOND CHANCES.',
    text: 'Perfectly good stock gets overlooked. Reclaim Run gives it another purpose. This inventory rescue arcade starts with what a buyer needs, then builds a deal within real commercial boundaries.',
  },
  {
    start: 15,
    end: 31,
    title: 'SCOUT / A REAL PERSISTENT CATALOG',
    text: 'Explore the actual workspace catalog. Every quantity and configured price comes from SQLite. These products are clearly labeled synthetic demonstration inventory. Search a category and inspect an item before adding anything.',
  },
  {
    start: 31,
    end: 54,
    title: 'FORGE / GOAL + BUDGET + BOUNDARIES',
    text: 'Set a creator mission, a maximum budget, and the categories you need. The deterministic engine compares three distinct strategies: budget hunter, maximum configured value, and merchant rescue. Integer arithmetic protects price floors, gross margins, and available stock. The comparison table makes the tradeoffs explicit.',
  },
  {
    start: 54,
    end: 72,
    title: 'QUOTE / RESERVED STOCK, CLEAR TOTAL',
    text: 'Choose a bundle and customize it. The server recalculates each change and creates an immutable quote with a stock reservation. PayPal credentials are not configured in this recording, so checkout says so. No successful payment is invented.',
  },
  {
    start: 72,
    end: 90,
    title: 'YOUR PROVIDER / YOUR KEY / MEMORY ONLY',
    text: 'For AI assistance, choose your own provider and tool capable model, or use local Ollama. Keys remain in memory only. They are never saved to the database, browser storage, or logs. Set request and output limits before starting a run.',
  },
  {
    start: 90,
    end: 112,
    title: 'MERCHANT / INVENTORY, MARGINS & PAYMENT LEDGER',
    text: 'The merchant console manages inventory with AG Grid Community, validated imports, and approved discount boundaries. Recovery radar shows stock age and configured economics. The ledger reports zero sales because PayPal has not confirmed a capture. Real provider verification remains a clearly documented next step.',
  },
  {
    start: 112,
    end: 120,
    title: 'RECLAIM//RUN / RUNNABLE OPEN SOURCE',
    text: 'Save the stock. Forge a deal. Pay for real. The runnable source and verification notes are on GitHub.',
  },
];

const assets = resolve('data/video-assets');
mkdirSync(assets, { recursive: true });
const database = join(assets, 'demo-' + Date.now() + '.sqlite');
const email = 'demo@reclaim.local',
  password = randomBytes(20).toString('hex');
const store = new Store(database);
seed(store);
createUser(store, email, password, 'owner');
store.close();
const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts', '--production'], {
  env: {
    ...process.env,
    PORT: '3102',
    HOST: '127.0.0.1',
    APP_URL: 'http://localhost:3102',
    DATABASE_PATH: database,
    PAYPAL_CLIENT_ID: '',
    PAYPAL_CLIENT_SECRET: '',
    PAYPAL_MERCHANT_ID: '',
    PAYPAL_WEBHOOK_ID: '',
    SECURE_COOKIES: 'false',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const r = await fetch('http://localhost:3102');
      if (r.ok) break;
    } catch {}
    if (attempt === 39) throw new Error('Demo server did not become ready.');
    await new Promise((r) => setTimeout(r, 500));
  }
  const ffmpeg = execFileSync(
    'python',
    [
      '-c',
      "import sys;sys.path.insert(0,'data/video-tools');import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())",
    ],
    { encoding: 'utf8' },
  ).trim();
  const escapePS = (text: string) => text.replace(/'/g, "''");
  const speechScript = join(assets, 'narrate.ps1');
  writeFileSync(
    speechScript,
    "Add-Type -AssemblyName System.Speech\n$speech = New-Object System.Speech.Synthesis.SpeechSynthesizer\ntry { $speech.SelectVoice('Microsoft Zira Desktop') } catch {}\n$speech.Rate = 0\n" +
      chapters
        .map(
          (c, i) =>
            `$speech.SetOutputToWaveFile('${escapePS(join(assets, `chapter-${i}.wav`))}')\n$speech.Speak('${escapePS(c.text)}')\n`,
        )
        .join('') +
      '$speech.Dispose()\n',
  );
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', speechScript],
    { stdio: 'pipe' },
  );
  const audioDurations: number[] = JSON.parse(
    execFileSync(
      'python',
      [
        '-c',
        'import wave,json,sys;print(json.dumps([wave.open(f).getnframes()/wave.open(f).getframerate() for f in sys.argv[1:]]))',
        ...chapters.map((_, i) => join(assets, `chapter-${i}.wav`)),
      ],
      { encoding: 'utf8' },
    ),
  );
  const srtTime = (s: number) => {
    const m = Math.floor(s / 60),
      seconds = s % 60;
    return `00:${String(m).padStart(2, '0')}:${String(seconds).padStart(2, '0')},000`;
  };
  writeFileSync(
    join(assets, 'captions.srt'),
    chapters
      .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.title}\n`)
      .join('\n'),
  );
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: assets, size: { width: 1280, height: 800 } },
    reducedMotion: 'reduce',
  });
  const session = await (await context.request.get('http://localhost:3102/api/session')).json();
  const signedIn = await context.request.post('http://localhost:3102/api/auth/login', {
    headers: { 'x-csrf-token': session.csrf, Origin: 'http://localhost:3102' },
    data: { email, password },
  });
  if (!signedIn.ok()) throw new Error('Demo merchant authentication failed.');
  const recordingStarted = Date.now(),
    page = await context.newPage();
  await page.goto('http://localhost:3102');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const start = Date.now(),
    trim = (start - recordingStarted) / 1000;
  const until = async (seconds: number) => {
    const delay = start + seconds * 1000 - Date.now();
    if (delay > 0) await page.waitForTimeout(delay);
  };
  const dismissToast = async () => {
    const b = page.getByRole('button', { name: 'Dismiss notification' });
    if (await b.isVisible()) await b.click();
  };
  console.log('Recording chapter 1/7: real landing and warehouse');
  await until(5);
  await page.getByRole('button', { name: 'Explore Audio', exact: true }).hover();
  await until(9);
  await page.getByRole('button', { name: 'Explore Organization', exact: true }).hover();
  await until(15);
  console.log('Recording chapter 2/7: catalog and product detail');
  await page.getByRole('button', { name: 'Explore Audio', exact: true }).click();
  await until(19);
  await page.getByRole('textbox', { name: 'Search products' }).fill('headphones');
  await until(22);
  await page.getByRole('button', { name: 'View Studio headphones' }).click();
  await until(28);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await until(31);
  console.log('Recording chapter 3/7: actual deterministic mission and offers');
  await page.getByRole('button', { name: 'Rescue run', exact: true }).click();
  await until(36);
  await page.getByRole('textbox', { name: 'What are we building?' }).focus();
  await until(39);
  await page.getByRole('button', { name: 'Forge bundles', exact: true }).click();
  await page.locator('.offer-card').first().waitFor();
  await until(44);
  await page.locator('.duel-heading').scrollIntoViewIfNeeded();
  await until(48);
  await page.getByRole('button', { name: 'Accessible table view' }).click();
  await until(54);
  console.log('Recording chapter 4/7: quote and honest PayPal setup boundary');
  await page.getByRole('button', { name: 'Choose', exact: true }).first().click();
  await until(58);
  const first = page.locator('.cart-line').first(),
    product = await first.locator('strong').innerText();
  await first.getByRole('button', { name: 'Increase ' + product }).click();
  await until(62);
  await page.getByRole('button', { name: 'Reserve & review quote' }).click();
  await page.getByRole('heading', { name: 'A clear deal.' }).waitFor();
  await until(68);
  await page.locator('.setup-note').scrollIntoViewIfNeeded();
  await until(72);
  console.log('Recording chapter 5/7: BYOK popup without storing a key');
  await page.getByRole('button', { name: 'Rescue run', exact: true }).click();
  await page.getByRole('button', { name: 'Connect your AI', exact: true }).click();
  await until(76);
  await page.getByLabel('AI provider').selectOption('anthropic');
  await until(80);
  await page.getByLabel('AI provider').selectOption('custom');
  await until(83);
  await page.getByRole('dialog').locator('.privacy-note').scrollIntoViewIfNeeded();
  await until(88);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await until(90);
  console.log('Recording chapter 6/7: actual merchant records');
  await page.getByRole('button', { name: 'Merchant command', exact: true }).click();
  await page.locator('.merchant-sidebar').waitFor();
  await until(96);
  await page.getByRole('button', { name: 'Inventory vault', exact: true }).click();
  await until(102);
  await page.getByRole('button', { name: 'Recovery radar', exact: true }).click();
  await until(107);
  await page.getByRole('button', { name: 'Payment ledger', exact: true }).click();
  await until(112);
  console.log('Recording chapter 7/7: closing');
  await page.locator('a.brand').click();
  await until(120);
  const video = page.video()!;
  await page.close();
  const videoPath = await video.path();
  await context.close();
  await browser.close();
  browser = undefined;
  const audioInputs = chapters.flatMap((_, i) => ['-i', join(assets, `chapter-${i}.wav`)]);
  const filters =
    chapters
      .map(
        (c, i) =>
          `[${i + 1}:a]atempo=${Math.max(1, audioDurations[i] / (c.end - c.start - 0.6)).toFixed(4)},atrim=0:${c.end - c.start - 0.25},asetpts=PTS-STARTPTS,adelay=${c.start * 1000}|${c.start * 1000}[a${i}]`,
      )
      .join(';') +
    ';' +
    chapters.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${chapters.length}:duration=longest:normalize=0,apad,alimiter=limit=0.95[audio]`;
  const output = resolve('..', 'RECLAIM-RUN-demo.mp4');
  const args = [
    '-y',
    '-ss',
    trim.toFixed(3),
    '-i',
    videoPath,
    ...audioInputs,
    '-filter_complex',
    filters,
    '-map',
    '0:v',
    '-map',
    '[audio]',
    '-vf',
    "subtitles=captions.srt:force_style='FontName=Arial,FontSize=13,PrimaryColour=&H0052FFCF,OutlineColour=&H00140B09,BorderStyle=3,Outline=7,MarginV=12'",
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '21',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-t',
    '120',
    '-movflags',
    '+faststart',
    output,
  ];
  console.log('Encoding 120-second MP4 with chapter captions and local narration…');
  execFileSync(ffmpeg, args, {
    cwd: assets,
    stdio: ['ignore', 'ignore', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
  console.log('SAVED VIDEO:', output);
  const verification = execFileSync(ffmpeg, ['-i', output, '-f', 'null', '-'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
  console.log(
    'Video decoding verified. Source footage, captions and narration retained under data/video-assets.',
  );
} finally {
  if (browser) await browser.close();
  server.kill();
}
