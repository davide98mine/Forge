/* Forge Web — dati, navigazione e componenti dell'interfaccia. */
'use strict';

// ------------------------------------------------------------ dati (memoria del telefono)
const KEY = 'forge.data', BAK = 'forge.bak';
let D;
function loadData() {
  for (const k of [KEY, BAK]) {
    try {
      const s = localStorage.getItem(k);
      if (s) { D = F.dataFrom(JSON.parse(s)); break; }
    } catch (e) { /* prova la copia */ }
  }
  if (!D) D = F.Data();
  if (!D.exercises.length) D.exercises = F.defaultExercises();
  else F.defaultExercises().forEach(e => { if (!F.exercise(D, e.name)) D.exercises.push(e); });
}
function save() {
  try {
    const s = JSON.stringify(F.dataToJson(D));
    const old = localStorage.getItem(KEY);
    if (old) localStorage.setItem(BAK, old);
    localStorage.setItem(KEY, s);
  } catch (e) { toast('Memoria piena: fai un backup e libera spazio'); }
}

// ------------------------------------------------------------ costruttore di elementi
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  kids.forEach(c => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) add(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return el;
}
const txt = (cls, s) => h('div', { class: cls }, s);

// ------------------------------------------------------------ icone (tratto, griglia 24)
const ICONS = {
  dumbbell: '<path d="M6 7v10M3 10v4M18 7v10M21 10v4M6 12h12"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/>',
  chart: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2zM4 20a2 2 0 0 0 2 1h13v-3"/><path d="M9 8h6M9 11h4"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', close: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  trash: '<path d="M4 7h16M6 7l1 13h10l1-13M10 4h4M10 11v5M14 11v5"/>',
  import: '<path d="M12 3v12M8 11l4 4 4-4M4 20h16"/>', export: '<path d="M12 15V3M8 7l4-4 4 4M4 20h16"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 2h4"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM12 14v4M8 20h8M7 6H4c0 4 2 5 3 5M17 6h3c0 4-2 5-3 5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  play: '<path d="M7 4l12 8-12 8z" fill="currentColor"/>',
  note: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h4"/>',
  plates: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  fire: '<path d="M12 3c5 5 7 8 7 11a7 7 0 0 1-14 0c0-3 3-5 4-8 1 3 2 4 3 4 0-3 0-5 0-7z"/>',
  up: '<path d="M7 17L17 7M9 7h8v8"/>', down: '<path d="M7 7l10 10M17 9v8H9"/>',
  arrowup: '<path d="M6 14l6-6 6 6"/>', arrowdown: '<path d="M6 10l6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
  ai: '<path d="M12 3l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-1.8z"/>',
  backup: '<path d="M7 18a4 4 0 0 1-1-7.9A6 6 0 0 1 17.7 9 4.5 4.5 0 0 1 17 18"/><path d="M12 11v8M9 14l3-3 3 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r="1" fill="currentColor"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>'
};
function icon(name) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '<circle cx="12" cy="12" r="8"/>';
  return s;
}

// ------------------------------------------------------------ componenti
const btn = (label, kind, onclick, ic) => h('button', { class: 'btn ' + (kind || 'primary'), onclick }, ic ? icon(ic) : null, label);
const ibtn = (ic, label, onclick, kind) => h('button', { class: 'ibtn ' + (kind || ''), 'aria-label': label, title: label, onclick }, icon(ic));
const chip = (label, on, onclick) => h('button', { class: 'chip' + (on ? ' on' : ''), onclick }, label);
const tag = (label, kind) => h('span', { class: 'tag' + (kind ? ' ' + kind : '') }, label);
const card = (...kids) => h('div', { class: 'card' }, ...kids);
const progress = f => h('div', { class: 'progress' }, h('div', { style: 'width:' + Math.round(Math.max(0, Math.min(1, f)) * 100) + '%' }));
const hscroll = (...kids) => h('div', { class: 'hscroll' }, ...kids);
function field(label, input) { return h('label', { class: 'field' }, txt('over', label), input); }
function input(value, ph, numeric) {
  return h('input', { class: 'input', value: value == null ? '' : value, placeholder: ph || '', inputmode: numeric ? 'decimal' : null, enterkeyhint: 'done' });
}
function area(value, ph, rows) { const a = h('textarea', { class: 'area', placeholder: ph || '', rows: rows || 6 }); a.value = value || ''; return a; }
function item(ic, title, sub, onclick, extra) {
  return h('div', { class: 'item' + (onclick ? ' tap' : ''), onclick, role: onclick ? 'button' : null },
    ic ? h('div', { class: 'ic' }, icon(ic)) : null,
    h('div', { class: 'grow col', style: 'gap:2px' }, txt('bold', title), sub ? txt('small', sub) : null),
    extra || null,
    onclick ? h('span', { class: 'chev' }, icon('next')) : null);
}
function emptyCard(ic, title, text, ...kids) {
  return h('div', { class: 'card empty' }, h('div', { class: 'eic' }, icon(ic)), txt('h2 center', title), txt('small center', text), ...kids);
}

let toastT;
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.appendChild(t);
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), 2600);
}

// ------------------------------------------------------------ finestre
function modal(title, content, actions) {
  const bg = h('div', { class: 'modal-bg' });
  const close = () => bg.remove();
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-label': title }, title ? txt('mt', title) : null, content);
  if (actions) m.appendChild(h('div', { class: 'acts' }, actions.map(a => btn(a.label, a.kind || 'primary', () => { if (a.keep !== true) close(); if (a.on) a.on(); }))));
  bg.appendChild(m);
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.body.appendChild(bg);
  return close;
}
function sheet(title, content, okLabel, onOk) {
  return modal(title, content, okLabel ? [{ label: 'Annulla', kind: 'secondary' }, { label: okLabel, on: onOk }] : [{ label: 'Chiudi', kind: 'secondary' }]);
}
function confirmBox(title, msg, okLabel, onOk) {
  sheet(title, txt('small', msg), okLabel, onOk);
}
function choose(title, items, cb) {
  let close;
  const list = h('div', { class: 'col' }, items.map((it, i) => h('button', { class: 'opt', onclick: () => { close(); cb(i); } }, it)));
  close = modal(title, list, [{ label: 'Annulla', kind: 'secondary' }]);
}
function promptBox(title, ph, value, cb, multiline) {
  const i = multiline ? area(value, ph, 5) : input(value, ph);
  sheet(title, i, 'OK', () => cb(i.value.trim()));
  setTimeout(() => i.focus(), 50);
}

// ------------------------------------------------------------ appunti, file, condivisione
async function copyText(label, text) {
  try { await navigator.clipboard.writeText(text); toast('Copiato negli appunti'); }
  catch (e) {
    const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copiato negli appunti'); } catch (e2) { toast('Copia non riuscita'); }
    ta.remove();
  }
}
async function shareText(title, text) {
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  copyText(title, text);
}
async function saveFile(name, mime, text) {
  const blob = new Blob([text], { type: mime });
  try {
    const file = new File([blob], name, { type: mime });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('File salvato');
}
function openFile(cb) {
  const i = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', style: 'display:none' });
  i.addEventListener('change', () => {
    const f = i.files && i.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => cb(String(r.result));
    r.onerror = () => toast("Non riesco ad aprire il file");
    r.readAsText(f);
    i.remove();
  });
  document.body.appendChild(i); i.click();
}
async function pasteText() {
  try { return await navigator.clipboard.readText(); } catch (e) { return null; }
}

// ------------------------------------------------------------ timer di recupero
const Timer = {
  get() { try { return JSON.parse(localStorage.getItem('forge.timer')) || { end: 0, total: 0, label: '' }; } catch (e) { return { end: 0, total: 0, label: '' }; } },
  set(t) { localStorage.setItem('forge.timer', JSON.stringify(t)); },
  start(sec, label) { if (sec > 0) { this.set({ end: Date.now() + sec * 1000, total: sec, label: label || '' }); unlockAudio(); } },
  add(delta) { const t = this.get(); if (t.end <= Date.now()) return; t.end += delta * 1000; t.total = Math.max(1, t.total + delta); if (t.end <= Date.now() + 1000) t.end = 0; this.set(t); },
  stop() { const t = this.get(); t.end = 0; this.set(t); },
  running() { return this.get().end > Date.now(); },
  remaining() { const ms = this.get().end - Date.now(); return ms <= 0 ? 0 : Math.ceil(ms / 1000); }
};
let audioCtx = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { audioCtx = null; }
}
function beep() {
  if (!D.settings.sound) return;
  try {
    unlockAudio();
    if (!audioCtx) return;
    [0, 0.35, 0.7].forEach((t, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = i === 2 ? 1046 : 880;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, audioCtx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.25);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.3);
    });
  } catch (e) { /* niente audio */ }
  if (D.settings.vibrate && navigator.vibrate) navigator.vibrate([350, 180, 350, 180, 600]);
}
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
document.addEventListener('click', unlockAudio, { once: true });

// schermo acceso durante l'allenamento
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

// ------------------------------------------------------------ navigazione: 5 sezioni con la loro pila di pagine
const TABS = [['Oggi', 'dumbbell'], ['Scheda', 'list'], ['Progressi', 'chart'], ['Esercizi', 'book'], ['Altro', 'more']];
const App = {
  tab: 0, stacks: [[], [], [], [], []], scroll: new WeakMap(),
  cur() { const s = this.stacks[this.tab]; return s[s.length - 1]; },
  remember() { const c = this.cur(); if (c) c._scroll = window.scrollY; },
  show(screen) { this.remember(); this.stacks[this.tab].push(screen); this.render(true); },
  replace(screen) { this.stacks[this.tab].pop(); this.stacks[this.tab].push(screen); this.render(true); },
  back() {
    const c = this.cur();
    if (c && c.onBack && c.onBack()) return;
    if (this.stacks[this.tab].length > 1) { this.stacks[this.tab].pop(); this.render(); }
    else if (this.tab !== 0) this.switchTab(0);
  },
  home(i) { this.stacks[i].length = 1; this.tab = i; this.render(true); },
  closeAndHome(i) { if (this.stacks[this.tab].length > 1) this.stacks[this.tab].pop(); this.home(i); },
  switchTab(i) {
    this.remember();
    if (i === this.tab && this.stacks[i].length > 1) { this.stacks[i].length = 1; this.stacks[i][0]._scroll = 0; }
    this.tab = i; this.render();
  },
  refresh() { this.remember(); this.render(); },
  render(top) {
    const c = this.cur();
    const root = document.getElementById('app');
    root.innerHTML = '';
    let view;
    try { view = c.render(); }
    catch (e) { console.error(e); view = h('div', { class: 'page' }, txt('h2', 'Qualcosa non ha funzionato'), txt('small', String(e)), btn('Torna indietro', 'primary', () => this.back())); }
    root.appendChild(view);
    this.nav();
    window.scrollTo(0, top ? 0 : (c._scroll || 0));
    document.documentElement.dataset.theme = D.settings.theme;
    keepAwake(c instanceof WorkoutScreen && D.settings.keepOn);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0E0F0C');
  },
  nav() {
    let n = document.getElementById('nav');
    if (!n) { n = h('nav', { id: 'nav', class: 'nav' }); document.body.appendChild(n); }
    n.innerHTML = '';
    n.appendChild(h('div', { class: 'nav-in' }, TABS.map((t, i) => h('button', { class: i === this.tab ? 'on' : '', 'aria-label': t[0], onclick: () => this.switchTab(i) }, icon(t[1]), h('span', null, t[0])))));
  }
};

/** Struttura comune delle pagine: intestazione con titolo, sopratitolo e azioni. */
function page(screen, title, over, actions) {
  const body = h('div', { class: 'page' });
  const head = h('div', { class: 'head' });
  if (!screen.root) head.appendChild(ibtn('back', 'Indietro', () => App.back()));
  head.appendChild(h('div', { class: 'titles' }, over ? txt('over', over) : null, title ? h('h1', { class: 'h1' }, title) : null));
  const acts = (actions || []).filter(Boolean);
  acts.forEach(a => head.appendChild(a));
  if (title && title.length > 14 && acts.length + (screen.root ? 0 : 1) >= 2) head.classList.add('acts2');
  body.appendChild(head);
  return body;
}

window.addEventListener('popstate', () => { App.back(); history.pushState(null, ''); });

/* Tieni premuto un elemento di "box" e trascinalo sopra o sotto gli altri. Il tocco breve resta un click. */
function makeReorder(box, onMove) {
  const items = () => Array.from(box.children);
  items().forEach(item => {
    item.classList.add('reorder');
    let timer = null, drag = false, moved = false, sx = 0, sy = 0, lastY = 0, startScroll = 0, from = -1, to = -1, raf = 0;
    const scroller = document.scrollingElement || document.documentElement;
    const follow = () => {
      const dy = lastY - sy + (scroller.scrollTop - startScroll);
      item.style.transform = 'translateY(' + dy + 'px) scale(1.03)';
      const list = items(), r0 = item.offsetTop + dy + item.offsetHeight / 2;
      to = from;
      for (let i = 0; i < from; i++) { const c = list[i]; if (r0 < c.offsetTop + c.offsetHeight / 2) { to = i; break; } }
      if (to === from) for (let i = list.length - 1; i > from; i--) { const c = list[i]; if (r0 > c.offsetTop + c.offsetHeight / 2) { to = i; break; } }
      const gap = list.length > 1 ? Math.max(0, (list[1].offsetTop - list[0].offsetTop - list[0].offsetHeight)) : 0, shift = item.offsetHeight + gap;
      list.forEach((c, i) => {
        if (i === from) return;
        let ty = 0;
        if (from < to && i > from && i <= to) ty = -shift; else if (from > to && i >= to && i < from) ty = shift;
        c.style.transform = ty ? 'translateY(' + ty + 'px)' : '';
      });
    };
    const loop = () => {
      if (!drag) return;
      const edge = 80, H = window.innerHeight;
      if (lastY < edge) { scroller.scrollTop -= 12; follow(); } else if (lastY > H - edge - 70) { scroller.scrollTop += 12; follow(); }
      raf = requestAnimationFrame(loop);
    };
    const end = (cancel) => {
      clearTimeout(timer); timer = null;
      if (!drag) return;
      drag = false; cancelAnimationFrame(raf);
      document.body.classList.remove('dragging');
      items().forEach(c => { c.style.transform = ''; c.classList.remove('drag'); });
      if (!cancel && from >= 0 && to >= 0 && from !== to) onMove(from, to);
    };
    item.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.target.closest('button,input,textarea')) return;
      sx = e.clientX; sy = e.clientY; lastY = sy; moved = false;
      timer = setTimeout(() => {
        timer = null; drag = true; moved = true; from = items().indexOf(item); to = from; startScroll = scroller.scrollTop;
        item.classList.add('drag'); document.body.classList.add('dragging');
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) {}
        follow(); raf = requestAnimationFrame(loop);
      }, 450);
    });
    item.addEventListener('pointermove', e => {
      lastY = e.clientY;
      if (drag) { follow(); return; }
      if (timer && (Math.abs(e.clientY - sy) > 8 || Math.abs(e.clientX - sx) > 8)) { clearTimeout(timer); timer = null; }
    });
    item.addEventListener('pointerup', () => end(false));
    item.addEventListener('pointercancel', () => end(false));
    // mentre si trascina la pagina non deve scorrere col dito (iPhone)
    item.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
    item.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    item.addEventListener('contextmenu', e => e.preventDefault());
  });
}
