import 'dotenv/config';
import { spawnSync } from 'node:child_process';
const url = process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  model = process.env.OLLAMA_MODEL || 'qwen3:4b';
if (process.argv.includes('--setup')) {
  console.log('Optional free local provider. Install Ollama from https://ollama.com/download.');
  console.log(
    `The ${model} download is approximately 2.5 GB. Run ollama pull ${model} after reviewing disk and memory capacity.`,
  );
  const r = spawnSync('ollama', ['--version'], { encoding: 'utf8' });
  console.log(
    r.status === 0
      ? r.stdout
      : 'Ollama CLI not detected. You can also use your own cloud provider key in the app.',
  );
}
try {
  const r = await fetch(url + '/api/tags', { signal: AbortSignal.timeout(3000) });
  const data = (await r.json()) as any;
  console.log(
    'Ollama connected:',
    data.models?.map((m: any) => m.name).join(', ') || 'No models installed',
  );
} catch {
  console.log(
    'Ollama disconnected. Deterministic shopping works; choose your own API provider in the agent popup.',
  );
  process.exitCode = 1;
}
