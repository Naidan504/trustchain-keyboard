#!/usr/bin/env node
// Grok task runner (xAI API). Reads XAI_API_KEY from ~/.config/xai.env; never prints it.
//   node run-grok.mjs --ping                  smoke test, prints the model's reply
//   node run-grok.mjs <task.md> [outDir]      runs a task; the model answers with files to write
// A task file is plain text. Grok must answer with JSON: {"files":[{"path","content"}],"notes":"..."}.
// Files are written under outDir (default: repo root), never outside it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const MODELS = (process.env.GROK_MODELS || 'grok-4.7,grok-4.6').split(',');
const envFile = path.join(os.homedir(), '.config/xai.env');
const key = process.env.XAI_API_KEY ||
  (fs.existsSync(envFile) && fs.readFileSync(envFile, 'utf8').match(/^XAI_API_KEY=(.+)$/m)?.[1].trim());
if (!key) { console.error(`no XAI_API_KEY (looked in env and ${envFile})`); process.exit(2); }

async function chat(messages, { json = false } = {}) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model, messages, ...(json ? { response_format: { type: 'json_object' } } : {}) }),
          signal: AbortSignal.timeout(600_000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`${model} HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
        return { model, text: body.choices?.[0]?.message?.content ?? '' };
      } catch (e) {
        lastErr = e;
        console.error(`attempt ${attempt} failed: ${e.message}`);
        await new Promise(r => setTimeout(r, 5000 * attempt));
      }
    }
  }
  throw lastErr;
}

const arg = process.argv[2];
if (!arg) { console.error('usage: run-grok.mjs --ping | <task.md> [outDir]'); process.exit(2); }

if (arg === '--ping') {
  const { model, text } = await chat([{ role: 'user', content: 'Translate to Mongolian Cyrillic, one word only: keyboard' }]);
  console.log(`${model}: ${text.trim()}`);
  process.exit(0);
}

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.resolve(process.argv[3] || repo);
const task = fs.readFileSync(arg, 'utf8');
const system = `You are a contributor to TrustChain Keyboard, a Mongolian Cyrillic phone keyboard (Android + iOS) by TrustChain (trustchain.mn).
Do the task. Answer ONLY with a JSON object: {"files":[{"path":"relative/path","content":"full file text"}],"notes":"short summary, open questions"}.
Paths are relative to the repo root. Write complete files, UTF-8, no placeholders.`;
const { model, text } = await chat([{ role: 'system', content: system }, { role: 'user', content: task }], { json: true });

let out;
try { out = JSON.parse(text); } catch {
  const raw = path.join(outDir, `agents/out/${path.basename(arg, '.md')}.raw.txt`);
  fs.mkdirSync(path.dirname(raw), { recursive: true });
  fs.writeFileSync(raw, text);
  console.error(`model returned non-JSON; saved to ${raw}`);
  process.exit(1);
}
for (const f of out.files || []) {
  const dest = path.resolve(outDir, f.path);
  if (!dest.startsWith(outDir + path.sep)) { console.error(`skipped unsafe path ${f.path}`); continue; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, f.content);
  console.log(`wrote ${path.relative(outDir, dest)}`);
}
console.log(`[${model}] ${out.notes || ''}`);
