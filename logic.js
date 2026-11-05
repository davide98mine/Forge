/* Forge Web — logica (modelli, calcoli, import/export, resoconto).
   Stessi formati della versione Android: schede e backup sono compatibili. */
(function (root) {
  'use strict';
  const F = {};

  // ------------------------------------------------------------ utilita'
  F.newId = () => Math.random().toString(16).slice(2, 8) + Date.now().toString(16).slice(-6);

  F.norm = function (s) {
    if (s == null) return '';
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  };
  F.same = (a, b) => F.norm(a) === F.norm(b);

  F.kg = function (v) {
    if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
    let s = (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
    s = s.replace(/0+$/, '').replace(/,$/, '');
    return s;
  };
  F.big = v => Math.round(v).toLocaleString('it-IT');

  F.parse = function (s, def) {
    if (s == null) return def;
    if (typeof s === 'number') return isFinite(s) ? s : def;
    const t = String(s).trim().replace(',', '.').replace(/[^0-9.\-]/g, '');
    if (!t || t === '.' || t === '-') return def;
    const v = parseFloat(t);
    return isNaN(v) ? def : v;
  };
  F.repsLow = r => { const m = String(r || '').match(/\d+/); return m ? parseInt(m[0], 10) : 0; };
  F.repsHigh = r => { const m = String(r || '').match(/\d+/g); return m ? parseInt(m[m.length - 1], 10) : 0; };
  F.isMaxReps = r => /max|amrap|cedimento/i.test(String(r || ''));
  F.time = sec => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60); };
  F.round = (kg, step) => { if (!(step > 0)) step = 2.5; return Math.round(kg / step) * step; };

  // ------------------------------------------------------------ modelli
  F.SetGroup = () => ({ sets: 1, reps: '8', pct: 0, rpe: 0, kg: 0, rest: 0, sec: 0, note: '' });
  F.Ex = () => ({ name: '', note: '', rest: 0, superset: '', tempo: '', groups: [], approach: [], approachNote: '' });
  F.Day = () => ({ name: '', note: '', exs: [], warm: [] });
  F.Week = () => ({ number: 1, deload: false, note: '', days: [] });
  F.Program = () => ({ id: F.newId(), name: 'Nuova scheda', desc: '', source: 'manuale', created: Date.now(), weeks: [] });
  F.Session = () => ({ id: F.newId(), program: '', week: 0, day: 0, dayName: '', start: Date.now(), end: 0, done: false, ignored: false, energy: 0, sleep: 0, pain: 0, note: '', exNotes: '', warmDone: '' });
  F.SetLog = () => ({ session: '', ex: '', exIdx: 0, setIdx: 0, kg: 0, reps: 0, rpe: 0, sec: 0, warmup: false, ts: Date.now(), pr: '' });
  F.Settings = () => ({ theme: 'A', step: 2.5, bar: 20, plates: '25,20,15,10,5,2.5,1.25', rest: 120, sound: true, vibrate: true, keepOn: true, autoMax: true, warmup: true, autoAdjust: true, formula: 'epley' });
  F.Data = () => ({ programs: [], sessions: [], logs: [], maxes: [], exercises: [], settings: F.Settings(), activeId: '', liveSession: '' });

  F.clone = o => JSON.parse(JSON.stringify(o));
  F.totalSets = e => e.groups.reduce((n, g) => n + Math.max(1, g.sets), 0);
  F.daysPerWeek = p => p.weeks.reduce((m, w) => Math.max(m, w.days.length), 0);
  F.totalDays = p => p.weeks.reduce((n, w) => n + w.days.length, 0);
  F.day = (p, w, d) => (p && p.weeks[w] && p.weeks[w].days[d]) || null;
  F.renumber = p => p.weeks.forEach((w, i) => { w.number = i + 1; });

  F.active = d => d.programs.find(p => p.id === d.activeId) || d.programs[0] || null;
  F.program = (d, id) => d.programs.find(p => p.id === id) || null;
  F.session = (d, id) => (id ? d.sessions.find(s => s.id === id) || null : null);
  F.exercise = function (d, name) {
    const k = F.norm(name);
    let e = d.exercises.find(x => F.norm(x.name) === k);
    if (e) return e;
    return d.exercises.find(x => x.aliases && x.aliases.split('|').some(a => F.norm(a) === k)) || null;
  };

  // ------------------------------------------------------------ JSON (stesso formato Android)
  F.groupToJson = function (g) {
    const o = { serie: g.sets, ripetizioni: g.reps };
    if (g.pct > 0) o.percentuale = g.pct;
    if (g.rpe > 0) o.rpe = g.rpe;
    if (g.kg > 0) o.peso = g.kg;
    if (g.rest > 0) o.recupero = g.rest;
    if (g.sec > 0) o.secondi = g.sec;
    if (g.note) o.nota = g.note;
    return o;
  };
  F.exToJson = function (e) {
    const o = { nome: e.name };
    if (e.rest > 0) o.recupero = e.rest;
    if (e.superset) o.superserie = e.superset;
    if (e.tempo) o.tempo = e.tempo;
    if (e.note) o.note = e.note;
    if (e.approachNote) o.noteAvvicinamento = e.approachNote;
    if (e.approach.length) o.avvicinamento = e.approach.map(x => ({ percentuale: x[0], ripetizioni: x[1] }));
    o.serie = e.groups.map(F.groupToJson);
    return o;
  };
  F.dayToJson = function (d) {
    const o = { nome: d.name };
    if (d.note) o.note = d.note;
    if (d.warm.length) o.riscaldamento = d.warm.map(w => (w.detail ? { nome: w.name, dettagli: w.detail } : { nome: w.name }));
    o.esercizi = d.exs.map(F.exToJson);
    return o;
  };
  F.weekToJson = function (w) {
    const o = { numero: w.number };
    if (w.deload) o.scarico = true;
    if (w.note) o.note = w.note;
    o.giorni = w.days.map(F.dayToJson);
    return o;
  };
  F.programExport = function (p) {
    const o = { formato: 'forge-scheda', versione: 1, nome: p.name };
    if (p.desc) o.descrizione = p.desc;
    o.settimane = p.weeks.map(F.weekToJson);
    return o;
  };
  F.programToJson = p => Object.assign(F.programExport(p), { id: p.id, origine: p.source, creata: p.created });

  F.sessionToJson = s => {
    const o = { id: s.id, p: s.program, w: s.week, d: s.day, dn: s.dayName, start: s.start, end: s.end, done: s.done, ign: s.ignored, en: s.energy, sl: s.sleep, pa: s.pain, note: s.note, exn: s.exNotes };
    if (s.warmDone) o.wd = s.warmDone;
    return o;
  };
  F.sessionFrom = o => Object.assign(F.Session(), {
    id: o.id || F.newId(), program: o.p || '', week: o.w | 0, day: o.d | 0, dayName: o.dn || '', start: +o.start || 0, end: +o.end || 0,
    done: !!o.done, ignored: !!o.ign, energy: o.en | 0, sleep: o.sl | 0, pain: o.pa | 0, note: o.note || '', exNotes: o.exn || '', warmDone: o.wd || ''
  });
  F.logToJson = l => {
    const o = { s: l.session, e: l.ex, ei: l.exIdx, si: l.setIdx, kg: l.kg, r: l.reps };
    if (l.rpe > 0) o.rpe = l.rpe;
    if (l.sec > 0) o.sec = l.sec;
    if (l.warmup) o.w = true;
    o.t = l.ts;
    if (l.pr) o.pr = l.pr;
    return o;
  };
  F.logFrom = o => Object.assign(F.SetLog(), { session: o.s || '', ex: o.e || '', exIdx: o.ei | 0, setIdx: o.si | 0, kg: +o.kg || 0, reps: o.r | 0, rpe: +o.rpe || 0, sec: o.sec | 0, warmup: !!o.w, ts: +o.t || 0, pr: o.pr || '' });
  F.maxToJson = m => ({ e: m.ex, kg: m.kg, t: m.date, src: m.source });
  F.maxFrom = o => ({ ex: o.e || '', kg: +o.kg || 0, date: +o.t || 0, source: o.src || 'manuale' });
  F.exDefToJson = e => {
    const o = { nome: e.name, gruppo: e.group, attrezzo: e.equip };
    if (e.note) o.note = e.note;
    if (e.aliases) o.alias = e.aliases;
    if (e.custom) o.custom = true;
    if (e.timed) o.aTempo = true;
    return o;
  };
  F.exDefFrom = o => ({ name: o.nome || '', group: o.gruppo || 'Altro', equip: o.attrezzo || '', note: o.note || '', aliases: o.alias || '', custom: !!o.custom, timed: !!o.aTempo });
  F.settingsFrom = function (o) {
    const s = F.Settings();
    if (!o) return s;
    for (const k of Object.keys(s)) if (o[k] !== undefined && o[k] !== null) s[k] = o[k];
    if (!(s.step > 0)) s.step = 2.5;
    return s;
  };

  F.dataToJson = d => ({
    formato: 'forge-backup', versione: 1, salvato: Date.now(),
    schede: d.programs.map(F.programToJson), allenamenti: d.sessions.map(F.sessionToJson), serie: d.logs.map(F.logToJson),
    massimali: d.maxes.map(F.maxToJson), esercizi: d.exercises.map(F.exDefToJson), impostazioni: Object.assign({}, d.settings),
    attiva: d.activeId, inCorso: d.liveSession
  });
  F.dataFrom = function (o) {
    const d = F.Data();
    (o.schede || []).forEach(po => {
      const r = F.parseProgram(po, null, false);
      if (r.program) {
        r.program.id = po.id || r.program.id;
        r.program.source = po.origine || 'manuale';
        r.program.created = po.creata || r.program.created;
        d.programs.push(r.program);
      }
    });
    d.sessions = (o.allenamenti || []).map(F.sessionFrom);
    d.logs = (o.serie || []).map(F.logFrom);
    d.maxes = (o.massimali || []).map(F.maxFrom);
    d.exercises = (o.esercizi || []).map(F.exDefFrom);
    d.settings = F.settingsFrom(o.impostazioni);
    d.activeId = o.attiva || '';
    d.liveSession = o.inCorso || '';
    return d;
  };

  // ------------------------------------------------------------ massimali e calcoli
  F.effReps = (reps, rpe) => reps + (rpe >= 6 && rpe <= 10 ? 10 - rpe : 0);
  F.e1rm = function (kg, reps, rpe, formula) {
    if (kg <= 0 || reps <= 0) return 0;
    let eff = F.effReps(reps, rpe);
    if (eff <= 1.0001) return kg;
    if (formula === 'brzycki') { if (eff >= 36) eff = 36; return kg * 36 / (37 - eff); }
    return kg * (1 + eff / 30);
  };
  F.kgFor = function (oneRm, reps, rpe, formula) {
    if (oneRm <= 0 || reps <= 0) return 0;
    let eff = F.effReps(reps, rpe);
    if (eff <= 1.0001) return oneRm;
    if (formula === 'brzycki') { if (eff >= 36) eff = 36; return oneRm * (37 - eff) / 36; }
    return oneRm / (1 + eff / 30);
  };
  F.currentMaxEntry = function (d, ex) {
    let best = null;
    d.maxes.forEach(m => { if (F.same(m.ex, ex) && (!best || m.date >= best.date)) best = m; });
    return best;
  };
  F.currentMax = (d, ex) => { const m = F.currentMaxEntry(d, ex); return m ? m.kg : 0; };
  F.bestE1rm = function (d, ex, days, excludeSession) {
    const from = days > 0 ? Date.now() - days * 86400000 : 0;
    let best = 0;
    d.logs.forEach(l => {
      if (l.warmup || l.ts < from || !F.same(l.ex, ex)) return;
      if (excludeSession && excludeSession === l.session) return;
      if (l.reps > 12) return;
      best = Math.max(best, F.e1rm(l.kg, l.reps, l.rpe, d.settings.formula));
    });
    return best;
  };
  F.lastLogs = function (d, ex, excludeSession) {
    let last = null, ts = -1;
    d.logs.forEach(l => {
      if (l.warmup || !F.same(l.ex, ex)) return;
      if (excludeSession && excludeSession === l.session) return;
      if (l.ts > ts) { ts = l.ts; last = l.session; }
    });
    if (last == null) return [];
    return d.logs.filter(l => !l.warmup && F.same(l.ex, ex) && l.session === last);
  };

  /** Serie [da, a) occupate dalla riga di serie g dentro l'esercizio e (null se g non e' di e). */
  F.groupRange = function (e, g) {
    if (!e || !g) return null;
    let c = 0;
    for (const x of e.groups) { const n = Math.max(1, x.sets); if (x === g) return [c, c + n]; c += n; }
    return null;
  };
  /** Ultime serie della stessa riga (es. solo il top set, oppure solo i back off): mai mischiate. */
  F.lastLogsFor = function (d, e, g, excludeSession) {
    const all = F.lastLogs(d, e.name, excludeSession);
    const r = F.groupRange(e, g);
    if (!r || !all.length) return all;
    if (e.groups.length === 1) return all.filter(l => l.setIdx >= r[0]);
    return all.filter(l => l.setIdx >= r[0] && l.setIdx < r[1]);
  };
  F.suggest = function (d, ex, g, excludeSession, exObj) {
    const s = d.settings;
    const sg = { kg: 0, base: 0, reason: '', last: '', delta: 0 };
    const max = F.currentMax(d, ex);
    const reps = F.repsLow(g.reps);
    const last = exObj && F.same(exObj.name, ex) ? F.lastLogsFor(d, exObj, g, excludeSession) : F.lastLogs(d, ex, excludeSession);
    let source;
    const recentE1 = F.bestE1rm(d, ex, 90, excludeSession);
    if (g.kg > 0) { sg.base = g.kg; source = 'kg'; sg.reason = 'peso indicato nella scheda'; }
    else if (g.pct > 0 && max > 0) { sg.base = F.round(max * g.pct / 100, s.step); source = 'pct'; sg.reason = F.kg(g.pct) + '% del massimale (' + F.kg(max) + ' kg)'; }
    else if (g.rpe > 0 && reps > 0 && (max > 0 || recentE1 > 0)) {
      const e1 = recentE1 > 0 ? recentE1 : max;
      sg.base = F.round(F.kgFor(e1, reps, g.rpe, s.formula), s.step); source = 'rpe';
      sg.reason = 'stimato per ' + reps + ' rip. a RPE ' + F.kg(g.rpe);
    } else if (last.length) {
      sg.base = Math.max.apply(null, last.map(l => l.kg)); source = 'last'; sg.reason = "come l'ultima volta";
    } else {
      sg.reason = (g.pct > 0 && max <= 0) ? 'inserisci il massimale per calcolare il ' + F.kg(g.pct) + '%' : 'prima volta: scegli tu il peso';
      return sg;
    }
    if (last.length) {
      let top = last[0];
      last.forEach(l => { if (l.kg > top.kg || (l.kg === top.kg && l.reps > top.reps)) top = l; });
      sg.last = 'ultima volta: ' + F.kg(top.kg) + ' × ' + top.reps + (top.rpe > 0 ? ' @' + F.kg(top.rpe) : '');
      if (s.autoAdjust) {
        let rpeSum = 0, rpeN = 0, allHigh = true, anyLow = false;
        const high = Math.max(F.repsHigh(g.reps), reps);
        last.forEach(l => {
          if (l.rpe > 0) { rpeSum += l.rpe; rpeN++; }
          if (reps > 0 && l.reps < high) allHigh = false;
          if (reps > 0 && l.reps < reps) anyLow = true;
        });
        const avg = rpeN ? rpeSum / rpeN : 0;
        if (source === 'last') {
          if (reps > 0 && allHigh && (g.rpe <= 0 || avg <= 0 || avg <= g.rpe)) { sg.delta = 1; sg.reason = 'hai chiuso tutte le ripetizioni: si sale'; }
          else if (anyLow) sg.reason = 'stesso peso: completa prima tutte le ripetizioni';
        } else if (g.rpe > 0 && avg > 0) {
          const diff = g.rpe - avg;
          if (diff >= 1.5 && !anyLow) { sg.delta = 1; sg.reason += ' · ultima volta era facile (RPE ' + F.kg(Math.round(avg * 2) / 2) + ')'; }
          else if (diff <= -1.5 || anyLow) { sg.delta = -1; sg.reason += " · ultima volta era dura: un po' meno"; }
        }
      }
    }
    if (source === 'last' || source === 'kg') sg.kg = Math.max(0, sg.base + sg.delta * s.step);
    else sg.kg = Math.max(0, F.round(sg.base + sg.delta * s.step, s.step));
    return sg;
  };

  F.checkPR = function (d, cur) {
    if (cur.warmup || cur.kg <= 0 || cur.reps <= 0) return '';
    let maxKg = 0, bestE1 = 0, repsAt = 0, any = false;
    const e1 = F.e1rm(cur.kg, cur.reps, cur.rpe, d.settings.formula);
    d.logs.forEach(l => {
      if (l === cur || l.warmup || !F.same(l.ex, cur.ex)) return;
      any = true;
      maxKg = Math.max(maxKg, l.kg);
      if (l.reps <= 12) bestE1 = Math.max(bestE1, F.e1rm(l.kg, l.reps, l.rpe, d.settings.formula));
      if (l.kg >= cur.kg) repsAt = Math.max(repsAt, l.reps);
    });
    if (!any) return '';
    if (cur.kg > maxKg + 0.001) return 'Record di carico: ' + F.kg(cur.kg) + ' kg';
    if (cur.reps <= 12 && e1 > bestE1 + 0.25) return 'Nuovo 1RM stimato: ' + F.kg(Math.round(e1 * 2) / 2) + ' kg';
    if (cur.reps > repsAt) return 'Record di ripetizioni: ' + cur.reps + ' a ' + F.kg(cur.kg) + ' kg';
    return '';
  };
  F.maybeUpdateMax = function (d, cur) {
    if (!d.settings.autoMax || cur.warmup || cur.reps <= 0 || cur.reps > 10 || cur.kg <= 0) return 0;
    const e1 = Math.round(F.e1rm(cur.kg, cur.reps, cur.rpe, d.settings.formula) * 2) / 2;
    const max = F.currentMax(d, cur.ex);
    if (max > 0 && e1 > max + 0.01) { d.maxes.push({ ex: cur.ex, kg: e1, date: cur.ts, source: 'stimato' }); return e1; }
    return 0;
  };

  F.warmup = function (work, bar, step) {
    const out = [];
    if (work <= bar * 1.5) return out;
    const scheme = [[0, 10], [0.4, 8], [0.6, 5], [0.8, 3], [0.9, 1]];
    let prev = -1;
    scheme.forEach(sc => {
      let k = sc[0] === 0 ? bar : F.round(work * sc[0], step);
      if (sc[0] >= 0.9 && work < bar * 4) return;
      if (k < bar) k = bar;
      if (k >= work - step / 2) return;
      if (Math.abs(k - prev) < 0.01) return;
      out.push([k, sc[1]]);
      prev = k;
    });
    return out;
  };
  F.parsePlates = csv => String(csv || '').split(/[,;\s]+/).map(x => F.parse(x, 0)).filter(v => v > 0).sort((a, b) => b - a);
  F.plates = function (target, bar, avail) {
    const r = { perSide: [], achieved: 0, exact: false };
    const side = Math.max(0, (target - bar) / 2);
    let left = side;
    avail.forEach(p => { while (left >= p - 1e-6) { r.perSide.push(p); left -= p; } });
    r.achieved = bar + (side - left) * 2;
    r.exact = Math.abs(left) < 1e-6;
    return r;
  };

  // ------------------------------------------------------------ posizione nella scheda
  F.isDone = (d, p, w, day) => d.sessions.some(s => s.done && !s.ignored && s.program === p.id && s.week === w && s.day === day);
  F.firstFrom = function (p, w, dd) {
    while (w < p.weeks.length) { if (dd < p.weeks[w].days.length) return [w, dd]; w++; dd = 0; }
    return null;
  };
  F.next = function (d, p) {
    if (!p || !p.weeks.length) return null;
    let lw = -1, ld = -1;
    d.sessions.forEach(s => {
      if (!s.done || s.ignored || s.program !== p.id) return;
      if (s.week > lw || (s.week === lw && s.day > ld)) { lw = s.week; ld = s.day; }
    });
    return lw < 0 ? F.firstFrom(p, 0, 0) : F.firstFrom(p, lw, ld + 1);
  };
  F.doneInWeek = (d, p, w) => (w < 0 || w >= p.weeks.length) ? 0 : p.weeks[w].days.filter((_, i) => F.isDone(d, p, w, i)).length;
  F.weekToRepeat = function (d, p, next) {
    if (!next || next[1] !== 0 || next[0] === 0) return -1;
    const prev = next[0] - 1, total = p.weeks[prev].days.length;
    if (!total) return -1;
    return F.doneInWeek(d, p, prev) / total < 0.6 ? prev : -1;
  };
  /** La stessa serie (stessa posizione) dell'ultimo allenamento con quell'esercizio. */
  F.prevSet = (d, ex, setIdx, excludeSession) => F.lastLogs(d, ex, excludeSession).find(l => l.setIdx === setIdx) || null;
  /** Confronto con la volta scorsa: dir 1 meglio, 0 uguale, -1 peggio; testo tipo "+2,5 kg · +1 rip". */
  F.compareSet = function (cur, prev, formula) {
    if (!cur || !prev) return null;
    const timed = cur.sec > 0 && !cur.reps;
    const parts = [];
    const dk = Math.round((cur.kg - prev.kg) * 100) / 100;
    if (Math.abs(dk) > 0.001) parts.push((dk > 0 ? '+' : '−') + F.kg(Math.abs(dk)) + ' kg');
    const dr = timed ? cur.sec - prev.sec : cur.reps - prev.reps;
    if (dr) parts.push((dr > 0 ? '+' : '−') + Math.abs(dr) + (timed ? ' s' : ' rip'));
    let dir;
    if (timed) dir = Math.sign(dr || dk);
    else if (cur.reps <= 12 && prev.reps <= 12 && cur.kg > 0 && prev.kg > 0) {
      const a = F.e1rm(cur.kg, cur.reps, 0, formula), b = F.e1rm(prev.kg, prev.reps, 0, formula);
      dir = Math.abs(a - b) < 0.25 ? 0 : Math.sign(a - b);
    } else dir = Math.sign(dk !== 0 ? dk : dr);
    return { dir, text: parts.length ? parts.join(' · ') : 'come la volta scorsa' };
  };
  F.setText = l => l.sec > 0 && !l.reps ? l.sec + ' s' + (l.kg > 0 ? ' · ' + F.kg(l.kg) + ' kg' : '') : F.kg(l.kg) + ' kg × ' + l.reps;
  F.remap = (old, from, to) => old === from ? to : (from < to && old > from && old <= to) ? old - 1 : (from > to && old >= to && old < from) ? old + 1 : old;
  /** Sposta un esercizio nel giorno e riallinea le serie gia' registrate di quel giorno. */
  F.moveExercise = function (d, p, w, day, from, to) {
    const dd = F.day(p, w, day);
    if (!dd || from === to || from < 0 || to < 0 || from >= dd.exs.length || to >= dd.exs.length) return;
    dd.exs.splice(to, 0, dd.exs.splice(from, 1)[0]);
    const ses = new Set(d.sessions.filter(s => s.program === p.id && s.week === w && s.day === day).map(s => s.id));
    d.logs.forEach(l => { if (ses.has(l.session)) l.exIdx = F.remap(l.exIdx, from, to); });
  };
  F.repeatWeek = (d, p, w) => d.sessions.forEach(s => { if (s.program === p.id && s.week >= w) s.ignored = true; });

  // ------------------------------------------------------------ statistiche
  F.dayKey = ts => { const t = new Date(ts); return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate(); };
  F.weekKey = function (ts) {
    const t = new Date(ts); t.setHours(0, 0, 0, 0);
    const day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day); // lunedi'
    return t.getTime();
  };
  F.streakWeeks = function (d) {
    const weeks = new Set(d.sessions.filter(s => s.done).map(s => F.weekKey(s.start)));
    let cur = F.weekKey(Date.now()), n = 0;
    if (!weeks.has(cur)) cur -= 7 * 86400000;
    while (weeks.has(cur)) { n++; cur = F.weekKey(cur - 3 * 86400000); }
    return n;
  };
  F.volume = logs => logs.reduce((v, l) => v + (l.warmup ? 0 : l.kg * l.reps), 0);
  F.weekVolume = (d, ts) => { const k = F.weekKey(ts); return d.logs.reduce((v, l) => v + (!l.warmup && F.weekKey(l.ts) === k ? l.kg * l.reps : 0), 0); };
  F.sessionsInWeek = (d, ts) => { const k = F.weekKey(ts); return d.sessions.filter(s => s.done && F.weekKey(s.start) === k).length; };
  F.logsOf = (d, sid) => d.logs.filter(l => l.session === sid);
  F.series = function (d, ex, metric) {
    const agg = new Map();
    d.logs.forEach(l => {
      if (l.warmup || !F.same(l.ex, ex)) return;
      let a = agg.get(l.session);
      if (!a) { a = { v: 0, ts: l.ts }; agg.set(l.session, a); }
      const v = metric === 0 ? (l.reps <= 12 ? F.e1rm(l.kg, l.reps, l.rpe, d.settings.formula) : 0) : metric === 1 ? l.kg : l.kg * l.reps;
      if (metric === 2) a.v += v; else a.v = Math.max(a.v, v);
      a.ts = Math.min(a.ts, l.ts);
    });
    return Array.from(agg.values()).filter(a => a.v > 0).sort((x, y) => x.ts - y.ts);
  };
  F.mostUsed = function (d) {
    const c = new Map(), disp = new Map();
    d.logs.forEach(l => { if (l.warmup) return; const k = F.norm(l.ex); c.set(k, (c.get(k) || 0) + 1); disp.set(k, l.ex); });
    return Array.from(c.keys()).sort((a, b) => c.get(b) - c.get(a)).map(k => disp.get(k));
  };
  F.restFor = (s, e, g) => (g && g.rest > 0) ? g.rest : (e && e.rest > 0) ? e.rest : s.rest;
  F.groupOf = function (e, k) {
    let c = 0;
    for (const g of e.groups) { c += Math.max(1, g.sets); if (k < c) return g; }
    return e.groups.length ? e.groups[e.groups.length - 1] : F.SetGroup();
  };

  // ------------------------------------------------------------ import (tollerante)
  F.extractJson = function (text) {
    if (text == null) return '';
    let t = String(text).trim();
    const fence = t.indexOf('```');
    if (fence >= 0) {
      const nl = t.indexOf('\n', fence);
      const end = t.indexOf('```', nl > 0 ? nl : fence + 3);
      if (nl > 0 && end > nl) t = t.substring(nl + 1, end).trim();
    }
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.substring(a, b + 1);
    return t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  };
  function get(o, ...keys) {
    for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
    for (const k of Object.keys(o)) for (const w of keys) if (F.norm(k) === F.norm(w) && o[k] !== null) return o[k];
    return undefined;
  }
  function str(o, def, ...keys) { const v = get(o, ...keys); if (v === undefined || typeof v === 'object') return def; const s = String(v).trim(); return s || def; }
  function dbl(o, def, ...keys) { const v = get(o, ...keys); if (v === undefined) return def; return typeof v === 'number' ? v : F.parse(String(v), def); }
  function bool(o, ...keys) { const v = get(o, ...keys); if (v === undefined) return false; if (typeof v === 'boolean') return v; return /^(true|si|sì|yes|1)$/i.test(String(v)); }
  function arr(o, ...keys) { const v = get(o, ...keys); return Array.isArray(v) ? v : null; }
  F.restSeconds = function (v) {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return Math.round(v < 15 ? v * 60 : v);
    const s = String(v).trim().toLowerCase().replace(',', '.');
    if (!s) return 0;
    const m = s.match(/(\d+)\s*[:']\s*(\d{1,2})/);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    const n = F.parse(s, 0);
    if (s.includes('min') || s.endsWith("'") || s.endsWith('m')) return Math.round(n * 60);
    if (s.includes('s')) return Math.round(n);
    return Math.round(n < 15 ? n * 60 : n);
  };
  function secondsOnly(v) {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return Math.round(v);
    let s = String(v).trim();
    if (!s) return 0;
    if (!/[a-zA-Z:'"]/.test(s)) s += 's';
    return F.restSeconds(s);
  }
  function repsText(v) {
    if (v === undefined || v === null) return '';
    if (typeof v === 'number') return String(Math.round(v));
    return String(v).trim().replace(/[–—]/g, '-').replace(/\s*-\s*/g, '-');
  }

  F.importText = function (text, data) {
    const r = { program: null, errors: [], warnings: [], newExercises: [], maxes: {}, exercisesOnly: false };
    const json = F.extractJson(text);
    if (!json) { r.errors.push('Non ho trovato nessun testo da importare.'); return r; }
    let root;
    try {
      const v = JSON.parse(json);
      if (Array.isArray(v)) root = { settimane: v };
      else if (v && typeof v === 'object') root = v;
      else { r.errors.push('Il testo non contiene una scheda valida.'); return r; }
    } catch (e) {
      r.errors.push("Il formato non e' valido (" + String(e.message).replace(/^JSON\.parse: /, '') + "). Controlla di aver copiato tutto il testo, dalla prima { all'ultima }.");
      return r;
    }
    let ne = arr(root, 'nuoviEsercizi', 'nuovi_esercizi', 'eserciziNuovi', 'newExercises', 'libreria');
    const hasWeeks = arr(root, 'settimane', 'weeks', 'settimana') !== null;
    if (!ne && !hasWeeks) ne = arr(root, 'esercizi', 'exercises');
    const declared = new Map();
    (ne || []).forEach(it => {
      const e = { name: '', group: 'Altro', equip: '', note: '', aliases: '', custom: true, timed: false };
      if (it && typeof it === 'object') {
        e.name = str(it, '', 'nome', 'name', 'esercizio');
        e.group = str(it, 'Altro', 'gruppo', 'muscolo', 'group', 'muscle', 'categoria');
        e.equip = str(it, '', 'attrezzo', 'attrezzatura', 'equipment');
        e.note = str(it, '', 'note', 'descrizione', 'esecuzione', 'notes');
        e.timed = bool(it, 'aTempo', 'a_tempo', 'timed');
      } else if (it != null) e.name = String(it).trim();
      if (!e.name) { r.warnings.push("Un esercizio senza nome e' stato ignorato."); return; }
      declared.set(F.norm(e.name), e);
    });
    if (!hasWeeks) {
      if (!declared.size) { r.errors.push("Non trovo ne' le settimane della scheda ne' un elenco di esercizi."); return r; }
      r.exercisesOnly = true;
      declared.forEach(e => {
        if (data && F.exercise(data, e.name)) r.warnings.push('"' + e.name + "\" c'e' gia' nella libreria: verra' aggiornato.");
        r.newExercises.push(e);
      });
      return r;
    }
    const mx = get(root, 'massimali', 'maxes', '1rm', 'massimale');
    if (mx && !Array.isArray(mx) && typeof mx === 'object') {
      Object.keys(mx).forEach(k => { const v = F.parse(String(mx[k]), 0); if (v > 0) r.maxes[k] = v; });
    } else if (Array.isArray(mx)) {
      mx.forEach(o => { if (!o || typeof o !== 'object') return; const n = str(o, '', 'nome', 'esercizio', 'name'); const v = dbl(o, 0, 'kg', 'peso', 'valore', '1rm'); if (n && v > 0) r.maxes[n] = v; });
    }
    const pr = F.parseProgram(root, data, true);
    r.program = pr.program;
    r.errors.push(...pr.errors);
    r.warnings.push(...pr.warnings);
    if (!r.program) return r;
    r.program.source = 'importata';
    const news = new Map(), pctNoMax = new Map();
    r.program.weeks.forEach(w => w.days.forEach(dd => dd.exs.forEach(e => {
      const k = F.norm(e.name);
      const lib = data ? F.exercise(data, e.name) : null;
      if (lib) e.name = lib.name;
      else if (!news.has(k)) news.set(k, declared.get(k) || { name: e.name, group: 'Altro', equip: '', note: '', aliases: '', custom: true, timed: false });
      e.groups.forEach(g => {
        if (g.pct > 0 && g.kg <= 0) {
          let has = !!(data && F.currentMax(data, e.name) > 0);
          Object.keys(r.maxes).forEach(mk => {
            if (F.same(mk, e.name)) has = true;
            const md = data ? F.exercise(data, mk) : null;
            if (md && F.same(md.name, e.name)) has = true;
          });
          if (!has) pctNoMax.set(e.name, true);
        }
      });
    })));
    declared.forEach(def => { const k = F.norm(def.name); if (!news.has(k) && !(data && F.exercise(data, def.name))) news.set(k, def); });
    r.newExercises.push(...news.values());
    pctNoMax.forEach((_, n) => r.warnings.push('Manca il massimale di ' + n + ': i kg in % verranno calcolati quando lo inserisci.'));
    return r;
  };

  F.parseProgram = function (root, data, strict) {
    const r = { program: null, errors: [], warnings: [] };
    const p = F.Program();
    p.name = str(root, 'Scheda importata', 'nome', 'name', 'titolo', 'title');
    p.desc = str(root, '', 'descrizione', 'description', 'obiettivo', 'note');
    const weeks = arr(root, 'settimane', 'weeks', 'settimana');
    if (!weeks || !weeks.length) {
      if (!strict) { const w = F.Week(); const dd = F.Day(); dd.name = 'Giorno 1'; w.days.push(dd); p.weeks.push(w); r.program = p; return r; }
      r.errors.push('La scheda non contiene settimane.');
      return r;
    }
    weeks.forEach((wo, i) => {
      if (!wo || typeof wo !== 'object') { r.errors.push('La settimana ' + (i + 1) + " non e' scritta correttamente."); return; }
      const w = F.Week();
      w.deload = bool(wo, 'scarico', 'deload', 'settimanaDiScarico');
      w.note = str(wo, '', 'note', 'notes', 'obiettivo');
      const copy = Math.round(dbl(wo, 0, 'copiaDa', 'ripeti', 'copia', 'copyFrom'));
      const days = arr(wo, 'giorni', 'days', 'allenamenti', 'sedute');
      if ((!days || !days.length) && copy > 0 && copy <= p.weeks.length) {
        p.weeks[copy - 1].days.forEach(dd => w.days.push(F.clone(dd)));
      } else if (!days || !days.length) {
        if (strict) { r.errors.push('La settimana ' + (i + 1) + ' non ha giorni di allenamento.'); return; }
      } else {
        days.forEach((dob, j) => {
          if (!dob || typeof dob !== 'object') { r.errors.push('Settimana ' + (i + 1) + ', giorno ' + (j + 1) + ': non scritto correttamente.'); return; }
          w.days.push(parseDay(dob, i + 1, j + 1, r));
        });
      }
      p.weeks.push(w);
    });
    F.renumber(p);
    if (!p.weeks.length) { r.errors.push('Nessuna settimana valida nella scheda.'); return r; }
    r.program = p;
    return r;
  };

  function parseDay(o, wn, dn, r) {
    const d = F.Day();
    d.name = str(o, 'Giorno ' + dn, 'nome', 'name', 'titolo', 'focus');
    d.note = str(o, '', 'note', 'notes');
    const wa = arr(o, 'riscaldamento', 'warmup', 'riscaldamentoGenerale', 'preparazione');
    (wa || []).forEach(it => {
      const w = { name: '', detail: '' };
      if (it && typeof it === 'object') {
        w.name = str(it, '', 'nome', 'name', 'esercizio', 'titolo');
        const parts = [];
        const dur = str(it, '', 'durata', 'tempo', 'duration'); if (dur) parts.push(dur);
        const se = str(it, '', 'serie', 'sets'); if (se) parts.push(se + ' serie');
        const rp = str(it, '', 'ripetizioni', 'reps', 'rip'); if (rp) parts.push(rp + ' rip');
        const det = str(it, '', 'dettagli', 'note', 'descrizione', 'details', 'come'); if (det) parts.push(det);
        w.detail = parts.join(' · ');
      } else if (it != null) w.name = String(it).trim();
      if (w.name) d.warm.push(w);
    });
    const exs = arr(o, 'esercizi', 'exercises');
    if (!exs || !exs.length) { r.warnings.push('Settimana ' + wn + ', ' + d.name + ': nessun esercizio.'); return d; }
    exs.forEach((eo, k) => {
      if (!eo || typeof eo !== 'object') { r.errors.push('Settimana ' + wn + ', ' + d.name + ': esercizio ' + (k + 1) + ' non scritto correttamente.'); return; }
      const e = parseEx(eo, wn, d.name, r);
      if (e) d.exs.push(e);
    });
    return d;
  }

  function parseEx(o, wn, dayName, r) {
    const e = F.Ex();
    e.name = str(o, '', 'nome', 'name', 'esercizio', 'exercise');
    if (!e.name) { r.errors.push('Settimana ' + wn + ', ' + dayName + ': un esercizio non ha il nome.'); return null; }
    e.note = str(o, '', 'note', 'notes', 'indicazioni');
    e.rest = F.restSeconds(get(o, 'recupero', 'rest', 'riposo', 'pausa'));
    e.superset = str(o, '', 'superserie', 'superset', 'gruppo');
    e.tempo = str(o, '', 'tempo', 'cadenza');
    e.approachNote = str(o, '', 'noteAvvicinamento', 'avvicinamentoNote', 'noteRiscaldamento', 'preparazione');
    const where = 'Settimana ' + wn + ', ' + dayName + ', ' + e.name;
    const ap = get(o, 'avvicinamento', 'serieAvvicinamento', 'warmupSets', 'riscaldamento');
    if (Array.isArray(ap)) {
      ap.forEach(x => {
        if (!x || typeof x !== 'object') return;
        let pct = dbl(x, 0, 'percentuale', 'pct', 'perc', '%', 'percentage');
        if (pct > 0 && pct <= 1.5) pct *= 100;
        const reps = Math.round(dbl(x, 0, 'ripetizioni', 'rip', 'reps'));
        const times = Math.max(1, Math.round(dbl(x, 1, 'serie', 'sets')));
        if (pct <= 0 || pct >= 100 || reps <= 0) { r.warnings.push(where + ": una serie di avvicinamento non valida e' stata ignorata."); return; }
        for (let t = 0; t < times; t++) e.approach.push([pct, reps]);
      });
    } else if (typeof ap === 'string' && !e.approachNote) e.approachNote = ap.trim();
    const sv = get(o, 'serie', 'sets', 'series');
    if (Array.isArray(sv)) {
      sv.forEach(go => {
        if (!go || typeof go !== 'object') { r.warnings.push(where + ": una riga di serie e' stata ignorata."); return; }
        e.groups.push(parseGroup(go, where, r));
      });
    } else e.groups.push(parseGroup(o, where, r));
    if (!e.groups.length) { r.warnings.push(where + ': nessuna serie, ne ho aggiunta una da 8 ripetizioni.'); e.groups.push(F.SetGroup()); }
    return e;
  }

  function parseGroup(o, where, r) {
    const g = F.SetGroup();
    let sets = get(o, 'serie', 'sets', 'n', 'numero', 'numeroSerie');
    if (Array.isArray(sets)) sets = undefined;
    let combined = null;
    if (typeof sets === 'string') {
      const m = sets.match(/^\s*(\d+)\s*[xX×*]\s*(.+)$/);
      if (m) { sets = parseInt(m[1], 10); combined = m[2].trim(); }
    }
    let n = sets === undefined ? 1 : Math.round(typeof sets === 'number' ? sets : F.parse(String(sets), 1));
    if (n <= 0) { r.warnings.push(where + ': numero di serie non valido, uso 1.'); n = 1; }
    if (n > 20) r.warnings.push(where + ': ' + n + ' serie sono tante, controlla.');
    g.sets = n;
    let reps = repsText(get(o, 'ripetizioni', 'rip', 'reps', 'repetitions'));
    if (!reps && combined) reps = repsText(combined);
    g.sec = secondsOnly(get(o, 'secondi', 'durata', 'seconds', 'duration', 'tempoSecondi'));
    if (!reps) reps = g.sec > 0 ? '' : '8';
    g.reps = reps;
    let pct = dbl(o, 0, 'percentuale', 'perc', 'pct', 'intensita', 'intensità', 'percent', '%', 'percentage');
    if (pct > 0 && pct <= 1.5) pct *= 100;
    if (pct > 105) r.warnings.push(where + ': ' + F.kg(pct) + "% del massimale e' molto alto, controlla.");
    g.pct = pct;
    let rpe = dbl(o, 0, 'rpe', 'RPE');
    if (rpe > 10 || (rpe > 0 && rpe < 1)) { r.warnings.push(where + ': RPE ' + F.kg(rpe) + ' fuori scala (1-10), ignorato.'); rpe = 0; }
    g.rpe = rpe;
    g.kg = dbl(o, 0, 'peso', 'kg', 'carico', 'weight', 'load');
    g.rest = F.restSeconds(get(o, 'recupero', 'rest', 'riposo', 'pausa'));
    g.note = str(o, '', 'notaSerie', 'nota');
    return g;
  }

  // ------------------------------------------------------------ testi per Claude
  F.targetGroup = function (g) {
    let b = g.sets + ' × ' + (g.sec > 0 && !g.reps ? g.sec + 's' : g.reps);
    if (g.pct > 0) b += ' · ' + F.kg(g.pct) + '%';
    if (g.rpe > 0) b += ' · RPE ' + F.kg(g.rpe);
    if (g.kg > 0) b += ' · ' + F.kg(g.kg) + ' kg';
    return b;
  };
  F.target = e => e.groups.map(F.targetGroup).join(' + ');
  F.dm = ts => { const t = new Date(ts); return String(t.getDate()).padStart(2, '0') + '/' + String(t.getMonth() + 1).padStart(2, '0'); };

  F.currentMaxes = function (d) {
    const last = new Map();
    d.maxes.forEach(m => { const k = F.norm(m.ex); const c = last.get(k); if (!c || m.date >= c.date) last.set(k, m); });
    const out = [];
    last.forEach(m => out.push([m.ex, m.kg]));
    return out;
  };

  F.aiGuide = function (d) {
    let b = "Ciao Claude, preparami una scheda di allenamento da importare nell'app Forge.\n\n";
    b += 'COSA VOGLIO: [scrivi qui obiettivo, giorni a settimana, durata in settimane, livello, attrezzatura, eventuali dolori o limiti]\n\n';
    b += 'Rispondi con un unico blocco JSON in questo formato:\n';
    b += '{\n  "formato": "forge-scheda",\n  "nome": "Forza base 8 settimane",\n  "descrizione": "obiettivo e logica della progressione",\n  "massimali": {"Squat": 140},\n';
    b += '  "nuoviEsercizi": [{"nome": "Hip thrust", "gruppo": "Glutei", "attrezzo": "Bilanciere", "note": "come si esegue"}],\n';
    b += '  "settimane": [\n    {"numero": 1, "scarico": false, "note": "", "giorni": [\n      {"nome": "Squat e gambe",\n';
    b += '       "riscaldamento": [{"nome": "Cyclette", "dettagli": "5 minuti, ritmo facile"}, {"nome": "Mobilita\' anche", "dettagli": "10 per lato"}],\n';
    b += '       "esercizi": [\n        {"nome": "Squat", "recupero": 180, "note": "tecnica e punti chiave",\n';
    b += '         "noteAvvicinamento": "cosa curare nelle serie di avvicinamento",\n';
    b += '         "avvicinamento": [{"percentuale": 40, "ripetizioni": 8}, {"percentuale": 60, "ripetizioni": 5}, {"percentuale": 80, "ripetizioni": 3}],\n';
    b += '         "serie": [\n          {"serie": 4, "ripetizioni": "6", "percentuale": 70, "rpe": 7}\n        ]},\n';
    b += '        {"nome": "Plank", "serie": [{"serie": 3, "secondi": 45}]}\n      ]}\n    ]}\n  ]\n}\n\n';
    b += 'REGOLE:\n';
    b += '- Scrivi TUTTE le settimane per esteso, ognuna con i suoi giorni, esercizi e serie (la progressione deve essere visibile settimana per settimana).\n';
    b += '- "ripetizioni": un numero ("6"), un intervallo ("8-10") oppure "max".\n';
    b += '- "percentuale" = % del massimale (1RM): usala per gli esercizi di cui ho il massimale. Per gli altri usa "rpe" (6-10). Usa "peso" in kg solo per un peso fisso.\n';
    b += '- "recupero" in secondi. "scarico": true per le settimane di scarico.\n';
    b += '- Esercizi a tempo (plank, cardio): "secondi" al posto di "ripetizioni".\n';
    b += '- Superserie: dai lo stesso valore "superserie" (es. "A") agli esercizi da fare insieme.\n';
    b += '- Usa i nomi della mia libreria qui sotto. Se serve un esercizio che non c\'e\', mettilo anche in "nuoviEsercizi" con gruppo, attrezzo e una breve nota di esecuzione.\n';
    b += '- Se mi suggerisci dei massimali da cui partire, mettili in "massimali".\n';
    b += '- Ogni giorno ha un "riscaldamento" (passaggi con nome e dettagli). Ogni esercizio ha "note" con tutte le indicazioni tecniche, "noteAvvicinamento" e, se serve, "avvicinamento" con le serie di avvicinamento in % del carico allenante.\n\n';
    const mx = F.currentMaxes(d);
    b += mx.length ? 'I MIEI MASSIMALI (1RM): ' + mx.map(m => m[0] + ' ' + F.kg(m[1]) + ' kg').join(', ') + '\n\n' : "I MIEI MASSIMALI: non ancora inseriti (usa l'RPE oppure proponimeli tu).\n\n";
    b += 'ESERCIZI NELLA MIA LIBRERIA:\n';
    const by = {};
    d.exercises.forEach(e => { (by[e.group] = by[e.group] || []).push(e.name); });
    Object.keys(by).sort().forEach(g => { b += '- ' + g + ': ' + by[g].join(', ') + '\n'; });
    return b;
  };

  F.report = function (d, p) {
    if (!p) return 'Nessuna scheda attiva.';
    const ss = d.sessions.filter(s => s.program === p.id && s.done && !s.ignored).sort((a, b) => a.start - b.start);
    const dpw = F.daysPerWeek(p);
    let b = 'RESOCONTO FORGE — scheda "' + p.name + '" (' + p.weeks.length + (p.weeks.length === 1 ? ' settimana, ' : ' settimane, ') + dpw + (dpw === 1 ? ' giorno)\n' : ' giorni)\n');
    let planned = 0;
    const next = F.next(d, p);
    for (let w = 0; w < p.weeks.length; w++) {
      if (next && w > next[0]) break;
      planned += (next && w === next[0]) ? next[1] : p.weeks[w].days.length;
    }
    if (ss.length) b += 'Periodo: ' + F.dm(ss[0].start) + ' - ' + F.dm(ss[ss.length - 1].start) + '\n';
    b += 'Allenamenti fatti: ' + ss.length + ' su ' + planned + ' previsti finora\n';
    const mx = F.currentMaxes(d);
    if (mx.length) b += 'Massimali attuali: ' + mx.map(m => m[0] + ' ' + F.kg(m[1])).join(', ') + ' kg\n';
    b += '\n';
    const prs = [];
    ss.forEach(s => {
      const day = F.day(p, s.week, s.day);
      b += 'Settimana ' + (s.week + 1);
      if (p.weeks[s.week] && p.weeks[s.week].deload) b += ' (scarico)';
      const dn = s.dayName || (day && day.name) || ('Giorno ' + (s.day + 1));
      b += ' · ' + dn + ' · ' + F.dm(s.start);
      if (s.end > s.start) b += ' · ' + Math.floor((s.end - s.start) / 60000) + ' min';
      b += '\n';
      const feel = [];
      if (s.energy > 0) feel.push('energia ' + s.energy + '/5');
      if (s.sleep > 0) feel.push('sonno ' + s.sleep + '/5');
      if (s.pain > 0) feel.push('dolori ' + s.pain + '/5');
      if (feel.length) b += '  Sensazioni: ' + feel.join(', ') + '\n';
      if (s.note) b += '  Nota: ' + s.note + '\n';
      let exNotes = {};
      try { exNotes = s.exNotes ? JSON.parse(s.exNotes) : {}; } catch (e) { exNotes = {}; }
      const byEx = new Map();
      F.logsOf(d, s.id).forEach(l => {
        if (l.warmup) return;
        if (!byEx.has(l.exIdx)) byEx.set(l.exIdx, []);
        byEx.get(l.exIdx).push(l);
        if (l.pr) prs.push(l.ex + ': ' + l.pr + ' (' + F.dm(l.ts) + ')');
      });
      const maxIdx = byEx.size ? Math.max.apply(null, Array.from(byEx.keys())) + 1 : 0;
      const n = Math.max(day ? day.exs.length : 0, maxIdx);
      for (let i = 0; i < n; i++) {
        const e = day && i < day.exs.length ? day.exs[i] : null;
        const done = byEx.get(i);
        const name = e ? e.name : (done ? done[0].ex : '?');
        b += '  - ' + name;
        if (e) b += ': previsto ' + F.target(e);
        b += ' → ';
        if (!done || !done.length) b += 'non fatto';
        else {
          done.sort((x, y) => x.setIdx - y.setIdx);
          b += done.map(l => (l.sec > 0 && l.reps === 0 ? l.sec + 's' : F.kg(l.kg) + '×' + l.reps) + (l.rpe > 0 ? ' @' + F.kg(l.rpe) : '')).join(', ');
          if (e && done.length < F.totalSets(e)) b += ' (' + done.length + '/' + F.totalSets(e) + ' serie)';
        }
        if (exNotes[name]) b += ' · nota: ' + exNotes[name];
        b += '\n';
      }
      b += '\n';
    });
    if (prs.length) b += 'RECORD:\n' + prs.map(x => '- ' + x).join('\n') + '\n\n';
    b += "Analizza questi dati (carichi, ripetizioni fatte, RPE, sensazioni e note) e preparami la prossima scheda nel formato Forge, calibrata su come sono andato davvero. Spiegami brevemente cosa cambi e perche'.\n";
    return b;
  };

  F.sessionSummary = function (d, s) {
    let sets = 0, vol = 0, prs = 0;
    F.logsOf(d, s.id).forEach(l => { if (l.warmup) return; sets++; vol += l.kg * l.reps; if (l.pr) prs++; });
    const min = s.end > s.start ? Math.floor((s.end - s.start) / 60000) : 0;
    return sets + ' serie · ' + F.big(vol) + ' kg di volume · ' + min + ' min' + (prs ? ' · ' + prs + ' record' : '');
  };
  F.distinctExercises = p => { const s = new Set(); p.weeks.forEach(w => w.days.forEach(d => d.exs.forEach(e => s.add(F.norm(e.name))))); return s.size; };

  // ------------------------------------------------------------ libreria predefinita
  F.GROUPS = ['Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti', 'Avambracci', 'Quadricipiti', 'Femorali', 'Glutei', 'Polpacci', 'Addome', 'Total body', 'Cardio', 'Altro'];
  const LIST = [
    ['Panca piana', 'Petto', 'Bilanciere', 'panca piana bilanciere|bench press|panca|distensioni su panca piana|flat bench'],
    ['Panca inclinata', 'Petto', 'Bilanciere', 'incline bench press|panca inclinata bilanciere|panca 30'],
    ['Panca declinata', 'Petto', 'Bilanciere', 'decline bench press'],
    ['Panca piana manubri', 'Petto', 'Manubri', 'dumbbell bench press|distensioni con manubri|panca manubri'],
    ['Panca inclinata manubri', 'Petto', 'Manubri', 'incline dumbbell press|inclinata manubri'],
    ['Croci ai cavi', 'Petto', 'Cavi', 'cable fly|croci cavi|croci al cavo|cable crossover'],
    ['Croci con manubri', 'Petto', 'Manubri', 'dumbbell fly|croci manubri|croci su panca'],
    ['Chest press', 'Petto', 'Macchina', 'chest press machine|pressa petto'],
    ['Pectoral machine', 'Petto', 'Macchina', 'peck deck|pec deck|butterfly'],
    ['Piegamenti', 'Petto', 'Corpo libero', 'push up|push-up|flessioni|piegamenti sulle braccia'],
    ['Dip alle parallele', 'Petto', 'Corpo libero', 'dips|dip|parallele'],
    ['Stacco da terra', 'Schiena', 'Bilanciere', 'deadlift|stacco|stacco classico|conventional deadlift'],
    ['Stacco sumo', 'Schiena', 'Bilanciere', 'sumo deadlift'],
    ['Rematore con bilanciere', 'Schiena', 'Bilanciere', 'barbell row|rematore bilanciere|bent over row|rematore'],
    ['Rematore con manubrio', 'Schiena', 'Manubri', 'dumbbell row|rematore manubrio|one arm row'],
    ['Pendlay row', 'Schiena', 'Bilanciere', 'pendlay'],
    ['Trazioni alla sbarra', 'Schiena', 'Corpo libero', 'pull up|pull-up|trazioni|chin up|trazioni presa prona'],
    ['Lat machine', 'Schiena', 'Cavi', 'lat pulldown|lat machine avanti|pulldown'],
    ['Pulley basso', 'Schiena', 'Cavi', 'seated cable row|pulley|rematore al cavo|low row'],
    ['T-bar row', 'Schiena', 'Bilanciere', 't bar|rematore t bar'],
    ['Pullover ai cavi', 'Schiena', 'Cavi', 'straight arm pulldown|pullover cavo'],
    ['Hyperextension', 'Schiena', 'Panca', 'iperestensioni|back extension|hyperextensions'],
    ['Military press', 'Spalle', 'Bilanciere', 'overhead press|ohp|lento avanti|shoulder press bilanciere|press militare'],
    ['Lento manubri', 'Spalle', 'Manubri', 'dumbbell shoulder press|shoulder press manubri|lento con manubri'],
    ['Arnold press', 'Spalle', 'Manubri', 'arnold'],
    ['Alzate laterali', 'Spalle', 'Manubri', 'lateral raise|alzate laterali manubri|lateral raises'],
    ['Alzate laterali ai cavi', 'Spalle', 'Cavi', 'cable lateral raise'],
    ['Alzate frontali', 'Spalle', 'Manubri', 'front raise'],
    ['Alzate posteriori', 'Spalle', 'Manubri', 'rear delt fly|reverse fly|alzate a 90'],
    ['Face pull', 'Spalle', 'Cavi', 'facepull|face pulls'],
    ['Tirate al mento', 'Spalle', 'Bilanciere', 'upright row'],
    ['Shoulder press macchina', 'Spalle', 'Macchina', 'shoulder press machine'],
    ['Curl con bilanciere', 'Bicipiti', 'Bilanciere', 'barbell curl|curl bilanciere'],
    ['Curl con manubri', 'Bicipiti', 'Manubri', 'dumbbell curl|curl manubri|curl alternato'],
    ['Curl a martello', 'Bicipiti', 'Manubri', 'hammer curl|martello'],
    ['Curl su panca Scott', 'Bicipiti', 'Bilanciere', 'preacher curl|scott|panca scott'],
    ['Curl ai cavi', 'Bicipiti', 'Cavi', 'cable curl'],
    ['Curl inclinato', 'Bicipiti', 'Manubri', 'incline curl|curl panca inclinata'],
    ['French press', 'Tricipiti', 'Bilanciere', 'skull crusher|skullcrusher|french press bilanciere'],
    ['Pushdown ai cavi', 'Tricipiti', 'Cavi', 'tricep pushdown|pushdown|push down|spinte in basso'],
    ['Estensioni sopra la testa', 'Tricipiti', 'Cavi', 'overhead extension|overhead tricep extension|estensioni tricipiti'],
    ['Panca presa stretta', 'Tricipiti', 'Bilanciere', 'close grip bench press|panca stretta'],
    ['Kickback', 'Tricipiti', 'Manubri', 'tricep kickback'],
    ['Dip su panca', 'Tricipiti', 'Corpo libero', 'bench dip'],
    ['Curl polsi', 'Avambracci', 'Bilanciere', 'wrist curl'],
    ['Farmer walk', 'Avambracci', 'Manubri', 'farmers walk|camminata del contadino'],
    ['Squat', 'Quadricipiti', 'Bilanciere', 'back squat|squat bilanciere|squat con bilanciere|high bar squat|low bar squat'],
    ['Front squat', 'Quadricipiti', 'Bilanciere', 'squat frontale'],
    ['Goblet squat', 'Quadricipiti', 'Manubri', 'goblet'],
    ['Pressa', 'Quadricipiti', 'Macchina', 'leg press|pressa 45|pressa orizzontale'],
    ['Hack squat', 'Quadricipiti', 'Macchina', 'hack'],
    ['Leg extension', 'Quadricipiti', 'Macchina', 'leg extensions|estensioni gambe'],
    ['Affondi', 'Quadricipiti', 'Manubri', 'lunges|affondi manubri|affondi in camminata|walking lunges'],
    ['Bulgarian split squat', 'Quadricipiti', 'Manubri', 'split squat|bulgari|squat bulgaro'],
    ['Step up', 'Quadricipiti', 'Manubri', 'step-up|salite sul box'],
    ['Stacco rumeno', 'Femorali', 'Bilanciere', 'romanian deadlift|rdl|stacco gambe semitese|stacco rdl'],
    ['Stacco a gambe tese', 'Femorali', 'Bilanciere', 'stiff leg deadlift|sldl'],
    ['Leg curl sdraiato', 'Femorali', 'Macchina', 'lying leg curl|leg curl|leg curl prono'],
    ['Leg curl seduto', 'Femorali', 'Macchina', 'seated leg curl'],
    ['Good morning', 'Femorali', 'Bilanciere', 'goodmorning'],
    ['Nordic curl', 'Femorali', 'Corpo libero', 'nordic hamstring curl'],
    ['Hip thrust', 'Glutei', 'Bilanciere', 'hip thrust bilanciere|ponte glutei con bilanciere'],
    ['Ponte glutei', 'Glutei', 'Corpo libero', 'glute bridge'],
    ['Abductor machine', 'Glutei', 'Macchina', 'abduttori|abductor|hip abduction'],
    ['Slanci ai cavi', 'Glutei', 'Cavi', 'cable kickback|kickback glutei'],
    ['Calf in piedi', 'Polpacci', 'Macchina', 'standing calf raise|calf raise|polpacci in piedi'],
    ['Calf seduto', 'Polpacci', 'Macchina', 'seated calf raise|polpacci seduto'],
    ['Crunch', 'Addome', 'Corpo libero', 'crunches|crunch a terra'],
    ['Crunch ai cavi', 'Addome', 'Cavi', 'cable crunch'],
    ['Plank', 'Addome', 'Corpo libero', 'plank frontale|tenuta plank'],
    ['Plank laterale', 'Addome', 'Corpo libero', 'side plank'],
    ['Leg raise', 'Addome', 'Corpo libero', 'hanging leg raise|alzate gambe|sollevamento gambe'],
    ['Ab wheel', 'Addome', 'Attrezzo', 'ruota addominali|rollout'],
    ['Russian twist', 'Addome', 'Corpo libero', 'twist russo'],
    ['Pallof press', 'Addome', 'Cavi', 'pallof'],
    ['Clean', 'Total body', 'Bilanciere', 'power clean|girata'],
    ['Kettlebell swing', 'Total body', 'Kettlebell', 'swing|kb swing'],
    ['Thruster', 'Total body', 'Bilanciere', 'thrusters'],
    ['Burpees', 'Total body', 'Corpo libero', 'burpee'],
    ['Tapis roulant', 'Cardio', 'Macchina', 'corsa|treadmill|corsa su tapis roulant'],
    ['Cyclette', 'Cardio', 'Macchina', 'bike|bici|spin bike'],
    ['Vogatore', 'Cardio', 'Macchina', 'rower|rowing|remoergometro'],
    ['Ellittica', 'Cardio', 'Macchina', 'elliptical|ellittico'],
    ['Salto con la corda', 'Cardio', 'Attrezzo', 'jump rope|corda'],
    ['Stair climber', 'Cardio', 'Macchina', 'scale|stepper']
  ];
  const TIMED = ['Plank', 'Plank laterale', 'Farmer walk', 'Tapis roulant', 'Cyclette', 'Vogatore', 'Ellittica', 'Salto con la corda', 'Stair climber'];
  F.defaultExercises = () => LIST.map(r => ({ name: r[0], group: r[1], equip: r[2], note: '', aliases: r[3], custom: false, timed: TIMED.includes(r[0]) }));

  if (typeof module !== 'undefined' && module.exports) module.exports = F;
  else root.F = F;
})(this);
