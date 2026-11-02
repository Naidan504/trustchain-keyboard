// TrustChain Keyboard: web demo / iPhone stopgap. Same behaviour as the Android keyboard,
// driven by layout.json. Nothing typed leaves the page: no network calls besides loading this page's own files.
'use strict';

const TEXT = {
  copied: 'Хуулагдлаа',
  empty: 'Эхлээд юм бичээрэй',
  tweetSuffix: '\n\n⌨ trustchain.mn/keyboard',
};

const $ = id => document.getElementById(id);
const out = $('out');
const kb = $('kb');
let L, shift = 'off', symbols = false, lastShiftTap = 0, lastSpaceAt = 0;

fetch('layout.json').then(r => r.json()).then(j => { L = j; render(); autoShift(); });

// ---------- text editing on the textarea (it never opens the phone's own keyboard: inputmode=none) ----------
function insert(s) {
  const a = out.selectionStart ?? out.value.length, b = out.selectionEnd ?? a;
  out.setRangeText(s, a, b, 'end');
  out.dispatchEvent(new Event('input'));
}
function backspace() {
  const a = out.selectionStart, b = out.selectionEnd;
  if (a !== b) return out.setRangeText('', a, b, 'end');
  if (a === 0) return;
  const before = out.value.slice(0, a);
  const n = [...before].pop().length; // whole code point (emoji)
  out.setRangeText('', a - n, a, 'end');
}
function autoShift() {
  if (shift === 'lock') return;
  const before = out.value.slice(0, out.selectionStart);
  const want = before.trim() === '' || /[.!?]\s+$/.test(before) || /\n$/.test(before);
  setShift(want ? 'once' : 'off');
}
const cased = s => (shift !== 'off' && !symbols) ? s.toUpperCase() : s;

function typeChar(s) {
  if (s === ' ') {
    const now = Date.now(), before = out.value.slice(0, out.selectionStart);
    if (now - lastSpaceAt < 600 && /[\p{L}\p{N}] $/u.test(before)) {
      out.setRangeText('', out.selectionStart - 1, out.selectionStart, 'end');
      insert('. '); lastSpaceAt = 0;
    } else { insert(' '); lastSpaceAt = now; }
  } else {
    insert(s); lastSpaceAt = 0;
    if (shift === 'once') setShift('off');
  }
  autoShift();
}

// ---------- rendering ----------
function setShift(v) { if (shift !== v) { shift = v; render(); } }

function keyEl(def) {
  const b = document.createElement('div');
  b.className = 'key';
  b.def = def;
  if (def.type === 'char') {
    b.textContent = cased(def.k);
    if (def.long?.length) { const h = document.createElement('small'); h.textContent = cased(def.long[0]); b.append(h); }
  } else {
    b.textContent = def.label;
    b.classList.add(def.type === 'space' ? 'space' : 'special');
    if (def.w) b.classList.add(def.w);
    if (def.type === 'enter' || (def.type === 'shift' && shift !== 'off')) b.classList.add('accent');
  }
  return b;
}

function rows() {
  const bottom = L.bottom.map(b => {
    if (b.type === 'symbols') return symbols ? { type: 'letters', label: 'АБВ', w: 'w15' } : { type: 'symbols', label: b.label, w: 'w15' };
    if (b.type === 'switch') return null; // no other keyboard to switch to on the web
    if (b.type === 'space') return { type: 'space', label: b.label };
    if (b.type === 'enter') return { type: 'enter', label: b.label, w: 'w15' };
    return { type: 'char', k: b.k, long: b.long };
  }).filter(Boolean);
  if (symbols) {
    const r = L.symbols.map(row => row.map(k => ({ type: 'char', k, long: L.symbolsLong?.[k] })));
    r[r.length - 1].push({ type: 'backspace', label: '⌫', w: 'w14' });
    return [...r, bottom];
  }
  const r = L.letters.map(row => row.map(k => ({ type: 'char', k: k.k, long: k.long })));
  r[r.length - 1].unshift({ type: 'shift', label: shift === 'lock' ? '⇪' : '⇧', w: 'w14' });
  r[r.length - 1].push({ type: 'backspace', label: '⌫', w: 'w14' });
  return [...r, bottom];
}

function render() {
  if (!L) return;
  kb.replaceChildren(...rows().map(row => {
    const d = document.createElement('div'); d.className = 'row';
    d.append(...row.map(keyEl)); return d;
  }));
}

// ---------- touch: one active pointer; long-press popup with slide-to-select ----------
let act = null; // { el, def, timer, rep, popup, sel, startX, cellW, fired }
let bubble = null;

function keyFrom(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.key');
  return el && kb.contains(el) ? el : null;
}

function showBubble(el, options, sel) {
  hideBubble();
  const kr = el.getBoundingClientRect(), br = kb.getBoundingClientRect();
  bubble = document.createElement('div');
  bubble.className = 'bubble';
  options.forEach((s, i) => { const c = document.createElement('div'); c.textContent = cased(s); if (i === sel) c.className = 'sel'; bubble.append(c); });
  kb.append(bubble);
  const w = bubble.offsetWidth, cell = w / options.length;
  // First option sits right above the key, so "hold and release" picks it with no slide.
  let left = kr.left - br.left + kr.width / 2 - cell / 2;
  left = Math.max(0, Math.min(left, br.width - w));
  bubble.style.left = left + 'px';
  bubble.style.top = (kr.top - br.top - bubble.offsetHeight - 4) + 'px';
  return cell;
}
function hideBubble() { bubble?.remove(); bubble = null; }

function press(el, e) {
  act = { el, def: el.def, startX: e.clientX, popup: null, sel: 0, fired: false };
  el.classList.add('down');
  navigator.vibrate?.(8);
  const d = el.def;
  if (d.type === 'char') {
    showBubble(el, [d.k], -1);
    if (d.long?.length) act.timer = setTimeout(longPress, L.longPressMs || 300);
  } else if (d.type === 'backspace') {
    backspace(); autoShift();
    act.rep = setTimeout(function r() { backspace(); autoShift(); act && (act.rep = setTimeout(r, 45)); }, 380);
  }
}
function longPress() {
  if (!act) return;
  act.fired = true;
  act.popup = act.def.long;
  act.cellW = showBubble(act.el, act.popup, 0);
  act.startX = act.lastX ?? act.startX;
  navigator.vibrate?.(15);
}
function release(commit) {
  if (!act) return;
  const a = act; act = null;
  clearTimeout(a.timer); clearTimeout(a.rep);
  a.el.classList.remove('down');
  hideBubble();
  if (!commit) return;
  const d = a.def;
  if (a.popup) return typeChar(cased(a.popup[a.sel]));
  switch (d.type) {
    case 'char': return typeChar(cased(d.k));
    case 'space': return typeChar(' ');
    case 'enter': insert('\n'); return autoShift();
    case 'shift': {
      const now = Date.now();
      setShift(shift === 'off' ? 'once' : shift === 'once' && now - lastShiftTap < 350 ? 'lock' : 'off');
      lastShiftTap = now; return;
    }
    case 'symbols': symbols = true; return render();
    case 'letters': symbols = false; render(); return autoShift();
  }
}

kb.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (act) release(true); // fast typing: earlier key first
  const el = keyFrom(e);
  if (!el) return;
  kb.setPointerCapture?.(e.pointerId);
  act = null;
  press(el, e);
  act.id = e.pointerId;
});
kb.addEventListener('pointermove', e => {
  if (!act || e.pointerId !== act.id) return;
  act.lastX = e.clientX;
  if (act.popup) {
    const sel = Math.max(0, Math.min(act.popup.length - 1, Math.round((e.clientX - act.startX) / act.cellW)));
    if (sel !== act.sel) { act.sel = sel; [...bubble.children].forEach((c, i) => c.className = i === sel ? 'sel' : ''); }
    return;
  }
  if (act.def.type !== 'char') return;
  const el = keyFrom(e); // slide to a neighbour before the long-press fires: key under the finger counts
  if (el && el !== act.el && el.def.type === 'char') {
    clearTimeout(act.timer);
    act.el.classList.remove('down');
    const id = act.id; act = null;
    press(el, e); act.id = id;
  }
});
kb.addEventListener('pointerup', e => { if (act && e.pointerId === act.id) release(true); });
kb.addEventListener('pointercancel', () => release(false));
kb.addEventListener('contextmenu', e => e.preventDefault());

// ---------- buttons ----------
function toast(s) { const t = $('toast'); t.textContent = s; t.classList.add('show'); clearTimeout(t.h); t.h = setTimeout(() => t.classList.remove('show'), 1400); }
$('copy').onclick = async () => {
  if (!out.value) return toast(TEXT.empty);
  try { await navigator.clipboard.writeText(out.value); } catch { out.select(); document.execCommand('copy'); }
  toast(TEXT.copied);
};
$('tweet').onclick = () => {
  if (!out.value) return toast(TEXT.empty);
  window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(out.value + TEXT.tweetSuffix), '_blank', 'noopener');
};
$('clear').onclick = () => { out.value = ''; autoShift(); };
out.addEventListener('click', autoShift);
out.addEventListener('keyup', autoShift);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
