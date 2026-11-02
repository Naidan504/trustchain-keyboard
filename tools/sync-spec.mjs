// Copies spec/layout.json into every platform, so each one bundles the same layout.
// Run from anywhere: node tools/sync-spec.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'spec/layout.json');
JSON.parse(fs.readFileSync(src, 'utf8')); // fail early on broken JSON
const targets = [
  'web/layout.json',
  'android/app/src/main/assets/layout.json',
  'ios/Keyboard/layout.json',
];
for (const t of targets) {
  const dest = path.join(root, t);
  if (!fs.existsSync(path.join(root, t.split('/')[0]))) continue; // platform folder not started yet
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`synced ${t}`);
}
