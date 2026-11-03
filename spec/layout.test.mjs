// node --test spec/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = JSON.parse(fs.readFileSync(new URL('./layout.json', import.meta.url), 'utf8'));
const ALPHABET = [...'абвгдеёжзийклмноөпрстуүфхцчшщъыьэюя'];

test('alphabet has 35 letters', () => assert.equal(ALPHABET.length, 35));

for (const [name, rows] of Object.entries({ compact: layout.letters, standard: layout.lettersStandard })) {
  const base = rows.flat().map(k => k.k);
  const long = rows.flat().flatMap(k => k.long || []);

  test(`${name}: base keys are unique Mongolian letters`, () => {
    assert.equal(new Set(base).size, base.length, 'duplicate base key');
    for (const k of base) assert.ok(ALPHABET.includes(k), `not a letter: ${k}`);
  });

  test(`${name}: all 35 letters are reachable`, () => {
    const reachable = new Set([...base, ...long]);
    assert.deepEqual(ALPHABET.filter(c => !reachable.has(c)), []);
  });

  test(`${name}: rows have at most 12 keys`, () => {
    for (const row of rows) assert.ok(row.length <= 12, `row has ${row.length} keys`);
  });

  test(`${name}: every hidden letter is in 1 or 2 popups`, () => {
    const hidden = ALPHABET.filter(c => !base.includes(c));
    for (const c of hidden) {
      const n = long.filter(x => x === c).length;
      assert.ok(n >= 1 && n <= 2, `${c} popup count ${n}`);
    }
  });
}

test('compact has 25–30 base keys', () => {
  const n = layout.letters.flat().length;
  assert.ok(n >= 25 && n <= 30, `base keys: ${n}`);
});

test('symbols layer has digits 0-9', () => {
  const s = layout.symbols.flat();
  for (const d of '0123456789') assert.ok(s.includes(d));
});
