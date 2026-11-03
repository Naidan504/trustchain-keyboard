#!/usr/bin/env python3
"""Compare a typed typing-test result with the intended text, per section.
usage: analyze-typing.py test.json result.md layout.json > report.md"""
import json, re, sys, difflib, collections, math

test = {s['id']: s['text'] for s in json.load(open(sys.argv[1]))['sections']}
raw = open(sys.argv[2], encoding='utf-8').read()
L = json.load(open(sys.argv[3]))

# Section IDs may be typed in Cyrillic (Т1а) and glued to the text (Т4аДүрэвээ).
LAT = str.maketrans('ТтАаВвСсЕеОоРрх', 'TtAaBbCcEeOoPpx')
parts, cur = {}, None
for line in raw.splitlines():
    m = re.match(r'^\s*([TТ][1-5][a-cаbвсc]?)\s*(.*)$', line)
    if m:
        cur = m.group(1).translate(LAT).replace('B', 'b')
        cur = cur[0] + cur[1] + (cur[2:].lower() if len(cur) > 2 else '')
        parts[cur] = m.group(2).strip()
    elif cur and line.strip():
        parts[cur] = (parts[cur] + ' ' + line.strip()).strip()

# Key centres in units of one row-2 key width (row 2 = 10 keys, full width).
pos = {}
rows = L['letters']
for r, row in enumerate(rows):
    if r < 2:
        off = (10 - len(row)) / 2
        for i, k in enumerate(row): pos[k['k']] = (off + i + 0.5, r)
    else:
        unit = 10 / (1.4 + len(row) + 1.4)
        for i, k in enumerate(row): pos[k['k']] = ((1.4 + i + 0.5) * unit, r)
parent = {}
for row in rows:
    for k in row:
        for x in k.get('long', []): parent.setdefault(x, k['k'])
hidden = set(parent) - {k['k'] for row in rows for k in row}

def dist(a, b):
    if a not in pos or b not in pos: return None
    (x1, y1), (x2, y2) = pos[a], pos[b]
    return math.hypot(x1 - x2, (y1 - y2) * 1.1)

cat = collections.Counter(); pairs = collections.Counter(); hid = collections.Counter(); hid_ok = collections.Counter()
tot_chars = tot_err = 0
out = ['| part | chars | errors (edit ops) | CER |', '|---|---|---|---|']
for sid, ref in test.items():
    if sid not in parts:
        out.append(f'| {sid} | {len(ref)} | skipped | – |'); continue
    hyp = parts[sid]
    a, b = ref.lower(), hyp.lower()
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    err = 0
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            for ch in a[i1:i2]:
                if ch in hidden: hid_ok[ch] += 1
            continue
        err += max(i2 - i1, j2 - j1)
        if op == 'replace' and i2 - i1 == j2 - j1:
            for x, y in zip(a[i1:i2], b[j1:j2]):
                pairs[(x, y)] += 1
                if x in hidden:
                    hid[x] += 1; cat['hidden letter wrong' + (' (typed its parent)' if parent.get(x) == y else '')] += 1
                elif {x, y} in ({'у', 'ү'}, {'о', 'ө'}): cat['у/ү or о/ө swapped'] += 1
                elif x == ' ' or y == ' ': cat['space vs letter'] += 1
                else:
                    d = dist(x, y)
                    cat['neighbour key (≤1.5 keys away)' if d is not None and d <= 1.5 else 'far key' if d is not None else 'punctuation/other'] += 1
        elif op == 'delete': cat['missing chars'] += i2 - i1; [hid.update([c]) for c in a[i1:i2] if c in hidden]
        elif op == 'insert': cat['extra chars'] += j2 - j1
        else: cat['other replace (length changed)'] += max(i2 - i1, j2 - j1)
    tot_chars += len(a); tot_err += err
    out.append(f'| {sid} | {len(a)} | {err} | {err / len(a):.0%} |')
out.append(f'| **all typed** | {tot_chars} | {tot_err} | **{tot_err / max(1, tot_chars):.0%}** |')
print('# Typing test analysis\n\n## Character error rate per part\n'); print('\n'.join(out))
print('\n## Error categories (letter-level)\n'); [print(f'- {k}: {v}') for k, v in cat.most_common()]
print('\n## Hidden (long-press) letters: wrong / right\n'); [print(f'- {h} (under {parent[h]}): wrong {hid[h]}, right {hid_ok[h]}') for h in sorted(hidden)]
print('\n## Top 30 substitutions (intended → typed, count, distance in keys)\n')
for (x, y), n in pairs.most_common(30):
    d = dist(x, y); print(f'- {x} → {y}: {n}' + (f' (distance {d:.1f})' if d is not None else ''))
