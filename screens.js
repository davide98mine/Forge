/* Forge Web — le pagine dell'app (stesse della versione Android). */
'use strict';

const THEMES = {
  A: { name: 'Ferro Nero', desc: 'Scuro e sportivo, verde acceso. Leggibile sotto le luci della palestra.', bg: '#0E0F0C', surface: '#1A1C17', surface2: '#262920', line: '#2A2D25', text: '#F2F4EC', muted: '#9BA191', faint: '#5A5F50', accent: '#C8F135', onAccent: '#0E0F0C', primary: '#C8F135', onPrimary: '#0E0F0C', navBg: '#141611', r: 18 },
  B: { name: 'Carta', desc: 'Chiaro ed essenziale, nero con accento arancio. Numeri grandi, pochi riquadri.', bg: '#FBFAF7', surface: '#F1EEE7', surface2: '#E9E5DC', line: '#E3DFD6', text: '#111111', muted: '#6B675E', faint: '#B4AFA4', accent: '#FF4F1F', onAccent: '#111111', primary: '#111111', onPrimary: '#FFFFFF', navBg: '#FBFAF7', r: 22 },
  C: { name: 'Acciaio', desc: 'Blu scuro e tecnico, numeri a larghezza fissa e tanti dati.', bg: '#0B1220', surface: '#121B2E', surface2: '#1A2540', line: '#1F2A44', text: '#E6ECF7', muted: '#8A97B2', faint: '#5D6A87', accent: '#4C8DFF', onAccent: '#05080F', primary: '#4C8DFF', onPrimary: '#05080F', navBg: '#0E1626', r: 12 },
  D: { name: 'Gesso', desc: 'Chiaro e morbido, angoli arrotondati e colori pastello.', bg: '#F3F1EC', surface: '#FFFFFF', surface2: '#EEF0FF', line: '#E6E1D7', text: '#1C1B22', muted: '#66626F', faint: '#A9A5B5', accent: '#4338CA', onAccent: '#FFFFFF', primary: '#4338CA', onPrimary: '#FFFFFF', navBg: '#1C1B22', r: 24 }
};
const ap = (el, ...k) => add(el, k);
const dateLong = () => new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const hhmm = ts => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

function beginWorkout(p, w, day) {
  const cur = F.session(D, D.liveSession);
  if (cur && !cur.done && cur.program === p.id && cur.week === w && cur.day === day) return cur;
  if (cur && !cur.done) {
    if (!F.logsOf(D, cur.id).length) D.sessions.splice(D.sessions.indexOf(cur), 1);
    else { cur.done = true; cur.end = Date.now(); }
  }
  const s = F.Session();
  s.program = p.id; s.week = w; s.day = day;
  const dd = F.day(p, w, day);
  s.dayName = dd ? dd.name : '';
  D.sessions.push(s);
  D.liveSession = s.id;
  return s;
}

// ============================================================ OGGI
class TodayScreen {
  constructor() { this.root = true; }
  render() {
    const p = F.active(D);
    const n = p ? F.next(D, p) : null;
    let title = 'Oggi', over = dateLong();
    if (n) { title = 'Giorno ' + (n[1] + 1) + ' · ' + p.weeks[n[0]].days[n[1]].name; over += ' · Settimana ' + (n[0] + 1) + ' di ' + p.weeks.length; }
    const b = page(this, title, over);
    if (!p) {
      b.appendChild(emptyCard('ai', 'Nessuna scheda', "Chiedi a Claude di prepararti una scheda e importala qui, oppure creala tu a mano.",
        btn('Copia le istruzioni per Claude', 'primary', () => copyText('Istruzioni', F.aiGuide(D))),
        btn('Importa una scheda', 'outline', () => { App.switchTab(1); App.show(new ImportScreen('')); }),
        btn('Crea una scheda a mano', 'secondary', () => { App.switchTab(1); App.show(new NewProgramScreen()); })));
      b.appendChild(howItWorks());
      return b;
    }
    let live = F.session(D, D.liveSession);
    if (live && live.done) live = null;
    if (live && live.program === p.id) {
      const day = F.day(p, live.week, live.day);
      const empty = !F.logsOf(D, live.id).length;
      const c = h('div', { class: 'card accentcard' },
        txt('over', 'Allenamento in corso'),
        h('div', { class: 'h2', style: 'font-size:24px' }, day ? day.name : live.dayName),
        txt('', 'Settimana ' + (live.week + 1) + ' · iniziato alle ' + hhmm(live.start)),
        h('div', { class: 'row' },
          h('button', { class: 'btn', style: 'background:var(--onAccent);color:var(--accent)', onclick: () => App.show(new WorkoutScreen(live.id)) }, 'Riprendi'),
          h('button', { class: 'btn', style: 'width:auto;background:rgba(0,0,0,.12);color:var(--onAccent)', onclick: () => {
            const discard = () => { D.logs = D.logs.filter(l => l.session !== live.id); D.sessions.splice(D.sessions.indexOf(live), 1); D.liveSession = ''; Timer.stop(); save(); App.refresh(); };
            if (empty) discard(); else confirmBox("Scartare l'allenamento?", "Le serie gia' registrate in questo allenamento verranno cancellate.", 'Scarta', discard);
          } }, empty ? 'Annulla' : 'Scarta')),
        empty ? txt('tiny', 'Nessuna serie fatta: puoi annullarlo senza conseguenze.') : null);
      c.querySelector('.tiny') && (c.querySelector('.tiny').style.color = 'var(--onAccent)');
      b.appendChild(c);
    }
    if (!n) {
      b.appendChild(emptyCard('trophy', 'Scheda completata!', 'Hai finito "' + p.name + '". Esporta il resoconto e chiedi a Claude la prossima scheda calibrata sui tuoi dati.',
        btn('Esporta il resoconto per Claude', 'primary', () => shareText('Resoconto Forge', F.report(D, p))),
        btn('Importa la nuova scheda', 'outline', () => { App.switchTab(1); App.show(new ImportScreen('')); })));
      return b;
    }
    const wk = p.weeks[n[0]], day = wk.days[n[1]];
    const rep = F.weekToRepeat(D, p, n);
    if (rep >= 0 && !live) {
      b.appendChild(h('div', { class: 'card', style: 'background:var(--warnBg);border:0' },
        h('div', { class: 'bold', style: 'color:var(--warn);font-size:16px' }, 'Settimana ' + (rep + 1) + " fatta a meta'"),
        txt('small', 'Hai fatto ' + F.doneInWeek(D, p, rep) + ' allenamenti su ' + p.weeks[rep].days.length + '. Per non saltare la progressione puoi ripeterla prima di passare alla settimana ' + (rep + 2) + '.'),
        btn('Ripeti settimana ' + (rep + 1), 'warn', () => confirmBox('Ripetere la settimana ' + (rep + 1) + '?', "Gli allenamenti gia' fatti restano nello storico, ma la scheda ripartira' dal giorno 1 della settimana " + (rep + 1) + '.', 'Ripeti', () => { F.repeatWeek(D, p, rep); save(); App.refresh(); }))));
    }
    b.appendChild(h('div', { class: 'row' }, progress(0), txt('tiny bold', '0 / ' + day.exs.length + ' esercizi')));
    const c = card(h('div', { class: 'row' }, h('div', { class: 'h2 grow' }, 'Cosa ti aspetta'), wk.deload ? tag('Scarico', 'warn') : null,
      ibtn('book', "Anteprima completa dell'allenamento", () => App.show(new DayScreen(p.id, n[0], n[1])), 'alt')));
    if (wk.note) c.appendChild(txt('small', wk.note));
    day.exs.forEach((e, i) => {
      const g = e.groups[0];
      const sg = g && !(g.kg > 0) ? F.suggest(D, e.name, g, null) : null;
      c.appendChild(h('div', { class: 'row', style: 'padding:4px 0' },
        h('div', { class: 'bignum', style: 'font-size:20px' }, e.superset || String(i + 1)),
        h('div', { class: 'grow' }, txt('bold', e.name), txt('tiny', F.target(e))),
        sg && sg.kg > 0 ? h('div', { class: 'num accent', style: 'font-size:16px' }, F.kg(sg.kg) + ' kg') : null));
    });
    if (!day.exs.length) c.appendChild(txt('small', 'Questo giorno non ha esercizi: aggiungili dalla sezione Scheda.'));
    if (!live) c.appendChild(btn('Inizia allenamento', 'primary', () => { const s = beginWorkout(p, n[0], n[1]); save(); App.show(new WorkoutScreen(s.id)); }));
    c.appendChild(h('button', { class: 'btn ghost', onclick: () => App.show(new DayScreen(p.id, n[0], n[1])) }, 'Anteprima completa: riscaldamento, note ed esercizi'));
    c.appendChild(h('button', { class: 'btn ghost accent', style: 'color:var(--accentText)', onclick: () => App.switchTab(1) }, 'Scegli un altro giorno'));
    b.appendChild(c);
    const doneW = F.doneInWeek(D, p, n[0]);
    const wc = card(h('div', { class: 'row' }, h('div', { class: 'h2 grow' }, 'Questa settimana'), txt('small', doneW + ' / ' + wk.days.length)), progress(doneW / Math.max(1, wk.days.length)));
    wk.days.forEach((dd, i) => {
      const dn = F.isDone(D, p, n[0], i);
      wc.appendChild(h('div', { class: 'row tap', style: 'min-height:44px', onclick: () => { App.switchTab(1); App.show(new DayScreen(p.id, n[0], i)); } },
        h('div', { class: 'bignum', style: 'font-size:18px;' + (i === n[1] ? 'color:var(--accentText)' : '') }, String(i + 1)),
        h('div', { class: 'grow' }, dd.name), dn ? h('span', { class: 'accent', style: 'width:20px;height:20px' }, icon('check')) : i === n[1] ? tag('prossimo', 'acc') : null));
    });
    b.appendChild(wc);
    b.appendChild(h('div', { class: 'grid2' }, statCard('Settimane di fila', String(F.streakWeeks(D)), 'fire'), statCard('Volume settimana', F.big(F.weekVolume(D, Date.now())) + ' kg', 'chart')));
    return b;
  }
}
function statCard(label, value, ic) {
  return h('div', { class: 'card', style: 'padding:12px 14px;gap:4px' }, h('div', { class: 'row', style: 'gap:6px' }, ic ? h('span', { class: 'accent', style: 'width:16px;height:16px;display:flex' }, icon(ic)) : null, txt('over', label)), h('div', { class: 'num', style: 'font-size:24px' }, value));
}
function howItWorks() {
  const steps = ['Copia le istruzioni e incollale nella chat con Claude, scrivendo cosa vuoi (obiettivo, giorni, settimane).', 'Claude ti risponde con la scheda completa: settimane, giorni, esercizi e progressioni.', 'Copia la risposta, apri Importa e tocca Incolla: vedi l\'anteprima e la carichi.', 'A fine scheda esporta il resoconto e chiedi la scheda successiva.'];
  return card(txt('h2', 'Come funziona con Claude'), steps.map((s, i) => h('div', { class: 'row top' }, h('div', { class: 'num accent', style: 'font-size:18px;min-width:16px' }, String(i + 1)), txt('small grow', s))));
}

// ============================================================ ALLENAMENTO
const drafts = {}, extras = {};
class WorkoutScreen {
  constructor(sid) { this.sid = sid; this.focus = -1; this.warmOpen = false; }
  session() { return F.session(D, this.sid); }
  onBack() {
    const s = this.session();
    if (s && !s.done && !F.logsOf(D, this.sid).length && !s.warmDone) {
      D.sessions.splice(D.sessions.indexOf(s), 1);
      if (D.liveSession === this.sid) D.liveSession = '';
      Timer.stop(); this.clearDrafts(); save();
      toast('Allenamento non iniziato: nessuna serie registrata');
    }
    return false;
  }
  clearDrafts() { Object.keys(drafts).forEach(k => { if (k.startsWith(this.sid)) delete drafts[k]; }); Object.keys(extras).forEach(k => { if (k.startsWith(this.sid)) delete extras[k]; }); }
  key(i, k) { return this.sid + ':' + i + ':' + k; }
  rowsFor(e, i, logs) {
    let maxIdx = -1;
    logs.forEach(l => { if (!l.warmup && l.exIdx === i) maxIdx = Math.max(maxIdx, l.setIdx); });
    return Math.max(F.totalSets(e) + (extras[this.sid + ':' + i] || 0), maxIdx + 1);
  }
  doneSets(logs, i) { return logs.filter(l => !l.warmup && l.exIdx === i).length; }
  logFor(logs, i, k, warm) { return logs.find(l => l.exIdx === i && l.setIdx === k && l.warmup === warm) || null; }
  openSet(e, i, logs) { const n = this.rowsFor(e, i, logs); for (let k = 0; k < n; k++) if (!this.logFor(logs, i, k, false)) return k; return -1; }
  firstOpen(day, logs) { for (let i = 0; i < day.exs.length; i++) { const k = this.openSet(day.exs[i], i, logs); if (k >= 0) return [i, k]; } return [-1, -1]; }
  isTimed(e, g) { const def = F.exercise(D, e.name); return (g.sec > 0 && !g.reps) || (def && def.timed && F.repsLow(g.reps) === 0); }
  draftKg(e, i, k) { const v = drafts[this.key(i, k) + ':kg']; if (v != null) return F.parse(v, 0); const g = F.groupOf(e, k); if (g.kg > 0) return g.kg; return F.suggest(D, e.name, g, this.sid).kg; }
  draftReps(e, i, k) { const v = drafts[this.key(i, k) + ':r']; if (v != null) return Math.round(F.parse(v, 0)); const g = F.groupOf(e, k); if (this.isTimed(e, g)) return g.sec > 0 ? g.sec : 30; return F.repsLow(g.reps); }
  draftRpe(i, k) { const v = drafts[this.key(i, k) + ':rpe']; return v == null ? 0 : F.parse(v, 0); }
  label(e, i, k) {
    const g = F.groupOf(e, k), kg = this.draftKg(e, i, k), r = this.draftReps(e, i, k);
    if (this.isTimed(e, g)) return r + ' s' + (kg > 0 ? ' · ' + F.kg(kg) + ' kg' : '');
    return (kg > 0 ? F.kg(kg) + ' kg' : '— kg') + ' × ' + (r > 0 ? r : (F.isMaxReps(g.reps) ? 'max' : '?'));
  }

  render() {
    const s = this.session(), p = s ? F.program(D, s.program) : null, day = p ? F.day(p, s.week, s.day) : null;
    if (!s || !p || !day || !day.exs.length) {
      const b = page(this, 'Allenamento', null);
      b.appendChild(emptyCard('info', 'Allenamento non disponibile', "La scheda di questo allenamento e' stata eliminata, modificata o non ha esercizi."));
      if (s && !s.done) { if (!F.logsOf(D, s.id).length) D.sessions.splice(D.sessions.indexOf(s), 1); D.liveSession = ''; save(); }
      return b;
    }
    const logs = F.logsOf(D, this.sid);
    const cur = this.firstOpen(day, logs);
    if (this.focus < 0 || this.focus >= day.exs.length) this.focus = cur[0] >= 0 ? cur[0] : day.exs.length - 1;
    const fi = this.focus, e = day.exs[fi];
    const over = dateLong() + ' · Settimana ' + (s.week + 1) + ' di ' + p.weeks.length + (p.weeks[s.week].deload ? ' · scarico' : '');
    const b = page(this, 'Giorno ' + (s.day + 1) + ' · ' + day.name, over, [
      ibtn('note', "Note dell'allenamento", () => promptBox("Note dell'allenamento", 'come ti senti, cosa cambiare…', s.note, v => { s.note = v; save(); }, true)),
      ibtn('more', 'Altre azioni', () => this.menu(s, day, e))]);
    let exDone = 0;
    day.exs.forEach((x, i) => { if (this.doneSets(logs, i) >= this.rowsFor(x, i, logs)) exDone++; });
    b.appendChild(h('div', { class: 'row' }, progress(exDone / day.exs.length), txt('tiny bold', exDone + ' / ' + day.exs.length + ' esercizi')));
    if (day.note) b.appendChild(txt('small', day.note));
    b.appendChild(this.timerBar());
    if (day.warm.length) b.appendChild(this.warmCard(s, day));
    b.appendChild(this.exerciseCard(s, p, day, fi, logs));
    const k = this.openSet(e, fi, logs);
    if (k >= 0) b.appendChild(btn('Completa serie ' + (k + 1), 'primary', () => this.complete(s, day, fi, k)));
    else if (cur[0] >= 0) b.appendChild(btn('Vai a: ' + day.exs[cur[0]].name, 'primary', () => { this.focus = cur[0]; App.render(true); }));
    else b.appendChild(btn('Termina allenamento', 'primary', () => this.finish(s, day, logs)));
    const nt = this.nextText(day, logs, fi);
    if (nt) b.appendChild(txt('tiny center', nt));
    const list = h('div', { class: 'col', style: 'gap:2px' }, txt('over', 'Esercizi di oggi'));
    day.exs.forEach((x, i) => {
      const dn = this.doneSets(logs, i), tot = this.rowsFor(x, i, logs);
      list.appendChild(h('div', { class: 'row tap', style: 'padding:10px 12px;min-height:52px;border-radius:14px;' + (i === fi ? 'background:var(--surface2)' : ''), onclick: () => { this.focus = i; App.render(true); } },
        h('div', { class: 'bignum', style: 'font-size:20px;' + (i === fi ? 'color:var(--accentText)' : '') }, x.superset || String(i + 1)),
        h('div', { class: 'grow' }, txt('bold', x.name), txt('tiny', F.target(x))),
        dn >= tot ? h('span', { class: 'accent', style: 'width:20px;height:20px;display:flex' }, icon('check')) : txt('tiny bold', dn + '/' + tot)));
    });
    b.appendChild(list);
    return b;
  }

  timerBar() {
    const el = h('div', { class: 'timer', id: 'timer' });
    const ring = h('div', { style: 'width:58px;height:58px;flex:none' });
    this.tText = h('div', { class: 'tt' }, '0:00');
    this.tLabel = h('div', { style: 'font-size:11px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' });
    this.ring = ring;
    ap(el, ring, h('div', { class: 'grow' }, h('div', { style: 'font-size:11px;font-weight:700;letter-spacing:.12em' }, 'RECUPERO'), this.tText, this.tLabel),
      h('button', { class: 'tb', onclick: () => { Timer.add(15); this.tick(); } }, '+15'),
      h('button', { class: 'tb skip', onclick: () => { Timer.stop(); this.tick(); } }, 'Salta'));
    this.timerEl = el;
    this.wasRunning = Timer.running();
    el.style.display = this.wasRunning ? '' : 'none';
    this.updateTimer();
    return el;
  }
  updateTimer() {
    if (!this.ring) return;
    const t = Timer.get(), rem = Timer.remaining(), tot = Math.max(1, t.total);
    const f = Math.max(0, Math.min(1, rem / tot)), R = 24, C = 2 * Math.PI * R;
    this.ring.innerHTML = '<svg viewBox="0 0 58 58" width="58" height="58"><circle cx="29" cy="29" r="' + R + '" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="6"/><circle cx="29" cy="29" r="' + R + '" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - f)) + '" transform="rotate(-90 29 29)"/></svg>';
    this.tText.textContent = F.time(rem);
    this.tLabel.textContent = t.label ? 'Poi: ' + t.label : '';
  }
  tick() {
    if (!this.timerEl) return;
    const run = Timer.running();
    if (run) { this.timerEl.style.display = ''; this.updateTimer(); }
    if (!run && this.wasRunning) {
      const t = Timer.get();
      if (t.end && Date.now() - t.end < 3000) {
        beep(); toast('Recupero finito');
        this.timerEl.style.display = ''; this.tText.textContent = 'Via!'; this.timerEl.classList.add('done');
        setTimeout(() => { if (this.timerEl && !Timer.running()) { this.timerEl.style.display = 'none'; this.timerEl.classList.remove('done'); } }, 2500);
      } else this.timerEl.style.display = 'none';
    }
    this.wasRunning = run;
  }

  warmSet(s) { return new Set((s.warmDone || '').split(',').filter(x => x !== '').map(Number)); }
  warmCard(s, day) {
    const set = this.warmSet(s);
    const done = day.warm.filter((_, i) => set.has(i)).length, all = done >= day.warm.length;
    const c = card(h('div', { class: 'row tap', style: 'min-height:40px', onclick: () => { this.warmOpen = !this.warmOpen; App.refresh(); } },
      h('span', { class: 'accent', style: 'width:20px;height:20px;display:flex' }, icon('fire')), h('div', { class: 'h2 grow' }, 'Riscaldamento'),
      txt('tiny bold' + (all ? ' accent' : ''), done + ' / ' + day.warm.length)));
    if (all && !this.warmOpen) { c.appendChild(txt('tiny', 'Fatto. Tocca per rivederlo.')); return c; }
    day.warm.forEach((w, i) => {
      const dn = set.has(i);
      c.appendChild(h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 'bold', style: dn ? 'color:var(--muted)' : '' }, w.name), w.detail ? txt('tiny', w.detail) : null),
        this.check(dn ? 2 : 0, () => { if (set.has(i)) set.delete(i); else set.add(i); s.warmDone = Array.from(set).sort((a, b) => a - b).join(','); save(); App.refresh(); })));
    });
    return c;
  }
  check(state, onclick) {
    return h('button', { class: 'check' + (state === 1 ? ' cur' : ''), 'aria-label': state === 2 ? 'Fatta, tocca per annullare' : 'Segna come fatta', onclick: ev => { ev.stopPropagation(); onclick(); } }, state === 2 ? icon('check') : h('i'));
  }

  exerciseCard(s, p, day, i, logs) {
    const e = day.exs[i], def = F.exercise(D, e.name);
    const rows = this.rowsFor(e, i, logs), k0 = this.openSet(e, i, logs);
    const c = card();
    c.appendChild(h('div', { class: 'row' }, h('div', { class: 'grow' }, e.superset ? txt('tiny bold accent', 'SUPERSERIE ' + e.superset.toUpperCase()) : null,
      h('div', { class: 'h2', style: 'font-size:calc(var(--h2) + 4px)' }, e.name)), txt('tiny bold accent', (k0 < 0 ? rows : k0 + 1) + ' / ' + rows)));
    const g = F.groupOf(e, k0 < 0 ? 0 : k0), timed = this.isTimed(e, g);
    c.appendChild(hscroll(tag(g.sets + ' × ' + (timed ? (g.sec || 30) + ' s' : g.reps)), g.pct > 0 ? tag(F.kg(g.pct) + '% 1RM') : null, g.rpe > 0 ? tag('RPE ' + F.kg(g.rpe)) : null,
      g.kg > 0 ? tag(F.kg(g.kg) + ' kg') : null, tag('Rec ' + F.time(F.restFor(D.settings, e, g))), e.tempo ? tag('Tempo ' + e.tempo) : null));
    if (e.groups.length > 1) c.appendChild(txt('tiny', 'Piano: ' + F.target(e)));
    if (e.note) c.appendChild(txt('small', e.note));
    if (e.approachNote) c.appendChild(h('div', { class: 'notebox' }, txt('tiny bold accent', 'AVVICINAMENTO'), e.approachNote));
    const myNote = this.exNote(s, e.name);
    if (myNote) c.appendChild(h('div', { class: 'notebox' }, 'Tua nota: ' + myNote));
    const sg = F.suggest(D, e.name, g, this.sid);
    if (!timed) {
      const rest = sg.last ? sg.last.replace('ultima volta: ', 'la volta scorsa ').replace(' @', ' a RPE ') : sg.reason;
      c.appendChild(h('div', { class: 'sug tap', onclick: () => sheet('Peso suggerito', txt('small', (sg.kg > 0 ? F.kg(sg.kg) + ' kg: ' : '') + sg.reason + (sg.last ? '. ' + sg.last.charAt(0).toUpperCase() + sg.last.slice(1) : ''))) },
        icon(sg.delta < 0 ? 'down' : 'up'), h('div', null, (sg.kg > 0 ? 'Suggerito ' + F.kg(sg.kg) + ' kg · ' : '') + rest)));
    }
    const box = h('div', { class: 'col', style: 'gap:2px' });
    const barbell = def && /bilanciere/i.test(def.equip);
    const work = k0 >= 0 ? this.draftKg(e, i, k0) : sg.kg;
    if (e.approach.length) {
      e.approach.forEach((ap, k) => {
        const lw = this.logFor(logs, i, k, true);
        let kg = work > 0 ? F.round(work * ap[0] / 100, D.settings.step) : 0;
        if (barbell && kg > 0 && kg < D.settings.bar) kg = D.settings.bar;
        box.appendChild(h('div', { class: 'setrow' }, h('span', { class: 'n', style: 'color:var(--muted)' }, 'A' + (k + 1)),
          h('div', { class: 'grow', style: lw ? 'color:var(--muted)' : '' }, (kg > 0 ? F.kg(kg) + ' kg' : F.kg(ap[0]) + '%') + ' × ' + ap[1]), txt('tiny faint', F.kg(ap[0]) + '%'),
          this.check(lw ? 2 : 0, () => {
            if (lw) D.logs.splice(D.logs.indexOf(lw), 1);
            else D.logs.push(Object.assign(F.SetLog(), { session: this.sid, ex: e.name, exIdx: i, setIdx: k, kg, reps: ap[1], warmup: true }));
            save(); App.refresh();
          })));
      });
    } else if (D.settings.warmup && barbell && work > 0 && !p.weeks[s.week].deload) {
      const wu = F.warmup(work, D.settings.bar, D.settings.step);
      if (wu.length) {
        const all = wu.every((_, k) => this.logFor(logs, i, k, true));
        box.appendChild(h('div', { class: 'setrow tap', onclick: () => sheet('Riscaldamento · ' + e.name, txt('small', wu.map(w => F.kg(w[0]) + ' kg × ' + w[1]).join('\n')).cloneNode(true)) },
          h('span', { class: 'n', style: 'color:var(--muted)' }, 'R'), h('div', { class: 'grow', style: 'color:var(--muted)' }, 'Riscaldamento'),
          txt('tiny', F.kg(wu[0][0]) + '–' + F.kg(wu[wu.length - 1][0]) + ' kg'),
          this.check(all ? 2 : 0, () => {
            if (all) D.logs = D.logs.filter(l => !(l.session === this.sid && l.exIdx === i && l.warmup));
            else wu.forEach((w, k) => { if (!this.logFor(logs, i, k, true)) D.logs.push(Object.assign(F.SetLog(), { session: this.sid, ex: e.name, exIdx: i, setIdx: k, kg: w[0], reps: w[1], warmup: true })); });
            save(); App.refresh();
          })));
      }
    }
    for (let k = 0; k < rows; k++) box.appendChild(this.setRow(e, i, k, logs, k === k0));
    c.appendChild(box);
    if (k0 >= 0 && !timed) {
      const cur = this.draftRpe(i, k0);
      c.appendChild(hscroll(txt('tiny bold', 'RPE'), [6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => {
        const on = Math.abs(cur - v) < 0.01;
        return chip(F.kg(v), on, () => { const kk = this.key(i, k0) + ':rpe'; if (on) delete drafts[kk]; else drafts[kk] = String(v); App.refresh(); });
      })));
      c.appendChild(txt('tiny faint', 'Tocca una serie per cambiare peso o ripetizioni'));
    }
    return c;
  }

  setRow(e, i, k, logs, current) {
    const done = this.logFor(logs, i, k, false);
    const r = h('div', { class: 'setrow' + (current ? ' cur' : '') });
    r.appendChild(h('span', { class: 'n', style: 'color:' + (current ? 'var(--accentText)' : done ? 'var(--muted)' : 'var(--faint)') }, String(k + 1)));
    if (done) {
      ap(r, h('div', { class: 'grow' }, done.sec > 0 && done.reps === 0 ? done.sec + ' s' + (done.kg > 0 ? ' · ' + F.kg(done.kg) + ' kg' : '') : F.kg(done.kg) + ' kg × ' + done.reps),
        txt('tiny', done.rpe > 0 ? 'RPE ' + F.kg(done.rpe) : ''), done.pr ? h('span', { style: 'width:18px;height:18px;display:flex;color:var(--record)' }, icon('trophy')) : null,
        this.check(2, () => confirmBox('Annullare la serie ' + (k + 1) + '?', "La serie tornera' da fare.", 'Annulla serie', () => { D.logs.splice(D.logs.indexOf(done), 1); save(); App.refresh(); })));
      return r;
    }
    const rpe = this.draftRpe(i, k);
    ap(r, h('div', { class: 'grow', style: current ? 'font-weight:700' : 'color:var(--faint)' }, this.label(e, i, k)),
      txt('tiny', current ? (rpe > 0 ? 'RPE ' + F.kg(rpe) : 'RPE —') : ''),
      this.check(current ? 1 : 0, () => { const s = this.session(); const p = F.program(D, s.program); this.complete(s, F.day(p, s.week, s.day), i, k); }));
    r.classList.add('tap');
    r.addEventListener('click', () => this.editSet(e, i, k));
    return r;
  }

  editSet(e, i, k) {
    const g = F.groupOf(e, k), timed = this.isTimed(e, g);
    const kgI = input(this.draftKg(e, i, k) > 0 ? F.kg(this.draftKg(e, i, k)) : '', 'kg', true);
    const rI = input(this.draftReps(e, i, k) || '', timed ? 'secondi' : 'ripetizioni', true);
    rI.setAttribute('inputmode', 'numeric');
    const rpeI = input(this.draftRpe(i, k) ? F.kg(this.draftRpe(i, k)) : '', 'es. 8', true);
    const stepper = (label, inp, step, dec) => field(label, h('div', { class: 'row' },
      ibtn('minus', 'Meno', () => { const v = Math.max(0, F.parse(inp.value, 0) - step); inp.value = dec ? F.kg(v) : String(Math.round(v)); }, 'alt'),
      Object.assign(inp, { style: 'text-align:center;font-size:20px;font-family:var(--num);font-weight:700' }),
      ibtn('plus', "Piu'", () => { const v = F.parse(inp.value, 0) + step; inp.value = dec ? F.kg(v) : String(Math.round(v)); }, 'alt')));
    const content = h('div', { class: 'col', style: 'gap:14px' },
      stepper(timed ? 'Peso (facoltativo)' : 'Peso (kg)', kgI, D.settings.step, true),
      stepper(timed ? 'Durata (secondi)' : 'Ripetizioni', rI, timed ? 5 : 1, false),
      timed ? null : field('RPE (facoltativo, 1-10)', rpeI),
      !timed && g.reps ? txt('tiny', 'Obiettivo: ' + F.targetGroup(g)) : null,
      !timed ? btn('Calcolatore dischi', 'secondary', () => platesTool(F.parse(kgI.value, 0)), 'plates') : null);
    sheet(e.name + ' · serie ' + (k + 1), content, 'OK', () => {
      const kk = this.key(i, k);
      drafts[kk + ':kg'] = kgI.value.trim().replace(',', '.');
      drafts[kk + ':r'] = rI.value.trim();
      const rv = rpeI.value.trim().replace(',', '.');
      if (rv) drafts[kk + ':rpe'] = rv; else delete drafts[kk + ':rpe'];
      App.refresh();
    });
  }

  complete(s, day, i, k) {
    const e = day.exs[i], g = F.groupOf(e, k), timed = this.isTimed(e, g);
    const kg = this.draftKg(e, i, k), reps = this.draftReps(e, i, k);
    let rpe = this.draftRpe(i, k);
    if (!timed && reps <= 0) { toast('Indica quante ripetizioni hai fatto'); this.editSet(e, i, k); return; }
    const def = F.exercise(D, e.name), bw = def && /corpo libero/i.test(def.equip);
    if (!timed && kg <= 0 && !bw && drafts[this.key(i, k) + ':kg'] == null) { toast('Scrivi il peso usato (0 se a corpo libero)'); this.editSet(e, i, k); return; }
    if (kg < 0 || kg > 1000) { toast('Controlla il peso'); return; }
    if (rpe > 10) rpe = 10;
    const l = Object.assign(F.SetLog(), { session: this.sid, ex: e.name, exIdx: i, setIdx: k, kg, rpe: Math.round(rpe * 2) / 2 });
    if (timed) { l.sec = reps; l.reps = 0; } else l.reps = reps;
    l.pr = timed ? '' : F.checkPR(D, l);
    D.logs.push(l);
    const nm = timed ? 0 : F.maybeUpdateMax(D, l);
    const kk = this.key(i, k);
    delete drafts[kk + ':kg']; delete drafts[kk + ':r']; delete drafts[kk + ':rpe'];
    const nk = this.key(i, k + 1) + ':kg';
    if (drafts[nk] == null && kg > 0 && F.groupOf(e, k + 1) === g) drafts[nk] = String(kg);
    save();
    if (l.pr) toast('Record! ' + l.pr);
    else if (nm > 0) toast('Massimale di ' + e.name + ' aggiornato a ' + F.kg(nm) + ' kg');
    const logs = F.logsOf(D, this.sid);
    const superNext = e.superset && i + 1 < day.exs.length && F.same(day.exs[i + 1].superset, e.superset) && this.openSet(day.exs[i + 1], i + 1, logs) >= 0;
    if (superNext) this.focus = i + 1;
    else {
      let first = i;
      while (e.superset && first > 0 && F.same(day.exs[first - 1].superset, e.superset)) first--;
      if (first !== i && this.openSet(day.exs[first], first, logs) >= 0) this.focus = first;
      else if (this.openSet(e, i, logs) < 0) this.focus = -1;
      const n = this.firstOpen(day, logs);
      if (n[0] >= 0) {
        const fx = this.focus >= 0 ? this.focus : n[0], fk = this.openSet(day.exs[fx], fx, logs);
        Timer.start(F.restFor(D.settings, e, g), day.exs[fx].name + ' · serie ' + ((fk >= 0 ? fk : n[1]) + 1));
      }
    }
    App.render(true);
  }

  nextText(day, logs, i) {
    for (let j = i + 1; j < day.exs.length; j++) {
      if (this.openSet(day.exs[j], j, logs) < 0) continue;
      const x = day.exs[j], g = x.groups[0] || F.SetGroup(), sg = F.suggest(D, x.name, g, this.sid);
      return 'Prossimo: ' + x.name + ' · ' + F.targetGroup(g).split(' · ')[0] + (sg.kg > 0 ? ' · ' + F.kg(sg.kg) + ' kg' : '');
    }
    return '';
  }
  exNote(s, ex) { try { return s.exNotes ? (JSON.parse(s.exNotes)[ex] || '') : ''; } catch (e) { return ''; } }
  setExNote(s, ex, note) { let o = {}; try { o = s.exNotes ? JSON.parse(s.exNotes) : {}; } catch (e) { o = {}; } if (note) o[ex] = note; else delete o[ex]; s.exNotes = JSON.stringify(o); }

  menu(s, day, e) {
    choose('Allenamento', ['Aggiungi una serie a ' + e.name, 'Nota su ' + e.name, 'Calcolatore dischi', 'Storico di ' + e.name, 'Termina allenamento', 'Annulla allenamento'], w => {
      if (w === 0) { const k = this.sid + ':' + this.focus; extras[k] = (extras[k] || 0) + 1; App.refresh(); }
      else if (w === 1) promptBox('Nota · ' + e.name, 'es. dolore alla spalla, presa larga…', this.exNote(s, e.name), v => { this.setExNote(s, e.name, v); save(); App.refresh(); });
      else if (w === 2) { const logs = F.logsOf(D, this.sid), k = this.openSet(e, this.focus, logs); platesTool(k >= 0 ? this.draftKg(e, this.focus, k) : 0); }
      else if (w === 3) App.show(new ExerciseScreen(e.name));
      else if (w === 4) this.finish(s, day, F.logsOf(D, this.sid));
      else confirmBox("Annullare l'allenamento?", 'Le serie registrate in questo allenamento verranno cancellate.', 'Annulla allenamento', () => {
        D.logs = D.logs.filter(l => l.session !== this.sid); D.sessions.splice(D.sessions.indexOf(s), 1); D.liveSession = '';
        Timer.stop(); this.clearDrafts(); save(); App.home(0);
      });
    });
  }

  finish(s, day, logs) {
    let total = 0;
    day.exs.forEach((x, i) => { total += this.rowsFor(x, i, logs); });
    const doneSets = logs.filter(l => !l.warmup).length;
    const vals = [s.energy, s.sleep, s.pain];
    const qs = [['Energia', 'poca', 'tanta'], ['Sonno', 'male', 'bene'], ['Dolori / fastidi', 'nessuno', 'forti']];
    const content = h('div', { class: 'col', style: 'gap:14px' });
    if (doneSets < total) content.appendChild(txt('small', 'Hai fatto ' + doneSets + ' serie su ' + total + '. Le serie mancanti risulteranno non fatte nel resoconto.'));
    qs.forEach((q, qi) => {
      const row = h('div', { class: 'row', style: 'gap:6px' });
      const draw = () => { row.innerHTML = ''; for (let v = 1; v <= 5; v++) row.appendChild(h('button', { class: 'chip' + (vals[qi] === v ? ' on' : ''), style: 'flex:1;min-height:44px', onclick: () => { vals[qi] = vals[qi] === v ? 0 : v; draw(); } }, String(v))); };
      draw();
      content.appendChild(h('div', { class: 'col', style: 'gap:6px' }, txt('over', q[0] + ' (' + q[1] + ' → ' + q[2] + ')'), row));
    });
    const note = area(s.note, "Note (facoltative): come e' andata, cosa cambiare…", 3);
    content.appendChild(field('Note', note));
    sheet('Termina allenamento', content, 'Salva e termina', () => {
      s.energy = vals[0]; s.sleep = vals[1]; s.pain = vals[2]; s.note = note.value.trim();
      s.done = true; s.end = Date.now(); D.liveSession = '';
      Timer.stop(); this.clearDrafts(); save();
      App.replace(new SummaryScreen(this.sid));
    });
  }
}

class SummaryScreen {
  constructor(sid) { this.sid = sid; }
  onBack() { App.home(0); return true; }
  render() {
    const s = F.session(D, this.sid);
    const b = page(this, 'Allenamento finito', 'Ben fatto');
    if (!s) return b;
    b.appendChild(h('div', { class: 'card accentcard' }, h('div', { class: 'h2', style: 'font-size:24px' }, s.dayName), txt('', F.sessionSummary(D, s))));
    const prs = F.logsOf(D, this.sid).filter(l => l.pr);
    if (prs.length) b.appendChild(card(txt('h2', 'Record di oggi'), prs.map(l => recordRow(l, false))));
    const p = F.program(D, s.program), n = p ? F.next(D, p) : null;
    if (p) {
      const c = card(txt('over', 'Prossimo allenamento'));
      if (!n) ap(c, txt('h2', 'Scheda completata!'), txt('small', 'Esporta il resoconto e chiedi a Claude la prossima scheda.'), btn('Esporta il resoconto', 'primary', () => shareText('Resoconto Forge', F.report(D, p))));
      else ap(c, txt('h2', F.day(p, n[0], n[1]).name), txt('small', 'Settimana ' + (n[0] + 1) + ' · Giorno ' + (n[1] + 1)));
      b.appendChild(c);
    }
    b.appendChild(btn('Chiudi', 'secondary', () => App.home(0)));
    return b;
  }
}
function recordRow(l, first) {
  return h('div', { class: 'row' }, h('div', { class: 'ic', style: 'width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none;background:' + (first ? 'var(--accent);color:var(--onAccent)' : 'var(--surface2);color:var(--accentText)') }, icon('trophy')),
    h('div', { class: 'grow' }, txt('bold', l.ex + ' · ' + F.kg(l.kg) + ' kg × ' + l.reps), txt('tiny', l.pr + ' · ' + whenTxt(l.ts))));
}
function whenTxt(ts) {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  if (ts >= d0.getTime()) return 'oggi';
  if (ts >= d0.getTime() - 86400000) return 'ieri';
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

// ============================================================ SCHEDA
class ProgramScreen {
  constructor() { this.root = true; this.week = -1; }
  render() {
    const p = F.active(D);
    const b = page(this, p ? p.name : 'Scheda', p ? 'Scheda attiva' : 'Nessuna scheda attiva', [p ? ibtn('edit', 'Modifica scheda', () => this.editMenu(p)) : null, ibtn('copy', 'Tutte le schede', () => App.show(new ProgramsScreen()))]);
    if (!p) {
      b.appendChild(emptyCard('list', 'Ancora nessuna scheda', 'Importa la scheda che ti prepara Claude oppure creane una a mano.',
        btn('Importa scheda', 'primary', () => App.show(new ImportScreen(''))), btn('Copia le istruzioni per Claude', 'secondary', () => copyText('Istruzioni', F.aiGuide(D))), btn('Crea a mano', 'secondary', () => App.show(new NewProgramScreen()))));
      return b;
    }
    if (!p.weeks.length) { const w = F.Week(); const dd = F.Day(); dd.name = 'Giorno 1'; w.days.push(dd); p.weeks.push(w); F.renumber(p); save(); }
    const n = F.next(D, p);
    if (this.week < 0 || this.week >= p.weeks.length) this.week = n ? n[0] : p.weeks.length - 1;
    const starts = D.sessions.filter(s => s.program === p.id).map(s => s.start);
    const dpw = F.daysPerWeek(p);
    b.appendChild(txt('small', dpw + (dpw === 1 ? ' giorno' : ' giorni') + ' a settimana · ' + (starts.length ? 'iniziata il ' + new Date(Math.min.apply(null, starts)).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : p.weeks.length + ' settimane, non ancora iniziata')));
    if (p.desc) b.appendChild(txt('tiny faint', p.desc));
    b.appendChild(h('div', { class: 'row' }, btn('Importa scheda', 'outline', () => App.show(new ImportScreen('')), 'import'), btn('Esporta', 'secondary', () => this.exportMenu(p), 'export')));
    const wrow = h('div', { class: 'hscroll' });
    p.weeks.forEach((w, i) => {
      const done = F.doneInWeek(D, p, i), complete = done >= w.days.length && w.days.length > 0, sel = i === this.week, now = n && n[0] === i;
      wrow.appendChild(h('button', { class: 'wchip' + (sel ? ' sel' : complete ? ' done' : w.deload ? ' deload' : ''), style: p.weeks.length > 6 ? 'flex:none;width:52px' : '', 'aria-label': 'Settimana ' + (i + 1), onclick: () => { this.week = i; App.refresh(); } },
        h('div', { class: 'num', style: 'font-size:17px' }, 'S' + (i + 1)), complete ? icon('check') : h('div', { class: 's' }, now ? 'ORA' : w.deload ? 'SCAR.' : '')));
    });
    b.appendChild(wrow);
    const w = p.weeks[this.week];
    if (w.deload || w.note) b.appendChild(h('div', { class: 'row' }, w.deload ? tag('Scarico', 'warn') : null, w.note ? txt('small grow', w.note) : null));
    const live = F.session(D, D.liveSession);
    w.days.forEach((day, i) => {
      const dn = F.isDone(D, p, this.week, i);
      const isLive = live && !live.done && live.program === p.id && live.week === this.week && live.day === i;
      const nx = isLive || (n && n[0] === this.week && n[1] === i && !live);
      let extra = null;
      if (isLive) {
        const logs = F.logsOf(D, live.id);
        const dx = day.exs.filter((x, k) => logs.filter(l => !l.warmup && l.exIdx === k).length >= F.totalSets(x)).length;
        extra = tag(dx + '/' + day.exs.length, 'acc');
      } else if (dn) extra = h('span', { class: 'accent', style: 'width:22px;height:22px;display:flex' }, icon('check'));
      const it = h('div', { class: 'item tap' + (nx ? ' sel' : ''), onclick: () => App.show(new DayScreen(p.id, this.week, i)) },
        h('div', { class: 'bignum', style: nx ? 'color:var(--accentText)' : '' }, String(i + 1)),
        h('div', { class: 'grow' }, txt('bold', day.name), txt('tiny', day.exs.length + (day.exs.length === 1 ? ' esercizio' : ' esercizi') + (isLive ? ' · in corso' : dn ? ' · fatto' : ''))), extra);
      b.appendChild(it);
    });
    const main = this.mainExercise(p, this.week);
    if (main) b.appendChild(this.progressionCard(p, main));
    b.appendChild(h('button', { class: 'btn ghost', style: 'color:var(--accentText)', onclick: () => App.show(new ProgressionScreen(p.id, null)) }, 'Tutte le progressioni'));
    return b;
  }
  mainExercise(p, wk) {
    for (const dd of p.weeks[wk].days) for (const e of dd.exs) if (e.groups.some(g => g.pct > 0)) return e.name;
    for (const dd of p.weeks[wk].days) if (dd.exs.length) return dd.exs[0].name;
    return null;
  }
  progressionCard(p, ex) {
    const max = F.currentMax(D, ex);
    const c = h('div', { class: 'card flat tap', onclick: () => App.show(new ProgressionScreen(p.id, ex)) },
      h('div', { class: 'row', style: 'padding:12px 14px 6px' }, h('div', { class: 'h2 grow' }, 'Progressione ' + ex.toLowerCase()), txt('tiny', max > 0 ? '1RM ' + F.kg(max) + ' kg' : '1RM —')),
      h('div', { class: 'tr h' }, h('span', null, 'Sett.'), h('span', null, 'Serie × rip'), h('span', null, '%'), h('span', { class: 'r' }, 'Kg')));
    let to = Math.min(p.weeks.length - 1, Math.max(0, this.week - 1) + 3), from = Math.max(0, to - 3);
    for (let wi = from; wi <= to; wi++) {
      const w = p.weeks[wi];
      let g = null;
      for (const dd of w.days) { const e = dd.exs.find(x => F.same(x.name, ex) && x.groups.length); if (e) { g = e.groups[0]; break; } }
      if (!g) continue;
      const kg = g.kg > 0 ? F.kg(g.kg) : g.pct > 0 && max > 0 ? F.kg(F.round(max * g.pct / 100, D.settings.step)) : '—';
      const hl = wi === this.week;
      c.appendChild(h('div', { class: 'tr' + (hl ? ' hl' : '') }, h('span', { class: 'num', style: hl ? 'color:var(--accentText)' : '' }, 'S' + (wi + 1)),
        h('span', { style: hl ? 'font-weight:700' : '' }, g.sets + ' × ' + (g.reps || g.sec + 's') + (w.deload ? '  scarico' : '')),
        h('span', null, g.pct > 0 ? F.kg(g.pct) + '%' : g.rpe > 0 ? '@' + F.kg(g.rpe) : '—'), h('span', { class: 'r num', style: 'font-size:17px;' + (hl ? 'color:var(--accentText)' : '') }, kg)));
    }
    return c;
  }
  exportMenu(p) {
    choose('Esporta', ['Condividi la scheda (JSON)', 'Salva la scheda in un file', 'Copia la scheda negli appunti', 'Esporta il resoconto per Claude'], i => {
      const json = JSON.stringify(F.programExport(p), null, 2);
      if (i === 0) shareText('Scheda Forge: ' + p.name, json);
      else if (i === 1) saveFile(fileName(p.name) + '.json', 'application/json', json);
      else if (i === 2) copyText('Scheda', json);
      else shareText('Resoconto Forge', F.report(D, p));
    });
  }
  editMenu(p) {
    const w = p.weeks[this.week], wn = this.week + 1;
    choose('Modifica scheda', ['Rinomina la scheda', w.deload ? 'Togli lo scarico dalla settimana ' + wn : 'Segna la settimana ' + wn + ' come scarico', 'Nota della settimana ' + wn,
      'Duplica la settimana ' + wn + ' in fondo', 'Aggiungi una settimana vuota', 'Aggiungi un giorno alla settimana ' + wn, 'Elimina la settimana ' + wn], i => {
      if (i === 0) promptBox('Nome della scheda', '', p.name, v => { if (v) { p.name = v; save(); App.refresh(); } });
      else if (i === 1) { w.deload = !w.deload; save(); App.refresh(); }
      else if (i === 2) promptBox('Nota della settimana', 'es. aumenta il carico se RPE < 8', w.note, v => { w.note = v; save(); App.refresh(); });
      else if (i === 3) { p.weeks.push(F.clone(w)); F.renumber(p); this.week = p.weeks.length - 1; save(); App.refresh(); }
      else if (i === 4) { const nw = F.Week(); w.days.forEach(dd => { const x = F.Day(); x.name = dd.name; nw.days.push(x); }); p.weeks.push(nw); F.renumber(p); this.week = p.weeks.length - 1; save(); App.refresh(); }
      else if (i === 5) promptBox('Nuovo giorno', 'es. Spinta', 'Giorno ' + (w.days.length + 1), v => { const x = F.Day(); x.name = v || 'Giorno ' + (w.days.length + 1); w.days.push(x); save(); App.refresh(); });
      else {
        if (p.weeks.length <= 1) { toast('La scheda deve avere almeno una settimana'); return; }
        confirmBox('Eliminare la settimana ' + wn + '?', "Le settimane successive verranno rinumerate. Lo storico degli allenamenti resta.", 'Elimina', () => {
          const del = this.week;
          p.weeks.splice(del, 1); F.renumber(p);
          D.sessions.forEach(s => { if (s.program !== p.id) return; if (s.week === del) s.ignored = true; else if (s.week > del) s.week--; });
          this.week = Math.max(0, del - 1); save(); App.refresh();
        });
      }
    });
  }
}
const fileName = s => (s.replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/ /g, '_')) || 'scheda';

class ProgramsScreen {
  render() {
    const b = page(this, 'Le tue schede', D.programs.length + (D.programs.length === 1 ? ' scheda' : ' schede'));
    b.appendChild(h('div', { class: 'row' }, btn('Importa', 'primary', () => App.show(new ImportScreen('')), 'import'), btn('Crea a mano', 'secondary', () => App.show(new NewProgramScreen()), 'plus')));
    const act = F.active(D);
    D.programs.slice().reverse().forEach(p => {
      const on = act && act.id === p.id;
      const done = D.sessions.filter(s => s.program === p.id && s.done && !s.ignored).length;
      const c = card(h('div', { class: 'row' }, h('div', { class: 'grow' }, on ? txt('tiny bold accent', 'ATTIVA') : null, txt('h2', p.name),
        txt('tiny', p.weeks.length + ' sett. · ' + F.daysPerWeek(p) + ' giorni · ' + done + '/' + F.totalDays(p) + ' fatti · ' + (p.source === 'importata' ? 'importata' : 'creata a mano'))),
        ibtn('more', 'Opzioni scheda', () => this.menu(p), 'alt')));
      if (on) c.style.borderColor = 'var(--accent)';
      else c.appendChild(btn('Rendi attiva', 'secondary', () => { D.activeId = p.id; save(); App.home(1); }));
      b.appendChild(c);
    });
    return b;
  }
  menu(p) {
    choose(p.name, ['Rendi attiva', 'Duplica', 'Rinomina', 'Esporta (condividi)', 'Elimina'], i => {
      if (i === 0) { D.activeId = p.id; save(); App.home(1); }
      else if (i === 1) { const r = F.parseProgram(F.programExport(p), null, false); r.program.name = p.name + ' (copia)'; r.program.source = p.source; D.programs.push(r.program); save(); App.refresh(); }
      else if (i === 2) promptBox('Nome della scheda', '', p.name, v => { if (v) { p.name = v; save(); App.refresh(); } });
      else if (i === 3) shareText('Scheda Forge: ' + p.name, JSON.stringify(F.programExport(p), null, 2));
      else confirmBox('Eliminare "' + p.name + '"?', "La scheda verra' eliminata. Gli allenamenti fatti restano nello storico e nei grafici.", 'Elimina', () => {
        D.programs.splice(D.programs.indexOf(p), 1);
        if (D.activeId === p.id) D.activeId = D.programs.length ? D.programs[D.programs.length - 1].id : '';
        const live = F.session(D, D.liveSession);
        if (live && live.program === p.id) D.liveSession = '';
        save(); App.refresh();
      });
    });
  }
}

class NewProgramScreen {
  render() {
    const b = page(this, 'Nuova scheda', 'Creala a mano');
    const name = input('', 'es. Ipertrofia 6 settimane'), weeks = input('4', '4', true), days = input('3', '3', true), names = input('', 'es. Spinta, Tirata, Gambe');
    ap(b, field('Nome', name), h('div', { class: 'grid2' }, field('Settimane', weeks), field('Giorni a settimana', days)), field('Nomi dei giorni (separati da virgola, facoltativo)', names),
      txt('small', 'Poi componi la settimana 1 e usa "Copia questo giorno nelle settimane successive" e le Progressioni per i carichi. Oppure fattela preparare da Claude e importala.'),
      btn('Crea scheda', 'primary', () => {
        const w = Math.max(1, Math.min(52, Math.round(F.parse(weeks.value, 4)))), dd = Math.max(1, Math.min(7, Math.round(F.parse(days.value, 3))));
        const nn = names.value.split(','), p = F.Program();
        p.name = name.value.trim() || 'La mia scheda';
        for (let i = 0; i < w; i++) { const wk = F.Week(); for (let j = 0; j < dd; j++) { const x = F.Day(); x.name = (nn[j] || '').trim() || 'Giorno ' + (j + 1); wk.days.push(x); } p.weeks.push(wk); }
        F.renumber(p); D.programs.push(p); D.activeId = p.id; save();
        App.home(1); App.show(new DayScreen(p.id, 0, 0));
      }));
    return b;
  }
}

class DayScreen {
  constructor(pid, w, d) { this.pid = pid; this.w = w; this.d = d; this.edit = false; }
  render() {
    const p = F.program(D, this.pid), day = F.day(p, this.w, this.d);
    if (!day) { const b = page(this, 'Giorno', null); b.appendChild(emptyCard('info', 'Giorno non trovato', 'Potrebbe essere stato eliminato.')); return b; }
    const b = page(this, day.name, 'Settimana ' + (this.w + 1) + ' · Giorno ' + (this.d + 1) + (p.weeks[this.w].deload ? ' · scarico' : ''),
      [ibtn(this.edit ? 'check' : 'edit', this.edit ? 'Fine modifiche' : 'Modifica', () => { this.edit = !this.edit; App.refresh(); }, this.edit ? 'acc' : ''), ibtn('more', 'Altre azioni', () => this.menu(p, day))]);
    const dn = F.isDone(D, p, this.w, this.d);
    if (dn) b.appendChild(h('div', null, tag("Allenamento gia' fatto", 'good')));
    if (day.note) b.appendChild(txt('small', day.note));
    if (day.warm.length) b.appendChild(card(h('div', { class: 'row' }, h('span', { class: 'accent', style: 'width:20px;height:20px;display:flex' }, icon('fire')), txt('h2 grow', 'Riscaldamento')),
      day.warm.map(w => h('div', null, txt('bold', w.name), w.detail ? txt('tiny', w.detail) : null))));
    day.exs.forEach((e, i) => b.appendChild(this.exCard(p, day, e, i)));
    if (!day.exs.length) b.appendChild(emptyCard('dumbbell', 'Nessun esercizio', 'Tocca "Aggiungi esercizio" per comporre l\'allenamento.'));
    if (this.edit || !day.exs.length) b.appendChild(btn('+ Aggiungi esercizio', 'outline', () => pickExercise('Aggiungi esercizio', n => {
      const e = F.Ex(); e.name = n; const g = F.SetGroup(); g.sets = 3; g.reps = '8'; e.groups.push(g); day.exs.push(e); save(); this.edit = true; App.refresh();
    })));
    if (!this.edit && day.exs.length) {
      const live = F.session(D, D.liveSession);
      const isLive = live && !live.done && live.program === this.pid && live.week === this.w && live.day === this.d;
      b.appendChild(btn(isLive ? 'Riprendi allenamento' : dn ? 'Rifai questo allenamento' : 'Inizia questo allenamento', 'primary', () => {
        const go = () => { const s = beginWorkout(p, this.w, this.d); save(); App.switchTab(0); App.show(new WorkoutScreen(s.id)); };
        if (live && !live.done && !isLive && F.logsOf(D, live.id).length) confirmBox('Hai un allenamento in corso', 'Vuoi chiudere quello in corso (' + live.dayName + ') e iniziare questo?', 'Inizia questo', go);
        else go();
      }));
    }
    return b;
  }
  exCard(p, day, e, i) {
    const c = card(h('div', { class: 'row' }, h('div', { class: 'grow' }, e.superset ? txt('tiny bold accent', 'SUPERSERIE ' + e.superset.toUpperCase()) : null, txt('h2', e.name)),
      this.edit ? ibtn('arrowup', 'Sposta su', () => { if (i > 0) { day.exs.splice(i - 1, 0, day.exs.splice(i, 1)[0]); save(); App.refresh(); } }, 'alt') : null,
      this.edit ? ibtn('more', 'Opzioni esercizio', () => this.exMenu(p, day, i), 'alt') : null));
    e.groups.forEach((g, k) => {
      const sg = F.suggest(D, e.name, g, null);
      c.appendChild(h('div', { class: 'row', style: 'min-height:' + (this.edit ? 44 : 28) + 'px' }, h('div', { class: 'grow' }, F.targetGroup(g)),
        !(g.kg > 0) && sg.kg > 0 ? h('div', { class: 'num accent', style: 'font-size:16px' }, F.kg(sg.kg) + ' kg') : null,
        this.edit ? ibtn('edit', 'Modifica serie', () => editGroup(e.name, g, ng => { e.groups[k] = ng; save(); App.refresh(); }), 'alt') : null,
        this.edit ? ibtn('trash', 'Elimina serie', () => { if (e.groups.length <= 1) { toast('Un esercizio deve avere almeno una riga di serie'); return; } e.groups.splice(k, 1); save(); App.refresh(); }, 'alt') : null));
    });
    c.appendChild(hscroll(tag('Recupero ' + F.time(F.restFor(D.settings, e, e.groups[0]))), e.tempo ? tag('Tempo ' + e.tempo) : null));
    if (e.note) c.appendChild(txt('small', e.note));
    if (e.approach.length || e.approachNote) c.appendChild(h('div', { class: 'tiny accent' }, 'Avvicinamento: ' + (e.approach.length ? e.approach.map(x => F.kg(x[0]) + '% × ' + x[1]).join(', ') + '. ' : '') + e.approachNote));
    if (this.edit) c.appendChild(h('button', { class: 'btn ghost', style: 'color:var(--accentText);justify-content:flex-start', onclick: () => editGroup(e.name, null, ng => { e.groups.push(ng); save(); App.refresh(); }) }, '+ Aggiungi righe di serie'));
    return c;
  }
  exMenu(p, day, i) {
    const e = day.exs[i];
    choose(e.name, ['Sostituisci esercizio', 'Recupero', 'Nota / indicazioni', 'Superserie (lettera)', 'Tempo di esecuzione', 'Duplica', 'Applica alle settimane successive', 'Indicazioni di avvicinamento', 'Elimina'], w => {
      if (w === 0) pickExercise('Sostituisci ' + e.name, n => { e.name = n; save(); App.refresh(); });
      else if (w === 1) promptBox('Recupero', 'es. 2:30 oppure 90', e.rest > 0 ? F.time(e.rest) : '', v => { e.rest = F.restSeconds(v); save(); App.refresh(); });
      else if (w === 2) promptBox('Indicazioni', 'es. fermo di 1 secondo al petto', e.note, v => { e.note = v; save(); App.refresh(); }, true);
      else if (w === 3) promptBox('Superserie', 'stessa lettera = da fare insieme', e.superset, v => { e.superset = v.toUpperCase(); save(); App.refresh(); });
      else if (w === 4) promptBox('Tempo di esecuzione', 'es. 3-1-1', e.tempo, v => { e.tempo = v; save(); App.refresh(); });
      else if (w === 5) { day.exs.splice(i + 1, 0, F.clone(e)); save(); App.refresh(); }
      else if (w === 6) {
        let c = 0;
        for (let wi = this.w + 1; wi < p.weeks.length; wi++) {
          const od = p.weeks[wi].days[this.d]; if (!od) continue;
          const k = od.exs.findIndex(x => F.same(x.name, e.name));
          if (k >= 0) od.exs[k] = F.clone(e); else od.exs.push(F.clone(e));
          c++;
        }
        save(); toast(c ? 'Applicato a ' + c + (c === 1 ? ' settimana' : ' settimane') : 'Non ci sono settimane successive');
      } else if (w === 7) promptBox('Avvicinamento', 'es. 2 serie leggere, controlla la discesa…', e.approachNote, v => { e.approachNote = v; save(); App.refresh(); }, true);
      else confirmBox('Eliminare ' + e.name + '?', "Verra' tolto solo da questo giorno.", 'Elimina', () => { day.exs.splice(i, 1); save(); App.refresh(); });
    });
  }
  menu(p, day) {
    choose(day.name, ['Rinomina il giorno', 'Nota del giorno', 'Copia questo giorno nelle settimane successive', 'Riscaldamento del giorno', 'Elimina il giorno'], i => {
      if (i === 0) promptBox('Nome del giorno', '', day.name, v => { if (v) { day.name = v; save(); App.refresh(); } });
      else if (i === 1) promptBox('Nota del giorno', '', day.note, v => { day.note = v; save(); App.refresh(); }, true);
      else if (i === 2) confirmBox('Copiare il giorno?', 'Il giorno ' + (this.d + 1) + " delle settimane successive verra' sostituito con questo.", 'Copia', () => {
        let c = 0;
        for (let wi = this.w + 1; wi < p.weeks.length; wi++) { const wk = p.weeks[wi]; if (this.d < wk.days.length) wk.days[this.d] = F.clone(day); else wk.days.push(F.clone(day)); c++; }
        save(); toast('Copiato in ' + c + (c === 1 ? ' settimana' : ' settimane'));
      });
      else if (i === 3) promptBox('Riscaldamento (un passaggio per riga, "Nome: dettagli")', 'Cyclette: 5 minuti facili', day.warm.map(w => w.name + (w.detail ? ': ' + w.detail : '')).join('\n'), v => {
        day.warm = v.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const c = x.indexOf(':'); return c > 0 ? { name: x.slice(0, c).trim(), detail: x.slice(c + 1).trim() } : { name: x, detail: '' }; });
        save(); App.refresh();
      }, true);
      else confirmBox('Eliminare ' + day.name + '?', "Il giorno verra' tolto dalla settimana " + (this.w + 1) + '.', 'Elimina', () => {
        p.weeks[this.w].days.splice(this.d, 1);
        D.sessions.forEach(s => { if (s.program !== this.pid || s.week !== this.w) return; if (s.day === this.d) s.ignored = true; else if (s.day > this.d) s.day--; });
        save(); App.back();
      });
    });
  }
}

class ProgressionScreen {
  constructor(pid, ex) { this.pid = pid; this.ex = ex; }
  render() {
    const p = F.program(D, this.pid);
    if (!p) return page(this, 'Progressioni', null);
    if (!this.ex) {
      const b = page(this, 'Progressioni', p.name);
      b.appendChild(txt('small', 'Scegli un esercizio per vedere e modificare come cambia di settimana in settimana.'));
      const seen = new Map();
      p.weeks.forEach(w => w.days.forEach(dd => dd.exs.forEach(e => seen.set(e.name, (seen.get(e.name) || 0) + 1))));
      seen.forEach((c, name) => { const mx = F.currentMax(D, name); b.appendChild(item(null, name, c + ' volte nella scheda' + (mx > 0 ? ' · 1RM ' + F.kg(mx) + ' kg' : ''), () => App.show(new ProgressionScreen(this.pid, name)))); });
      return b;
    }
    const max = F.currentMax(D, this.ex), nx = F.next(D, p);
    const b = page(this, this.ex, 'Progressione · ' + p.name);
    b.appendChild(txt('small', max > 0 ? 'Massimale attuale: ' + F.kg(max) + ' kg. I kg sono calcolati dalla % e arrotondati a ' + F.kg(D.settings.step) + ' kg.' : 'Nessun massimale per questo esercizio: inseriscilo in Altro › Massimali per vedere i kg dalle %.'));
    const t = h('div', { class: 'card flat' }, h('div', { class: 'tr h', style: 'grid-template-columns:0.9fr 1.6fr 0.8fr 0.8fr 1fr' }, ['Sett.', 'Serie × rip', '%', 'RPE', 'Kg'].map((x, i) => h('span', { class: i === 4 ? 'r' : '' }, x))));
    p.weeks.forEach((w, wi) => w.days.forEach((dd, di) => dd.exs.forEach(e => {
      if (!F.same(e.name, this.ex)) return;
      e.groups.forEach((g, gi) => {
        const sg = F.suggest(D, e.name, g, null);
        const kg = g.kg > 0 ? F.kg(g.kg) : g.pct > 0 && max > 0 ? F.kg(F.round(max * g.pct / 100, D.settings.step)) : sg.kg > 0 ? '~' + F.kg(sg.kg) : '—';
        const lab = gi === 0 ? 'S' + (wi + 1) + (w.days.length > 1 ? ' G' + (di + 1) : '') + (w.deload ? '*' : '') : '';
        t.appendChild(h('div', { class: 'tr tap' + (nx && nx[0] === wi ? ' hl' : ''), style: 'grid-template-columns:0.9fr 1.6fr 0.8fr 0.8fr 1fr', onclick: () => editGroup(e.name, g, ng => { e.groups[gi] = ng; save(); App.refresh(); }) },
          h('span', { class: 'num' }, lab), h('span', null, g.sets + ' × ' + (g.reps || g.sec + 's')), h('span', null, g.pct > 0 ? F.kg(g.pct) : '—'), h('span', null, g.rpe > 0 ? F.kg(g.rpe) : '—'), h('span', { class: 'r num accent', style: 'font-size:16px' }, kg)));
      });
    })));
    b.appendChild(t);
    b.appendChild(txt('tiny', '* = settimana di scarico. Tocca una riga per modificarla.'));
    b.appendChild(btn('Progressione automatica', 'primary', () => this.auto(p)));
    return b;
  }
  auto(p) {
    const from = input('1', '1', true), to = input(String(p.weeks.length), '', true), step = input('2,5', 'es. 2,5', true);
    let mode = 0;
    const modes = ['+ % del massimale', '+ kg fissi', '+ ripetizioni', '+ RPE'];
    const chips = h('div', { class: 'hscroll' });
    const draw = () => { chips.innerHTML = ''; modes.forEach((m, i) => chips.appendChild(chip(m, mode === i, () => { mode = i; draw(); }))); };
    draw();
    sheet('Progressione automatica · ' + this.ex, h('div', { class: 'col', style: 'gap:12px' }, txt('small', 'Parte dai valori della settimana iniziale e li aumenta ogni settimana. Le settimane di scarico restano come sono.'),
      h('div', { class: 'grid2' }, field('Dalla settimana', from), field('Alla settimana', to)), field('Cosa aumentare', chips), field('Aumento per settimana', step)), 'Applica', () => {
      const f = Math.round(F.parse(from.value, 1)) - 1, tt = Math.round(F.parse(to.value, p.weeks.length)) - 1, inc = F.parse(step.value, 0);
      if (f < 0 || tt >= p.weeks.length || f >= tt || !inc) { toast("Controlla le settimane e l'aumento"); return; }
      const base = new Map();
      p.weeks[f].days.forEach((dd, di) => { const e = dd.exs.find(x => F.same(x.name, this.ex)); if (e && !base.has(di)) base.set(di, e); });
      if (!base.size) { toast('Esercizio non trovato nella settimana ' + (f + 1)); return; }
      let steps = 0, changed = 0;
      for (let wi = f + 1; wi <= tt; wi++) {
        const w = p.weeks[wi]; if (w.deload) continue; steps++;
        let any = false;
        base.forEach((be, di) => {
          if (di >= w.days.length) return;
          const day = w.days[di], nw = F.clone(be);
          nw.groups.forEach(g => {
            if (mode === 0 && g.pct > 0) g.pct = Math.round((g.pct + inc * steps) * 10) / 10;
            else if (mode === 1 && g.kg > 0) g.kg += inc * steps;
            else if (mode === 2) { const lo = F.repsLow(g.reps), hi = F.repsHigh(g.reps), a = Math.round(inc * steps); if (lo > 0 && hi > lo) g.reps = (lo + a) + '-' + (hi + a); else if (lo > 0) g.reps = String(lo + a); }
            else if (mode === 3 && g.rpe > 0) g.rpe = Math.min(10, g.rpe + inc * steps);
          });
          const k = day.exs.findIndex(x => F.same(x.name, this.ex));
          if (k >= 0) day.exs[k] = nw; else day.exs.push(nw);
          any = true;
        });
        if (any) changed++;
      }
      save(); App.refresh(); toast('Aggiornate ' + changed + (changed === 1 ? ' settimana' : ' settimane'));
    });
  }
}

// ============================================================ IMPORTA
class ImportScreen {
  constructor(text) { this.text = text || ''; this.res = null; this.saveMaxes = true; }
  render() {
    if (!this.res && this.text.trim()) this.res = F.importText(this.text, D);
    const b = page(this, 'Importa', 'Scheda o esercizi da Claude');
    const res = this.res;
    if (!res) {
      b.appendChild(txt('small', 'Incolla qui la risposta di Claude (va bene anche con il testo intorno), oppure apri un file .json.'));
      const ta = area(this.text, '{ "formato": "forge-scheda", ... }', 8);
      b.appendChild(h('div', { class: 'row' },
        btn('Incolla', 'primary', async () => { const s = await pasteText(); if (s && s.trim()) { this.text = s; this.res = F.importText(s, D); App.refresh(); } else { toast('Tieni premuto nel riquadro e scegli Incolla'); ta.focus(); } }, 'copy'),
        btn('Apri file', 'secondary', () => openFile(s => { this.text = s; this.res = F.importText(s, D); App.refresh(); }), 'import')));
      b.appendChild(ta);
      b.appendChild(btn('Controlla il testo scritto', 'secondary', () => { this.text = ta.value; if (!this.text.trim()) { toast('Scrivi o incolla il testo'); return; } this.res = F.importText(this.text, D); App.refresh(); }));
      b.appendChild(card(txt('h2', 'Non hai ancora la scheda?'), txt('small', "Copia le istruzioni, incollale nella chat con Claude e scrivi cosa vuoi. Contengono gia' i tuoi massimali e gli esercizi della tua libreria."),
        btn('Copia le istruzioni per Claude', 'outline', () => copyText('Istruzioni', F.aiGuide(D)))));
      return b;
    }
    if (res.errors.length) {
      b.appendChild(h('div', { class: 'card', style: 'background:var(--warnBg);border:0' }, h('div', { class: 'bold', style: 'color:var(--warn)' }, 'Non posso importare questo testo'),
        res.errors.map(e => txt('small', '• ' + e)), txt('tiny', 'Suggerimento: chiedi a Claude "rimandami la scheda in un unico blocco JSON nel formato Forge".')));
      b.appendChild(btn('Riprova', 'secondary', () => { this.res = null; this.text = ''; App.refresh(); }));
      return b;
    }
    if (res.exercisesOnly) {
      b.appendChild(card(txt('h2', res.newExercises.length + (res.newExercises.length === 1 ? ' esercizio' : ' esercizi')), res.newExercises.map(e => h('div', null, txt('bold', e.name), txt('tiny', e.group + (e.equip ? ' · ' + e.equip : '') + (e.note ? ' · ' + e.note : ''))))));
      this.warnings(b);
      b.appendChild(btn('Aggiungi alla libreria', 'primary', () => { const n = this.addExercises(); save(); toast(n + ' esercizi aggiunti o aggiornati'); App.closeAndHome(3); }));
      b.appendChild(btn('Annulla', 'secondary', () => App.back()));
      return b;
    }
    const p = res.program;
    b.appendChild(card(txt('over', 'Anteprima'), txt('h2', p.name), p.desc ? txt('small', p.desc) : null,
      h('div', { class: 'row' }, [[p.weeks.length, 'settimane'], [F.daysPerWeek(p), 'giorni/sett.'], [F.distinctExercises(p), 'esercizi']].map(x => h('div', { class: 'grow' }, h('div', { class: 'num', style: 'font-size:28px' }, String(x[0])), txt('tiny', x[1]))))));
    p.weeks.slice(0, p.weeks.length > 3 ? 2 : p.weeks.length).forEach((w, wi) => {
      b.appendChild(card(h('div', { class: 'row' }, txt('h2 grow', 'Settimana ' + (wi + 1)), w.deload ? tag('Scarico', 'warn') : null), w.note ? txt('small', w.note) : null,
        w.days.map(dd => h('div', null, txt('bold', dd.name), txt('tiny', dd.exs.map(e => '• ' + e.name + ' — ' + F.target(e)).join('\n') || 'nessun esercizio')))));
    });
    b.querySelectorAll('.tiny').forEach(t => { t.style.whiteSpace = 'pre-line'; });
    if (p.weeks.length > 3) b.appendChild(txt('small', '… e altre ' + (p.weeks.length - 2) + " settimane (le vedi tutte dopo l'importazione)"));
    if (res.newExercises.length) b.appendChild(card(txt('h2', 'Esercizi nuovi'), txt('small', 'Non sono nella tua libreria: li aggiungo automaticamente.'), res.newExercises.map(e => h('div', null, txt('bold', e.name), txt('tiny', e.group + (e.equip ? ' · ' + e.equip : ''))))));
    const mk = Object.keys(res.maxes);
    if (mk.length) b.appendChild(card(txt('h2', 'Massimali nella scheda'), mk.map(k => { const cur = F.currentMax(D, k); return h('div', null, txt('bold', k + ': ' + F.kg(res.maxes[k]) + ' kg'), txt('tiny', cur > 0 ? 'attuale: ' + F.kg(cur) + ' kg' : 'non ancora inserito')); }),
      h('div', { class: 'row' }, txt('small grow', 'Salva questi massimali'), chip(this.saveMaxes ? "Si'" : 'No', this.saveMaxes, () => { this.saveMaxes = !this.saveMaxes; App.refresh(); }))));
    this.warnings(b);
    b.appendChild(btn('Importa e rendi attiva', 'primary', () => this.commit(true)));
    b.appendChild(btn('Importa senza attivarla', 'secondary', () => this.commit(false)));
    b.appendChild(h('button', { class: 'btn ghost', onclick: () => { this.res = null; this.text = ''; App.refresh(); } }, 'Annulla'));
    return b;
  }
  warnings(b) {
    if (!this.res.warnings.length) return;
    b.appendChild(card(h('div', { class: 'bold', style: 'color:var(--warn)' }, 'Da controllare'), this.res.warnings.slice(0, 8).map(w => txt('small', '• ' + w)), this.res.warnings.length > 8 ? txt('tiny', '… e altri ' + (this.res.warnings.length - 8)) : null));
  }
  addExercises() {
    let n = 0;
    this.res.newExercises.forEach(e => {
      const cur = F.exercise(D, e.name);
      if (!cur) D.exercises.push(e);
      else { if (e.group && e.group !== 'Altro') cur.group = e.group; if (e.equip) cur.equip = e.equip; if (e.note) cur.note = e.note; }
      n++;
    });
    return n;
  }
  commit(activate) {
    const p = this.res.program;
    this.addExercises();
    if (this.saveMaxes) Object.keys(this.res.maxes).forEach(k => {
      const def = F.exercise(D, k), name = def ? def.name : k, v = this.res.maxes[k];
      if (Math.abs(F.currentMax(D, name) - v) < 0.01) return;
      D.maxes.push({ ex: name, kg: v, date: Date.now(), source: 'importato' });
    });
    D.programs.push(p);
    if (activate || D.programs.length === 1) D.activeId = p.id;
    save(); toast('Scheda "' + p.name + '" importata'); App.closeAndHome(1);
  }
}

// ============================================================ PROGRESSI
function chartEl(pts, bars) {
  const W = 320, H = 150, top = 26, bottom = H - 20, left = 4, right = W - 4;
  const svgNS = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(svgNS, 'svg');
  s.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s.setAttribute('class', 'chart'); s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Grafico dei progressi');
  const draw = sel => {
    let o = '';
    for (let i = 0; i < 3; i++) { const y = top + (bottom - top) * i / 2; o += '<line x1="' + left + '" x2="' + right + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)"/>'; }
    if (!pts.length) { o += '<text x="' + W / 2 + '" y="' + (top + bottom) / 2 + '" text-anchor="middle" fill="var(--muted)" font-size="11">Ancora nessun dato: completa qualche serie</text>'; s.innerHTML = o; return; }
    let min = Math.min.apply(null, pts.map(p => p.v)), max = Math.max.apply(null, pts.map(p => p.v));
    if (bars) min = 0;
    let pad = (max - min) * 0.15; if (!pad) pad = Math.max(1, max * 0.1);
    if (!bars) min -= pad; max += pad;
    const n = pts.length, xs = [], ys = [];
    pts.forEach((p, i) => { xs.push(n === 1 ? (left + right) / 2 : left + (right - left) * i / (n - 1)); ys.push(bottom - (p.v - min) / (max - min) * (bottom - top)); });
    if (bars) {
      const bw = Math.min(28, (right - left) / n * 0.7);
      pts.forEach((p, i) => { const x = n === 1 ? (left + right) / 2 : left + bw / 2 + (right - left - bw) * i / (n - 1); xs[i] = x; o += '<rect x="' + (x - bw / 2) + '" y="' + ys[i] + '" width="' + bw + '" height="' + (bottom - ys[i]) + '" rx="3" fill="' + (i === sel ? 'var(--accent)' : 'var(--surface2)') + '"/>'; });
    } else {
      const d = xs.map((x, i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + ys[i].toFixed(1)).join(' ');
      o += '<path d="' + d + ' L' + xs[n - 1] + ' ' + bottom + ' L' + xs[0] + ' ' + bottom + 'Z" fill="var(--accent)" fill-opacity=".14"/>';
      o += '<path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      let best = 0;
      pts.forEach((p, i) => { if (i > 0 && p.v > best + 0.01) o += '<circle cx="' + xs[i] + '" cy="' + ys[i] + '" r="3.5" fill="var(--record)"/>'; best = Math.max(best, p.v); });
      o += '<circle cx="' + xs[sel] + '" cy="' + ys[sel] + '" r="5" fill="var(--accent)"/>';
    }
    const lab = F.kg(Math.round(pts[sel].v * 10) / 10) + ' kg · ' + F.dm(pts[sel].ts);
    const tx = Math.max(left + 40, Math.min(right - 40, xs[sel]));
    o += '<text x="' + tx + '" y="14" text-anchor="middle" fill="var(--text)" font-size="12" font-weight="700">' + lab + '</text>';
    o += '<text x="' + left + '" y="' + (H - 4) + '" fill="var(--muted)" font-size="10">' + F.dm(pts[0].ts) + '</text>';
    if (n > 1) o += '<text x="' + right + '" y="' + (H - 4) + '" text-anchor="end" fill="var(--muted)" font-size="10">' + F.dm(pts[n - 1].ts) + '</text>';
    s.innerHTML = o;
    s._xs = xs;
  };
  let sel = Math.max(0, pts.length - 1);
  draw(sel);
  const pick = ev => {
    if (!pts.length || !s._xs) return;
    const r = s.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W;
    let best = 0; s._xs.forEach((xx, i) => { if (Math.abs(xx - x) < Math.abs(s._xs[best] - x)) best = i; });
    if (best !== sel) { sel = best; draw(sel); }
  };
  s.addEventListener('pointerdown', pick); s.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') pick(e); });
  return s;
}

class ProgressScreen {
  constructor() { this.root = true; this.ex = null; this.metric = 0; this.month = new Date(); this.month.setDate(1); }
  choices() {
    const out = [];
    const addU = s => { if (!out.some(x => F.same(x, s))) out.push(s); };
    F.mostUsed(D).forEach(addU);
    F.currentMaxes(D).forEach(m => addU(m[0]));
    const p = F.active(D);
    if (p) p.weeks.forEach(w => w.days.forEach(dd => dd.exs.forEach(e => addU(e.name))));
    return out;
  }
  render() {
    const b = page(this, 'Progressi', null, [ibtn('ai', 'Resoconto per Claude', () => this.report())]);
    const ch = this.choices();
    if (!ch.length) b.appendChild(emptyCard('chart', 'Ancora nessun dato', 'Importa una scheda e completa il primo allenamento: qui vedrai massimale stimato, carichi, volume e record.'));
    else {
      if (!this.ex || !ch.some(x => F.same(x, this.ex))) this.ex = ch[0];
      let top = ch.slice(0, 3);
      if (!top.some(x => F.same(x, this.ex))) { top.pop(); top.push(this.ex); }
      const seg = h('div', { class: 'seg' }, top.map(x => h('button', { class: F.same(x, this.ex) ? 'on' : '', onclick: () => { this.ex = x; App.refresh(); } }, x.length > 14 ? x.split(' ')[0] : x)));
      if (ch.length > 3) seg.appendChild(h('button', { style: 'flex:none;width:44px', 'aria-label': 'Altri esercizi', onclick: () => choose('Esercizio', ch, i => { this.ex = ch[i]; App.refresh(); }) }, '···'));
      b.appendChild(seg);
      const pts = F.series(D, this.ex, this.metric);
      const last = pts.length ? pts[pts.length - 1].v : (this.metric === 0 ? F.currentMax(D, this.ex) : 0);
      const c = card(txt('over', ['1RM stimato', 'Carico massimo', 'Volume per allenamento'][this.metric]));
      const vr = h('div', { class: 'row', style: 'align-items:flex-end;gap:8px' },
        h('div', { class: 'num', style: 'font-size:52px;line-height:.9' }, last <= 0 ? '—' : this.metric === 2 ? F.big(last) : F.kg(Math.round(last * 2) / 2)), h('div', { class: 'num', style: 'font-size:22px;color:var(--muted)' }, 'kg'), h('div', { class: 'grow' }));
      if (pts.length > 1) {
        const diff = pts[pts.length - 1].v - pts[0].v, weeks = Math.max(1, Math.round((pts[pts.length - 1].ts - pts[0].ts) / (7 * 86400000)));
        vr.appendChild(h('div', { class: 'bold', style: 'font-size:13px;padding-bottom:6px;color:' + (diff >= 0 ? 'var(--accentText)' : 'var(--warn)') }, (diff >= 0 ? '+' : '−') + (this.metric === 2 ? F.big(Math.abs(diff)) : F.kg(Math.abs(Math.round(diff * 2) / 2))) + ' kg in ' + weeks + ' sett.'));
      } else if (!pts.length && this.metric === 0 && last > 0) vr.appendChild(txt('tiny', 'massimale registrato'));
      c.appendChild(vr);
      c.appendChild(chartEl(pts, this.metric === 2 || D.settings.theme === 'B'));
      c.appendChild(h('div', { class: 'row', style: 'gap:6px' }, ['1RM', 'Carico', 'Volume'].map((m, i) => h('button', { class: 'grow', style: 'min-height:36px;font-size:12px;' + (this.metric === i ? 'color:var(--accentText);font-weight:700' : 'color:var(--muted)'), onclick: () => { this.metric = i; App.refresh(); } }, m))));
      c.appendChild(h('button', { class: 'btn ghost', style: 'color:var(--accentText);min-height:36px', onclick: () => App.show(new ExerciseScreen(this.ex)) }, 'Dettagli e storico di ' + this.ex));
      b.appendChild(c);
    }
    const p = F.active(D), now = Date.now();
    let cons;
    if (p) {
      const doneP = D.sessions.filter(s => s.program === p.id && s.done && !s.ignored).length, n = F.next(D, p);
      let planned = p ? F.totalDays(p) : 0;
      if (n) { planned = 0; for (let w = 0; w < n[0]; w++) planned += p.weeks[w].days.length; planned += n[1]; }
      cons = statCard('Costanza', doneP + '/' + Math.max(planned, doneP) + ' allen.');
    } else cons = statCard('Settimane di fila', String(F.streakWeeks(D)));
    b.appendChild(h('div', { class: 'grid2' }, statCard('Volume sett.', F.big(F.weekVolume(D, now)) + ' kg'), cons));
    const prs = D.logs.filter(l => l.pr).sort((a, b2) => b2.ts - a.ts);
    const rc = card(h('div', { class: 'row' }, txt('h2 grow', 'Record recenti'), prs.length > 3 ? h('button', { class: 'tiny bold', style: 'padding:8px 0 8px 8px', onclick: () => sheet('Tutti i record', h('div', { class: 'col' }, prs.map(l => recordRow(l, false)))) }, 'Vedi tutti') : null));
    if (!prs.length) rc.appendChild(txt('small', 'Nessun record ancora: arriveranno con i primi allenamenti.'));
    prs.slice(0, 3).forEach((l, i) => rc.appendChild(recordRow(l, i === 0)));
    b.appendChild(rc);
    b.appendChild(this.calendar());
    b.appendChild(item('ai', 'Resoconto per Claude', 'Manda i tuoi dati a Claude per la scheda successiva', () => this.report()));
    return b;
  }
  calendar() {
    const m = this.month, y = m.getFullYear(), mo = m.getMonth();
    const days = new Set(D.sessions.filter(s => s.done).map(s => F.dayKey(s.start)));
    const inMonth = D.sessions.filter(s => s.done && new Date(s.start).getFullYear() === y && new Date(s.start).getMonth() === mo).length;
    const grid = h('div', { class: 'cal' }, ['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(x => h('div', { class: 'dw' }, x)));
    const offset = (new Date(y, mo, 1).getDay() + 6) % 7, len = new Date(y, mo + 1, 0).getDate();
    const todayK = F.dayKey(Date.now());
    for (let i = 0; i < offset; i++) grid.appendChild(h('div'));
    for (let d = 1; d <= len; d++) {
      const k = y * 10000 + (mo + 1) * 100 + d;
      grid.appendChild(h('div', { class: 'd' + (days.has(k) ? ' on' : '') + (k === todayK ? ' today' : '') + (k > todayK ? ' fut' : '') }, String(d)));
    }
    const streak = F.streakWeeks(D);
    return card(h('div', { class: 'row' }, ibtn('back', 'Mese precedente', () => { this.month = new Date(y, mo - 1, 1); App.refresh(); }, 'alt'),
      h('div', { class: 'h2 grow center' }, m.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })),
      ibtn('next', 'Mese successivo', () => { this.month = new Date(y, mo + 1, 1); App.refresh(); }, 'alt')), grid,
      txt('small', inMonth + (inMonth === 1 ? ' allenamento' : ' allenamenti') + ' nel mese · ' + streak + (streak === 1 ? ' settimana' : ' settimane') + ' di fila'));
  }
  report() {
    const p = F.active(D);
    if (!p) { toast('Nessuna scheda attiva'); return; }
    const r = F.report(D, p);
    choose('Resoconto per Claude', ['Condividi (es. nella app di Claude)', 'Copia negli appunti', 'Salva in un file'], i => {
      if (i === 0) shareText('Resoconto Forge', r); else if (i === 1) copyText('Resoconto', r); else saveFile('resoconto_' + fileName(p.name) + '.txt', 'text/plain', r);
    });
  }
}

// ============================================================ ESERCIZI
class ExercisesScreen {
  constructor() { this.root = true; this.q = ''; this.group = ''; }
  render() {
    const b = page(this, 'Esercizi', D.exercises.length + ' nella libreria', [ibtn('plus', 'Nuovo esercizio', () => editExercise(null, () => App.refresh()), 'acc')]);
    const q = input(this.q, 'Cerca un esercizio o un muscolo');
    b.appendChild(q);
    const groups = F.GROUPS.filter(g => D.exercises.some(e => e.group === g));
    D.exercises.forEach(e => { if (!groups.includes(e.group)) groups.push(e.group); });
    b.appendChild(hscroll(chip('Tutti', !this.group, () => { this.group = ''; App.refresh(); }), groups.map(g => chip(g, g === this.group, () => { this.group = g; App.refresh(); }))));
    b.appendChild(btn('Importa da Claude', 'outline', () => App.show(new ImportScreen('')), 'import'));
    const list = h('div', { class: 'col' });
    b.appendChild(list);
    const fill = () => {
      list.innerHTML = '';
      const k = F.norm(this.q);
      const res = D.exercises.filter(e => (!this.group || e.group === this.group) && (!k || [e.name, e.group, e.aliases, e.equip].some(x => F.norm(x).includes(k))))
        .sort((a, b2) => a.group.localeCompare(b2.group) || a.name.localeCompare(b2.name));
      if (!res.length) { list.appendChild(txt('small', 'Nessun esercizio trovato. Tocca + per aggiungerlo.')); return; }
      let lastG = null;
      res.forEach(e => {
        if (!this.group && e.group !== lastG) { lastG = e.group; list.appendChild(h('div', { class: 'over', style: 'padding:8px 4px 0' }, e.group)); }
        const n = D.logs.filter(l => !l.warmup && F.same(l.ex, e.name)).length, mx = F.currentMax(D, e.name);
        const sub = [e.equip, e.custom ? 'aggiunto da te' : '', n ? n + ' serie fatte' : '', mx > 0 ? '1RM ' + F.kg(mx) : ''].filter(Boolean).join(' · ');
        list.appendChild(item(null, e.name, sub, () => App.show(new ExerciseScreen(e.name))));
      });
    };
    fill();
    q.addEventListener('input', () => { this.q = q.value; fill(); });
    return b;
  }
}

class ExerciseScreen {
  constructor(name) { this.name = name; this.metric = 0; }
  render() {
    const e = F.exercise(D, this.name);
    const b = page(this, e ? e.name : this.name, e ? e.group + (e.equip ? ' · ' + e.equip : '') : 'Esercizio', [ibtn('more', 'Opzioni', () => this.menu(e))]);
    if (e && e.note) b.appendChild(card(txt('over', 'Esecuzione'), txt('', e.note)));
    const me = F.currentMaxEntry(D, this.name), best = F.bestE1rm(D, this.name, 0, null);
    b.appendChild(card(h('div', { class: 'grid2' },
      h('div', null, txt('over', 'Massimale (1RM)'), h('div', { class: 'num', style: 'font-size:32px' }, me ? F.kg(me.kg) + ' kg' : '—'), me ? txt('tiny', me.source + ' · ' + F.dm(me.date)) : null),
      h('div', null, txt('over', 'Miglior stimato'), h('div', { class: 'num accent', style: 'font-size:32px' }, best > 0 ? F.kg(Math.round(best * 2) / 2) + ' kg' : '—'))),
      h('div', { class: 'row' }, btn(me ? 'Aggiorna' : 'Inserisci il massimale', 'secondary', () => editMax(this.name, () => App.refresh())), me ? ibtn('trash', 'Elimina il massimale', () => deleteMax(this.name, () => App.refresh()), 'alt') : null)));
    const seg = h('div', { class: 'row', style: 'gap:6px' }, ['1RM stimato', 'Carico max', 'Volume'].map((m, i) => chip(m, this.metric === i, () => { this.metric = i; App.refresh(); })));
    seg.querySelectorAll('.chip').forEach(c => { c.style.flex = '1'; });
    b.appendChild(card(seg, chartEl(F.series(D, this.name, this.metric), this.metric === 2)));
    const repsCols = [1, 3, 5, 8, 10, 12], bestAt = {};
    repsCols.forEach(r => { bestAt[r] = 0; });
    const mine = D.logs.filter(l => !l.warmup && F.same(l.ex, this.name));
    mine.forEach(l => repsCols.forEach(r => { if (l.reps >= r && l.kg > bestAt[r]) bestAt[r] = l.kg; }));
    if (repsCols.some(r => bestAt[r] > 0)) b.appendChild(card(txt('h2', 'Migliori carichi'), h('div', { class: 'row' }, repsCols.map(r => h('div', { class: 'grow center' }, h('div', { class: 'num', style: 'font-size:18px' }, bestAt[r] > 0 ? F.kg(bestAt[r]) : '—'), txt('tiny', r + ' rip'))))));
    const bySes = new Map();
    mine.slice().sort((x, y) => y.ts - x.ts).forEach(l => { if (!bySes.has(l.session)) bySes.set(l.session, []); bySes.get(l.session).push(l); });
    if (bySes.size) {
      const hc = card(txt('h2', 'Storico'));
      let n = 0;
      bySes.forEach((ls, sid) => {
        if (n++ >= 15) return;
        ls.sort((x, y) => x.setIdx - y.setIdx);
        const s = F.session(D, sid);
        hc.appendChild(h('div', null, txt('bold', F.dm(ls[0].ts) + (s && s.dayName ? ' · ' + s.dayName : '')), txt('tiny', ls.map(l => (l.sec > 0 && !l.reps ? l.sec + 's' : F.kg(l.kg) + '×' + l.reps) + (l.rpe > 0 ? ' @' + F.kg(l.rpe) : '')).join(', ') + ' · vol ' + F.big(F.volume(ls)) + ' kg')));
      });
      if (bySes.size > 15) hc.appendChild(txt('tiny', '… e altri ' + (bySes.size - 15) + ' allenamenti'));
      b.appendChild(hc);
    } else b.appendChild(txt('small', 'Nessuna serie registrata per questo esercizio.'));
    return b;
  }
  menu(e) {
    const hasMax = F.currentMax(D, this.name) > 0;
    if (!e) {
      const items = ['Aggiungi alla libreria'].concat(hasMax ? ['Elimina il massimale'] : []);
      choose(this.name, items, i => {
        if (i === 0) { const ne = { name: this.name, group: 'Altro', equip: '', note: '', aliases: '', custom: true, timed: false }; D.exercises.push(ne); save(); editExercise(ne, () => App.refresh()); }
        else deleteMax(this.name, () => App.refresh());
      });
      return;
    }
    choose(e.name, ['Modifica nome, gruppo e note', 'Calcola il massimale da una serie', hasMax ? 'Elimina il massimale' : 'Inserisci il massimale', "Elimina l'esercizio dalla libreria"], i => {
      if (i === 0) editExercise(e, () => App.replace(new ExerciseScreen(e.name)));
      else if (i === 1) oneRmTool();
      else if (i === 2) { if (hasMax) deleteMax(this.name, () => App.refresh()); else editMax(this.name, () => App.refresh()); }
      else confirmBox('Eliminare ' + e.name + ' dalla libreria?', "Lo storico delle serie resta; nelle schede in cui e' usato rimane.", 'Elimina', () => { D.exercises.splice(D.exercises.indexOf(e), 1); save(); App.back(); });
    });
  }
}

// ============================================================ ALTRO
class MoreScreen {
  constructor() { this.root = true; }
  render() {
    const b = page(this, 'Altro', null);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (!standalone) b.appendChild(item('phone', "Installa l'app sul telefono", "Aggiungila alla schermata Home: si apre a schermo intero e funziona offline", () => App.show(new InstallScreen())));
    ap(b, txt('over', 'Allenamento'),
      item('trophy', 'Massimali', '1RM di ogni esercizio, usati per calcolare i kg dalle %', () => App.show(new MaxScreen())),
      item('plates', 'Calcolatore dischi', 'Quali dischi mettere per lato', () => platesTool(0)),
      item('chart', 'Calcola il massimale', 'Da una serie pesante (peso × ripetizioni)', () => oneRmTool()),
      txt('over', 'Claude'),
      item('ai', 'Istruzioni per Claude', 'Cosa scrivere a Claude per avere una scheda da importare', () => App.show(new GuideScreen())),
      item('import', 'Importa scheda o esercizi', 'Incolla la risposta di Claude o apri un file', () => App.show(new ImportScreen(''))),
      txt('over', 'Dati'),
      item('backup', 'Backup e ripristino', 'Salva tutto in un file per cambiare telefono', () => App.show(new BackupScreen())),
      item('gear', 'Impostazioni', 'Tema grafico, pesi, timer, riscaldamento', () => App.show(new SettingsScreen())),
      item('info', 'Informazioni', 'Forge Web ' + VERSION, () => App.show(new InfoScreen())));
    return b;
  }
}

class InstallScreen {
  render() {
    const b = page(this, 'Installa Forge', 'Sul telefono');
    const steps = [
      ['iPhone', ['Apri questa pagina con Safari (non con altri browser).', 'Tocca il pulsante Condividi (il quadrato con la freccia in su).', 'Scorri e tocca "Aggiungi alla schermata Home", poi "Aggiungi".', "Da ora apri Forge dall'icona: si apre a schermo intero e funziona anche senza internet."]],
      ['Android', ['Apri questa pagina con Chrome.', 'Tocca i tre puntini in alto a destra.', 'Tocca "Installa app" oppure "Aggiungi a schermata Home".']]
    ];
    steps.forEach(s => b.appendChild(card(txt('h2', s[0]), s[1].map((x, i) => h('div', { class: 'row top' }, h('div', { class: 'num accent', style: 'font-size:18px;min-width:16px' }, String(i + 1)), txt('small grow', x))))));
    b.appendChild(card(txt('h2', 'Da sapere'), txt('small', "I dati restano solo su questo telefono: fai ogni tanto un backup (Altro › Backup). Su iPhone il timer suona solo con l'app aperta: durante l'allenamento lo schermo resta acceso.")));
    return b;
  }
}

class GuideScreen {
  render() {
    const b = page(this, 'Istruzioni per Claude', "Scheda creata dall'AI");
    const steps = ['Tocca "Copia le istruzioni": contengono il formato, i tuoi massimali e gli esercizi della tua libreria.', 'Apri Claude, incolla e completa la riga COSA VOGLIO (obiettivo, giorni, settimane, attrezzatura, dolori).', 'Copia tutta la risposta di Claude (anche con il testo intorno).', 'In Forge vai su Scheda › Importa › Incolla: controlli l\'anteprima e la carichi.', 'A fine scheda: Progressi › Resoconto per Claude, e chiedi la scheda successiva.'];
    b.appendChild(card(steps.map((s, i) => h('div', { class: 'row top' }, h('div', { class: 'num accent', style: 'font-size:20px;min-width:16px' }, String(i + 1)), h('div', { class: 'grow' }, s)))));
    b.appendChild(btn('Copia le istruzioni', 'primary', () => copyText('Istruzioni', F.aiGuide(D))));
    b.appendChild(btn('Condividi le istruzioni', 'secondary', () => shareText('Istruzioni Forge', F.aiGuide(D))));
    b.appendChild(txt('over', 'Anteprima del testo'));
    b.appendChild(card(h('pre', { class: 'guide' }, F.aiGuide(D))));
    return b;
  }
}

class BackupScreen {
  render() {
    const b = page(this, 'Backup e ripristino', 'Nessun account, nessun cloud');
    b.appendChild(txt('small', 'Tutti i dati stanno solo su questo telefono. Con il backup li salvi in un file (File, iCloud Drive, Drive, WhatsApp…). Il backup e\' compatibile con Forge per Android.'));
    b.appendChild(card(txt('h2', 'Salva backup'), txt('tiny', D.programs.length + ' schede · ' + D.sessions.length + ' allenamenti · ' + D.logs.length + ' serie · ' + D.maxes.length + ' massimali'),
      btn('Salva in un file', 'primary', () => saveFile('forge_backup_' + new Date().toISOString().slice(0, 10) + '.json', 'application/json', JSON.stringify(F.dataToJson(D))))));
    b.appendChild(card(txt('h2', 'Ripristina'), h('div', { class: 'small', style: 'color:var(--warn)' }, 'Attenzione: il ripristino sostituisce tutti i dati attuali con quelli del file.'),
      btn('Scegli il file di backup', 'secondary', () => openFile(text => {
        let o;
        try { o = JSON.parse(F.extractJson(text)); } catch (e) { toast('File non valido'); return; }
        if (o.formato !== 'forge-backup') { toast("Non e' un backup di Forge (per le schede usa Importa)"); return; }
        const nd = F.dataFrom(o);
        confirmBox('Ripristinare il backup?', nd.programs.length + ' schede, ' + nd.sessions.length + ' allenamenti, ' + nd.logs.length + ' serie. I dati attuali verranno sostituiti.', 'Ripristina', () => {
          D = nd;
          if (!D.exercises.length) D.exercises = F.defaultExercises();
          save(); Timer.stop(); toast('Backup ripristinato');
          App.stacks = [[new TodayScreen()], [new ProgramScreen()], [new ProgressScreen()], [new ExercisesScreen()], [new MoreScreen()]];
          App.tab = 0; App.render(true);
        });
      }))));
    return b;
  }
}

class InfoScreen {
  render() {
    const b = page(this, 'Forge', 'Informazioni');
    b.appendChild(card(txt('', 'Forge — build your strength, week by week.'), txt('small', "Schede di allenamento con progressioni settimanali, create a mano o da Claude. Funziona offline: nessun account, nessun abbonamento, nessuna pubblicita'. I dati restano sul telefono."),
      txt('small', "Massimale stimato: formula di Epley (o Brzycki nelle impostazioni), con le ripetizioni in riserva indicate dall'RPE."), txt('tiny', 'Versione web ' + VERSION)));
    return b;
  }
}

class MaxScreen {
  render() {
    const b = page(this, 'Massimali', '1RM', [ibtn('plus', 'Nuovo massimale', () => pickExercise('Massimale di…', n => editMax(n, () => App.refresh())), 'acc')]);
    b.appendChild(txt('small', "Servono per trasformare le % della scheda in kg. Se nelle impostazioni e' attivo, si aggiornano da soli quando una serie li supera."));
    const cur = F.currentMaxes(D);
    if (!cur.length) {
      b.appendChild(emptyCard('trophy', 'Nessun massimale', 'Inseriscili per i principali esercizi. Se non li conosci, calcolali da una serie pesante.',
        btn('Inserisci un massimale', 'primary', () => pickExercise('Massimale di…', n => editMax(n, () => App.refresh()))), btn('Calcola da una serie', 'secondary', () => oneRmTool())));
      return b;
    }
    cur.forEach(m => {
      const me = F.currentMaxEntry(D, m[0]);
      const hist = D.maxes.filter(x => F.same(x.ex, m[0])).sort((a, c) => a.date - c.date);
      let prev = '';
      if (hist.length > 1) { const diff = me.kg - hist[hist.length - 2].kg; prev = ' · ' + (diff >= 0 ? '+' : '−') + F.kg(Math.abs(diff)) + ' kg'; }
      b.appendChild(h('div', { class: 'item tap', onclick: () => editMax(m[0], () => App.refresh()) },
        h('div', { class: 'grow' }, txt('bold', m[0]), txt('tiny', me.source + ' · ' + F.dm(me.date) + prev)),
        h('div', { class: 'num', style: 'font-size:26px' }, F.kg(m[1])), txt('tiny', 'kg'),
        h('button', { class: 'ibtn alt', 'aria-label': 'Elimina il massimale di ' + m[0], onclick: ev => { ev.stopPropagation(); deleteMax(m[0], () => App.refresh()); } }, icon('trash'))));
    });
    b.appendChild(btn('Calcola un massimale da una serie', 'secondary', () => oneRmTool()));
    return b;
  }
}
function editMax(name, after) {
  const cur = F.currentMax(D, name);
  const i = input(cur > 0 ? F.kg(cur) : '', 'kg', true);
  sheet('Massimale · ' + name, h('div', { class: 'col' }, field('Massimale (1 ripetizione)', i), txt('tiny', 'Non lo conosci? Usa "Calcola il massimale" con una serie pesante da 3-8 ripetizioni.')), 'Salva', () => {
    const v = F.parse(i.value, 0);
    if (v <= 0 || v > 1000) { toast('Valore non valido'); return; }
    D.maxes.push({ ex: name, kg: v, date: Date.now(), source: 'manuale' }); save(); if (after) after();
  });
}
function deleteMax(name, after) {
  confirmBox('Eliminare il massimale di ' + name + '?', "Verra' cancellato anche lo storico dei massimali di questo esercizio. Le % della scheda non saranno calcolate in kg finche' non ne inserisci uno nuovo.", 'Elimina', () => {
    D.maxes = D.maxes.filter(m => !F.same(m.ex, name)); save(); toast('Massimale eliminato'); if (after) after();
  });
}

class SettingsScreen {
  render() {
    const s = D.settings;
    const b = page(this, 'Impostazioni', null);
    b.appendChild(txt('over', 'Tema grafico'));
    b.appendChild(h('div', { class: 'grid2' }, Object.keys(THEMES).map(id => {
      const t = THEMES[id], sel = id === s.theme;
      return h('button', { class: 'theme-card' + (sel ? ' sel' : ''), 'aria-label': 'Tema ' + t.name, onclick: () => { s.theme = id; save(); App.refresh(); } },
        themePreview(id, sel), h('div', { class: 'row' }, txt('bold grow', t.name), sel ? h('span', { class: 'accent', style: 'width:18px;height:18px;display:flex' }, icon('check')) : null), txt('tiny', t.desc));
    })));
    b.appendChild(txt('over', 'Pesi'));
    const bar = input(F.kg(s.bar), '20', true), plates = input(s.plates.replace(/,/g, ', '), '25, 20, 15…');
    b.appendChild(card(txt('bold', 'Arrotondamento dei carichi'), txt('tiny', 'I kg calcolati dalle % vengono arrotondati al passo scelto.'),
      hscroll([0.5, 1, 1.25, 2.5, 5].map(v => chip(F.kg(v) + ' kg', Math.abs(s.step - v) < 0.001, () => { s.step = v; save(); App.refresh(); }))),
      field('Peso del bilanciere (kg)', bar), field('Dischi disponibili (kg, separati da virgola)', plates),
      btn('Salva bilanciere e dischi', 'secondary', () => { const v = F.parse(bar.value, 20); s.bar = v > 0 && v < 100 ? v : 20; const pl = F.parsePlates(plates.value); if (pl.length) s.plates = pl.join(','); save(); toast('Salvato'); App.refresh(); }),
      txt('bold', 'Formula del massimale stimato'), h('div', { class: 'row', style: 'gap:6px' }, chip('Epley', s.formula !== 'brzycki', () => { s.formula = 'epley'; save(); App.refresh(); }), chip('Brzycki', s.formula === 'brzycki', () => { s.formula = 'brzycki'; save(); App.refresh(); }))));
    b.appendChild(txt('over', 'Timer di recupero'));
    b.appendChild(card(txt('bold', 'Recupero predefinito'), txt('tiny', 'Usato quando la scheda non indica il recupero.'),
      hscroll([45, 60, 90, 120, 150, 180, 240, 300].map(v => chip(F.time(v), s.rest === v, () => { s.rest = v; save(); App.refresh(); }))),
      toggle('Suono a fine recupero', '', 'sound'), toggle('Vibrazione a fine recupero', 'Solo sui telefoni che la supportano (non su iPhone)', 'vibrate'), toggle("Schermo sempre acceso durante l'allenamento", '', 'keepOn')));
    b.appendChild(txt('over', 'Allenamento'));
    b.appendChild(card(toggle('Peso suggerito intelligente', "Alza o abbassa il peso in base a ripetizioni e RPE dell'ultima volta", 'autoAdjust'),
      toggle('Serie di riscaldamento', 'Propone le serie di avvicinamento per gli esercizi con bilanciere', 'warmup'), toggle('Aggiorna i massimali da solo', 'Quando una serie (fino a 10 rip.) supera il tuo 1RM', 'autoMax')));
    return b;
  }
}
function toggle(title, sub, key) {
  const on = !!D.settings[key];
  return h('button', { class: 'row', style: 'text-align:left;min-height:48px;width:100%', role: 'switch', 'aria-checked': on ? 'true' : 'false', onclick: () => { D.settings[key] = !on; save(); App.refresh(); } },
    h('div', { class: 'grow' }, txt('', title), sub ? txt('tiny', sub) : null), h('span', { class: 'switch' + (on ? ' on' : '') }));
}
function themePreview(id, sel) {
  const t = THEMES[id], W = 100, Hh = 155, x = 14, w = 72, rr = t.r * 0.45;
  const parts = [];
  parts.push('<rect x="4" y="4" width="92" height="147" rx="12" fill="' + t.bg + '" stroke="' + (sel ? t.accent : (id === 'A' || id === 'C' ? '#000' : '#ccc')) + '" stroke-width="' + (sel ? 3 : 1.2) + '"/>');
  let y = 18;
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + w * 0.45 + '" height="3" rx="1" fill="' + t.muted + '"/>'); y += 6;
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + w * 0.8 + '" height="7" rx="1.5" fill="' + t.text + '"/>'); y += 12;
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="3" rx="2" fill="' + t.surface2 + '"/><rect x="' + x + '" y="' + y + '" width="' + w * 0.42 + '" height="3" rx="2" fill="' + t.accent + '"/>'); y += 8;
  const tb = id === 'B' ? t.text : id === 'D' ? t.surface : t.accent;
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="16" rx="' + rr + '" fill="' + tb + '"/>');
  parts.push('<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="26" height="8" rx="1" fill="' + (id === 'B' ? '#fff' : id === 'D' ? t.text : t.onAccent) + '"/>');
  if (id === 'D') parts.push('<circle cx="' + (x + w - 9) + '" cy="' + (y + 8) + '" r="5" fill="' + t.accent + '"/>');
  y += 21;
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="46" rx="' + rr + '" fill="' + t.surface + '"' + (id === 'A' || id === 'C' ? ' stroke="' + t.line + '" stroke-width=".6"' : '') + '/>');
  let ry = y + 6;
  for (let i = 0; i < 4; i++) {
    if (i === 2) parts.push('<rect x="' + (x + 3) + '" y="' + (ry - 2) + '" width="' + (w - 6) + '" height="9" rx="2" fill="' + t.surface2 + '"/>');
    parts.push('<rect x="' + (x + 7) + '" y="' + (ry + 1) + '" width="' + (w * 0.55 - 7) + '" height="3" rx="1" fill="' + (i < 2 ? t.muted : i === 2 ? t.text : t.faint) + '"/>');
    parts.push('<circle cx="' + (x + w - 9) + '" cy="' + (ry + 2.5) + '" r="2.4" fill="' + (i < 2 ? t.accent : t.faint) + '"/>');
    ry += 10;
  }
  y += 52;
  parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="12" rx="' + (id === 'B' ? 6 : rr * 0.7) + '" fill="' + t.primary + '"/><rect x="' + (x + w * 0.3) + '" y="' + (y + 5) + '" width="' + w * 0.4 + '" height="2.5" rx="1" fill="' + t.onPrimary + '"/>');
  const ny = Hh - 22;
  if (id === 'D') parts.push('<rect x="' + (x - 2) + '" y="' + ny + '" width="' + (w + 4) + '" height="11" rx="4" fill="' + t.navBg + '"/><rect x="' + (x + 1) + '" y="' + (ny + 2) + '" width="12" height="7" rx="3" fill="' + t.accent + '"/>');
  else for (let i = 0; i < 5; i++) parts.push('<circle cx="' + (x + w * i / 4) + '" cy="' + (ny + 7) + '" r="2.4" fill="' + (i === 0 ? t.accent : t.muted) + '"/>');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = parts.join('');
  return s;
}

// ============================================================ STRUMENTI
function platesTool(start) {
  const kg = input(start > 0 ? F.kg(start) : '', 'Peso totale (kg)', true), bar = input(F.kg(D.settings.bar), 'Bilanciere', true);
  const out = h('div', { class: 'col' });
  const calc = () => {
    out.innerHTML = '';
    const target = F.parse(kg.value, 0), b = F.parse(bar.value, D.settings.bar);
    if (target <= 0) { out.appendChild(txt('small', 'Scrivi il peso totale.')); return; }
    if (target < b) { out.appendChild(txt('small', "Il peso e' inferiore al bilanciere.")); return; }
    const p = F.plates(target, b, F.parsePlates(D.settings.plates));
    out.appendChild(txt('over', 'Per lato'));
    out.appendChild(h('div', { class: 'row', style: 'gap:6px;align-items:center;flex-wrap:wrap' }, p.perSide.length ? p.perSide.map(v => h('div', { class: 'num', style: 'background:var(--accent);color:var(--onAccent);border-radius:8px;padding:0 8px;display:flex;align-items:center;height:' + Math.max(36, Math.min(78, 30 + v * 2)) + 'px' }, F.kg(v))) : txt('small', 'Solo bilanciere')));
    out.appendChild(p.exact ? txt('small', 'Totale: ' + F.kg(p.achieved) + ' kg (bilanciere ' + F.kg(b) + ' + ' + F.kg((p.achieved - b) / 2) + ' per lato)') : h('div', { class: 'small bold', style: 'color:var(--warn)' }, 'Con i dischi disponibili arrivi a ' + F.kg(p.achieved) + ' kg.'));
  };
  kg.addEventListener('input', calc); bar.addEventListener('input', calc); calc();
  sheet('Calcolatore dischi', h('div', { class: 'col', style: 'gap:12px' }, field('Peso da caricare', kg), field('Bilanciere (kg)', bar), out, txt('tiny', 'Dischi disponibili: ' + D.settings.plates.replace(/,/g, ', ') + ' kg (si cambiano nelle Impostazioni).')));
}
function oneRmTool() {
  const kg = input('', 'kg', true), reps = input('', 'rip', true), rpe = input('', 'RPE', true);
  const out = h('div', { class: 'col' });
  const calc = () => {
    out.innerHTML = '';
    const k = F.parse(kg.value, 0), n = Math.round(F.parse(reps.value, 0)), e = F.e1rm(k, n, F.parse(rpe.value, 0), D.settings.formula);
    if (e <= 0) { out.appendChild(txt('small', 'Scrivi peso e ripetizioni di una serie pesante (fino a 10 ripetizioni).')); return; }
    ap(out, txt('over', '1RM stimato'), h('div', { class: 'num', style: 'font-size:36px' }, F.kg(Math.round(e * 2) / 2) + ' kg'),
      h('div', { class: 'small', style: 'white-space:pre-line' }, [95, 90, 85, 80, 75, 70, 65, 60].map(p => p + '% = ' + F.kg(F.round(e * p / 100, D.settings.step)) + ' kg').join('\n')));
    if (n > 10) out.appendChild(h('div', { class: 'small', style: 'color:var(--warn)' }, "Oltre 10 ripetizioni la stima e' poco precisa."));
  };
  [kg, reps, rpe].forEach(i => i.addEventListener('input', calc)); calc();
  sheet('Calcola il massimale', h('div', { class: 'col', style: 'gap:12px' }, h('div', { class: 'row' }, field('Peso', kg), field('Ripetizioni', reps), field('RPE', rpe)), out));
}
function pickExercise(title, cb) {
  const q = input('', 'Cerca o scrivi un esercizio nuovo');
  const list = h('div', { class: 'col', style: 'gap:0' });
  let close;
  const fill = () => {
    list.innerHTML = '';
    const k = F.norm(q.value), typed = q.value.trim();
    const res = D.exercises.filter(e => !k || [e.name, e.group, e.aliases].some(x => F.norm(x).includes(k))).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 60);
    if (typed.length > 1 && !F.exercise(D, typed)) list.appendChild(h('button', { class: 'opt', style: 'color:var(--accentText);margin-bottom:6px', onclick: () => { D.exercises.push({ name: typed, group: 'Altro', equip: '', note: '', aliases: '', custom: true, timed: false }); save(); close(); cb(typed); } }, '+ Aggiungi "' + typed + '" come nuovo esercizio'));
    res.forEach(e => list.appendChild(h('button', { style: 'text-align:left;padding:10px 4px;border-bottom:1px solid var(--line);width:100%', onclick: () => { close(); cb(e.name); } }, txt('bold', e.name), txt('tiny', e.group + (e.equip ? ' · ' + e.equip : '')))));
  };
  q.addEventListener('input', fill); fill();
  close = sheet(title, h('div', { class: 'col' }, q, list));
}
function editGroup(exName, src, cb) {
  const g = src ? F.clone(src) : Object.assign(F.SetGroup(), { sets: 3, reps: '8' });
  const sets = input(String(g.sets), '3', true), reps = input(g.reps, '8 · 8-10 · max'), pct = input(g.pct > 0 ? F.kg(g.pct) : '', 'es. 75', true), rpe = input(g.rpe > 0 ? F.kg(g.rpe) : '', 'es. 8', true),
    kg = input(g.kg > 0 ? F.kg(g.kg) : '', 'vuoto = calcolato', true), rest = input(g.rest > 0 ? F.time(g.rest) : '', 'es. 2:30'), sec = input(g.sec > 0 ? String(g.sec) : '', 'solo esercizi a tempo', true);
  const max = F.currentMax(D, exName);
  sheet(src ? 'Modifica serie' : 'Nuove serie', h('div', { class: 'col', style: 'gap:12px' }, h('div', { class: 'grid2' }, field('Serie', sets), field('Ripetizioni', reps)), h('div', { class: 'grid2' }, field('% massimale', pct), field('RPE', rpe)),
    h('div', { class: 'grid2' }, field('Peso fisso (kg)', kg), field('Recupero', rest)), field('Durata (secondi)', sec),
    txt('tiny', max > 0 ? 'Massimale di ' + exName + ': ' + F.kg(max) + ' kg' : 'Nessun massimale per ' + exName + ": la % non potra' essere calcolata finche' non lo inserisci.")), 'Salva', () => {
    g.sets = Math.max(1, Math.round(F.parse(sets.value, 1))); g.reps = reps.value.trim(); g.pct = Math.max(0, F.parse(pct.value, 0));
    const rv = F.parse(rpe.value, 0); g.rpe = rv > 10 ? 10 : Math.max(0, rv); g.kg = Math.max(0, F.parse(kg.value, 0));
    g.rest = F.restSeconds(rest.value.trim()); g.sec = Math.max(0, Math.round(F.parse(sec.value, 0)));
    if (!g.reps && !g.sec) g.reps = '8';
    cb(g);
  });
}
function editExercise(src, after) {
  const e = src || { name: '', group: 'Altro', equip: '', note: '', aliases: '', custom: true, timed: false };
  const name = input(e.name, 'Nome'), equip = input(e.equip, 'Bilanciere, Manubri, Macchina…'), note = area(e.note, 'Come si esegue, consigli…', 3);
  let group = e.group || 'Altro';
  const chips = h('div', { class: 'hscroll' });
  const draw = () => { chips.innerHTML = ''; F.GROUPS.forEach(g => chips.appendChild(chip(g, g === group, () => { group = g; draw(); }))); };
  draw();
  sheet(src ? 'Modifica esercizio' : 'Nuovo esercizio', h('div', { class: 'col', style: 'gap:12px' }, field('Nome', name), field('Gruppo muscolare', chips), field('Attrezzo', equip), field('Note', note)), 'Salva', () => {
    const n = name.value.trim();
    if (!n) { toast('Scrivi il nome'); return; }
    const other = F.exercise(D, n);
    if (other && other !== e) { toast("Esiste gia' un esercizio con questo nome"); return; }
    const old = e.name;
    e.name = n; e.group = group; e.equip = equip.value.trim(); e.note = note.value.trim();
    if (!src) D.exercises.push(e);
    else if (old && old !== n) {
      D.programs.forEach(p => p.weeks.forEach(w => w.days.forEach(dd => dd.exs.forEach(x => { if (F.same(x.name, old)) x.name = n; }))));
      D.logs.forEach(l => { if (F.same(l.ex, old)) l.ex = n; });
      D.maxes.forEach(m => { if (F.same(m.ex, old)) m.ex = n; });
    }
    save(); if (after) after();
  });
}

// ============================================================ AVVIO
const VERSION = '1.0.0';
function boot() {
  loadData();
  document.documentElement.dataset.theme = D.settings.theme;
  App.stacks = [[new TodayScreen()], [new ProgramScreen()], [new ProgressScreen()], [new ExercisesScreen()], [new MoreScreen()]];
  const live = F.session(D, D.liveSession);
  if (live && !live.done) App.stacks[0].push(new WorkoutScreen(live.id));
  App.render(true);
  history.pushState(null, '');
  setInterval(() => { const c = App.cur(); if (c && c.tick && document.visibilityState === 'visible') c.tick(); }, 500);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { const c = App.cur(); if (c instanceof WorkoutScreen) { keepAwake(D.settings.keepOn); App.refresh(); } }
    else save();
  });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.addEventListener('DOMContentLoaded', boot);
