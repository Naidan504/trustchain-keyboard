// node --test spec/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = JSON.parse(fs.readFileSync(new URL('./layout.json', import.meta.url), 'utf8'));
const ALPHABET = [...'абвгдеёжзийклмноөпрстуүфхцчшщъыьэюя'];

test('alphabet has 35 letters', () => assert.equal(ALPHABET.length, 35));

const base = layout.letters.flat().map(k => k.k);
const long = layout.letters.flat().flatMap(k => k.long || []);

test('base keys are unique Mongolian letters', () => {
  assert.equal(new Set(base).size, base.length, 'duplicate base key');
  for (const k of base) assert.ok(ALPHABET.includes(k), `not a letter: ${k}`);
});

test('every one of the 35 letters is reachable by tap or long-press', () => {
  const reachable = new Set([...base, ...long]);
  const missing = ALPHABET.filter(c => !reachable.has(c));
  assert.deepEqual(missing, []);
});

test('keyboard stays small: 20-something base keys, at most 10 per row', () => {
  assert.ok(base.length >= 20 && base.length <= 29, `base keys: ${base.length}`);
  for (const row of layout.letters) assert.ok(row.length <= 10, `row has ${row.length} keys`);
});

test('every rare (long-press only) letter is in 1 or 2 popups, never more', () => {
  const rare = ALPHABET.filter(c => !base.includes(c));
  for (const c of rare) { const n = long.filter(x => x === c).length; assert.ok(n >= 1 && n <= 2, `${c} popup count ${n}`); }
});

test('symbols layer has digits 0-9', () => {
  const s = layout.symbols.flat();
  for (const d of '0123456789') assert.ok(s.includes(d));
});
