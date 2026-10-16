import { $, $$, esc, icon, t, L, UI, act, money, toast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { glyphImg } from '../render/glyphs.js';
import { coverImg } from '../render/covers.js';
import { TOPIC } from '../data/topics.js';
import { GENRE } from '../data/genres.js';
import { CAT } from '../data/categories.js';
import { PLATFORM } from '../data/platforms.js';
import { REVIEWERS } from '../data/reviews.js';
import { EV } from '../data/events.js';
import { reviewTexts, phaseCats, idealFocus } from '../sim/score.js';
import { setPhaseFocus } from '../sim/dev.js';
import { resolveEvent } from '../sim/events.js';
import { AWARD_CATS } from '../sim/awards.js';
import { resolveExpo, expoCost } from '../sim/actions.js';
import { lang } from '../core/i18n.js';
import { fmtNum, clamp } from '../core/util.js';
import { focusHTML, bindFocus } from './focus.js';
import { SCOPES } from '../sim/const.js';
import { bailoutAmount, takeBailout, declineBailout } from '../sim/studio.js';
import { music } from '../audio/sfx.js';

let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers = [];
};

const scoreColor = (s) => (s >= 9 ? 'var(--gold)' : s >= 8 ? 'var(--good)' : s >= 6.5 ? 'var(--accent)' : s >= 5 ? 'var(--warn)' : 'var(--bug)');

export function showPrompt(app, p) {
  const G = app.G;
  app.promptActive = true;
  UI.close(true);
  app.menuChanged();
  const finish = () => {
    clearTimers();
    const i = G.pending.findIndex((x) => x.id === p.id);
    if (i >= 0) G.pending.splice(i, 1);
    app.promptActive = false;
    UI.closeModal();
    app.menuChanged();
  };
  const handler = { phase: phasePrompt, report: reportPrompt, event: eventPrompt, award: awardPrompt, expo: expoPrompt, year: yearPrompt, gameover: gameoverPrompt, ending: endingPrompt, bailout: bailoutPrompt }[p.type];
  if (!handler) {
    finish();
    return;
  }
  handler(app, G, p, finish);
}

// ── Fasbyte ───────────────────────────────────────────────────────
function phasePrompt(app, G, p, finish) {
  const J = G.job;
  if (!J) return finish();
  const cats = phaseCats(G, p.phase);
  const val = { ...J.focus[p.phase] };
  const ideal = G.know.focus[J.genre] ? idealFocus(G, J.genre, p.phase, J.genre2) : null;
  const names = ['dev.p1', 'dev.p2', 'dev.p3'];
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--accent)">${icon('sliders')}</div><h2>${t('phase.title', { n: p.phase + 1 })}<div class="sub">${t(names[p.phase])} · ${esc(J.title)}</div></h2></div>
    <div class="win-body">
      <div class="row wrap" style="gap:10px;margin-bottom:16px">
        <div class="counter" style="--c:var(--design);width:92px"><div class="v num">${Math.round(J.D)}</div><div class="k">${t('stat.design')}</div></div>
        <div class="counter" style="--c:var(--tech);width:92px"><div class="v num">${Math.round(J.T)}</div><div class="k">${t('stat.tech')}</div></div>
        <div class="counter" style="--c:var(--bug);width:92px"><div class="v num">${Math.round(J.bugs)}</div><div class="k">${t('stat.bugs')}</div></div>
        <p class="hint sp" style="min-width:220px">${t('phase.help')}</p>
      </div>
      ${cats.length ? focusHTML(cats, val, ideal, 'pf') : ''}
    </div>
    <div class="win-foot">${ideal ? `<button class="btn" data-act="p-ideal">${icon('target')}${t('wiz.useIdeal')}</button>` : `<span class="hint">${icon('info')} ${t('wiz.focusUnknown')}</span>`}<span class="sp"></span><button class="btn primary lg" data-act="p-go">${t('phase.go')}${icon('arrow')}</button></div>`,
    (el) => {
      bindFocus(el, cats, val, ideal, 'pf', () => {});
      act('p-go', () => {
        setPhaseFocus(G, p.phase, val);
        sfx.play('start');
        finish();
      });
      act('p-ideal', () => {
        const i = idealFocus(G, J.genre, p.phase, J.genre2);
        for (const c of cats) val[c] = i[c];
        setPhaseFocus(G, p.phase, val);
        finish();
      });
    },
    'lg',
  );
  sfx.play('phase');
}

// ── Recensioner ───────────────────────────────────────────────────
function reportPrompt(app, G, p, finish) {
  const J = G.job;
  const rep = J.report;
  const texts = reviewTexts(J, rep, lang);
  const tp = TOPIC[J.topic];
  const ge = GENRE[J.genre];
  const cover = { id: J.id, title: J.title, topic: J.topic, genre: J.genre, platform: J.platform };
  const total = rep.score;
  const cards = texts
    .map((r, i) => {
      const rv = REVIEWERS[i];
      return `<div class="rev" data-i="${i}" style="--c:${rv.color}">
        <div class="rv-h"><div class="rv-av">${icon(['cpu', 'book', 'heart', 'skull'][i])}</div><div style="flex:1;min-width:0"><b>${L(rv.name)}</b><div class="faint" style="font-size:11px">${L(rv.outlet)}</div></div><div class="rv-s num">–</div></div>
        <div class="rv-t"><b>${esc(r.headline)}</b>${r.detail ? `<p>${esc(r.detail)}</p>` : ''}</div>
      </div>`;
    })
    .join('');
  const ins = rep.insights.map((x) => insightRow(x, rep, J)).join('');
  const learned = G.know.combos[J.topic + '|' + J.genre] ? '' : `<div class="learn">${icon('sparkle')}<span>${t('rep.learned', { combo: `<b>${L(tp.name)} × ${L(ge.name)}</b>`, v: `<b>${t('compat.' + Math.round(rep.parts.compat))}</b>` })}</span></div>`;
  const outlook = total >= 9 ? 'rep.o4' : total >= 7.5 ? 'rep.o3' : total >= 6 ? 'rep.o2' : total >= 4.5 ? 'rep.o1' : 'rep.o0';
  UI.modal(`
    <div class="report">
      <div class="rp-top">
        <div class="rp-cover">${coverImg(cover, 108, 'big')}</div>
        <div style="flex:1;min-width:0">
          <div class="lbl">${t('rep.head')}</div>
          <div class="h2" style="overflow-wrap:anywhere">${esc(J.title)}</div>
          <div class="row wrap" style="gap:6px;margin-top:8px">
            <span class="chip c" style="--c:${ge.color}">${glyphImg(ge.glyph, ge.color, 16, false)}${L(ge.name)}${J.genre2 ? ' + ' + L(GENRE[J.genre2].name) : ''}</span>
            <span class="chip">${glyphImg(tp.glyph, '#fff', 16, false)}${L(tp.name)}</span>
            <span class="chip" style="--c:${PLATFORM[J.platform].color}">${esc(PLATFORM[J.platform].name)}</span>
            <span class="chip">${L(SCOPES[J.scope].name)}</span>
          </div>
          <div class="rp-stats">
            <div style="--c:var(--design)"><b class="num">${Math.round(J.D)}</b><span>${t('stat.design')}</span></div>
            <div style="--c:var(--tech)"><b class="num">${Math.round(J.T)}</b><span>${t('stat.tech')}</span></div>
            <div style="--c:var(--bug)"><b class="num">${Math.round(J.bugs)}</b><span>${t('stat.bugs')}</span></div>
            <div style="--c:var(--hot)"><b class="num">${Math.round(J.hype)}</b><span>${t('stat.hype')}</span></div>
            <div style="--c:var(--rp)"><b class="num">+${J.rpGained}</b><span>${t('hud.rp')}</span></div>
          </div>
        </div>
        <div class="rp-score" id="rp-score" style="--c:${scoreColor(total)}"><div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="r0"/><circle cx="50" cy="50" r="44" class="r1" id="rp-ring" stroke-dasharray="276.5" stroke-dashoffset="276.5"/></svg><div class="big num" id="rp-avg">–</div></div><div class="stamp" id="rp-stamp">${t(outlook)}</div></div>
      </div>
      <div class="revs">${cards}</div>
      <div class="rp-notes" id="rp-notes"><div class="lbl" style="margin-bottom:8px">${t('rep.notes')}</div><div class="ins">${ins}</div>${learned}</div>
      <div class="win-foot"><button class="btn ghost" data-act="rp-skip" id="rp-skip">${icon('fast')}${t('rep.skip')}</button><span class="sp"></span><button class="btn gold lg" data-act="rp-release" id="rp-release" disabled>${icon('rocket')}${t('rep.release')}</button></div>
    </div>`,
    (el) => {
      let done = false;
      const reveal = (i, instant) => {
        const card = $(`.rev[data-i="${i}"]`, el);
        const s = rep.reviews[i].score;
        card.classList.add('show');
        const num = $('.rv-s', card);
        num.style.color = scoreColor(s);
        if (instant) {
          num.textContent = s.toFixed(1);
          return;
        }
        sfx.play('whoosh');
        const t0 = performance.now();
        const step = (n) => {
          const k = clamp((n - t0) / 620, 0, 1);
          const e = 1 - Math.pow(1 - k, 3);
          num.textContent = (1 + (s - 1) * e).toFixed(1);
          if (k < 1 && el.isConnected) requestAnimationFrame(step);
          else sfx.play('score', s);
        };
        requestAnimationFrame(step);
      };
      const showAvg = (instant) => {
        $('#rp-score', el).classList.add('show');
        const ring = $('#rp-ring', el);
        ring.style.strokeDashoffset = 276.5 * (1 - total / 10);
        const out = $('#rp-avg', el);
        if (instant) out.textContent = total.toFixed(1);
        else {
          const t0 = performance.now();
          const step = (n) => {
            const k = clamp((n - t0) / 900, 0, 1);
            out.textContent = (total * (1 - Math.pow(1 - k, 3))).toFixed(1);
            if (k < 1 && el.isConnected) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          sfx.play(total >= 8 ? 'fanfare' : 'final');
          if (total >= 8) app.scene.confetti(60);
        }
        $('#rp-notes', el).classList.add('show');
        $('#rp-release', el).disabled = false;
        $('#rp-skip', el).style.visibility = 'hidden';
        done = true;
      };
      for (let i = 0; i < 4; i++) later(() => !done && reveal(i), 600 + i * 1050);
      later(() => !done && showAvg(false), 600 + 4 * 1050 + 200);
      act('rp-skip', () => {
        clearTimers();
        for (let i = 0; i < 4; i++) reveal(i, true);
        showAvg(true);
      });
      act('rp-release', () => {
        const g = app.release();
        finish();
        if (g) {
          toast(t('toast.released', { title: `<b>${esc(g.title)}</b>`, v: `<b>${g.score.toFixed(1)}</b>` }), g.score >= 7 ? 'good' : 'info', 7000);
          setTimeout(() => toast(t('toast.forecast', { v: `<b>${money(g.total)}</b>` }), 'money', 6500), 600);
        }
      });
    },
    'xl',
  );
  music.setMood?.('report');
}
function insightRow(x, rep, J) {
  const lvl = x.level > 0 ? 'good' : x.level < 0 ? 'bad' : 'ok';
  const ic = { compat: 'sparkle', focus: 'sliders', design: 'bulb', tech: 'cpu', bugs: 'bug', platform: 'gamepad', audience: 'user' }[x.k];
  let txt = '';
  if (x.k === 'compat') txt = t('ins.compat.' + lvl, { v: t('compat.' + Math.round(x.v)) });
  else if (x.k === 'focus') {
    txt = t('ins.focus.' + lvl);
    if (x.level <= 0 && (x.over || x.under)) txt += ' ' + t('ins.focusHint', { over: x.over ? `<b>${L(CAT[x.over].name)}</b>` : '…', under: x.under ? `<b>${L(CAT[x.under].name)}</b>` : '…' });
  } else if (x.k === 'design' || x.k === 'tech') txt = t('ins.' + x.k + '.' + lvl, { v: Math.round(x.v * 100) });
  else if (x.k === 'bugs') txt = t('ins.bugs.' + lvl, { n: Math.round(x.v), m: SCOPES[J.scope].bugs });
  else if (x.k === 'platform') txt = t('ins.platform.' + lvl);
  else if (x.k === 'audience') txt = t('ins.audience.' + lvl);
  void rep;
  return `<div class="in ${lvl}"><span class="ii">${icon(ic)}</span><span>${txt}</span></div>`;
}

// ── Händelser ─────────────────────────────────────────────────────
function eventPrompt(app, G, p, finish) {
  const ev = EV[p.ev];
  if (!ev) return finish();
  const choices = ev.choices
    .map((c, i) => `<button class="choice" data-act="ev-pick" data-i="${i}"><b>${L(c.label)}</b>${c.hint ? `<span class="muted">${L(c.hint)}</span>` : ''}</button>`)
    .join('');
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--warn)">${icon(ev.kind === 'dev' ? 'wrench' : 'mail')}</div><h2>${L(ev.title)}<div class="sub">${t(ev.kind === 'dev' ? 'ev.dev' : 'ev.studio')}</div></h2></div>
    <div class="win-body" id="ev-body"><p class="evtext">${L(ev.body)}</p><div class="choices">${choices}</div></div>`,
    (el) => {
      act('ev-pick', (b) => {
        const out = resolveEvent(G, p.id, +b.dataset.i);
        sfx.play('click');
        const chips = (out || []).map(fxChip).join('');
        $('#ev-body', el).innerHTML = `<p class="evtext">${L(ev.choices[+b.dataset.i].label)}</p><div class="row wrap" style="gap:8px;margin:14px 0">${chips || `<span class="muted">${t('ev.nothing')}</span>`}</div><div class="row"><span class="sp"></span><button class="btn primary" data-act="ev-ok">${t('ui.continue')}${icon('arrow')}</button></div>`;
        act('ev-ok', () => {
          app.promptActive = false;
          UI.closeModal();
          app.menuChanged();
        });
      });
    },
    'md',
  );
  sfx.play('notify');
}
function fxChip(o) {
  const map = { money: ['money', 'var(--money)'], rp: ['flask', 'var(--rp)'], fans: ['heart', 'var(--fans)'], hype: ['fire', 'var(--hot)'], design: ['bulb', 'var(--design)'], tech: ['cpu', 'var(--tech)'], bugs: ['bug', 'var(--bug)'], mood: ['coffee', 'var(--warn)'], sales: ['chart', 'var(--accent)'], staff: ['team', 'var(--bug)'] };
  const [ic, col] = map[o.k] || ['info', 'var(--accent)'];
  const v = typeof o.v === 'number' ? (o.k === 'money' ? (o.v > 0 ? '+' : '') + money(o.v) : (o.v > 0 ? '+' : '') + fmtNum(o.v)) : o.v;
  const bad = (typeof o.v === 'number' && ((o.k === 'bugs' && o.v > 0) || (o.k !== 'bugs' && o.v < 0))) || (typeof o.v === 'string' && o.v.startsWith('-') && o.k !== 'bugs');
  return `<span class="chip c" style="--c:${bad ? 'var(--bug)' : col}">${icon(ic)}<b class="num">${v}</b></span>`;
}

// ── Priser ────────────────────────────────────────────────────────
function awardPrompt(app, G, p, finish) {
  const cats = p.cats;
  const blocks = cats
    .map((c, i) => {
      const def = AWARD_CATS.find((a) => a.id === c.id);
      return `<div class="aw" data-i="${i}">
        <div class="aw-h">${icon(def.glyph === 'a_trophy' ? 'trophy' : def.glyph === 'a_heart' ? 'heart' : def.glyph === 'c_engine' ? 'cpu' : 'bulb')}<b>${L(def.name)}</b></div>
        <div class="aw-n">${c.nominees.map((n, j) => `<div class="nom ${n.yours ? 'yours' : ''}" data-j="${j}"><span>${esc(L(n.title))}</span><small>${esc(n.studio)}</small></div>`).join('')}</div>
        <div class="aw-w"><span class="lbl">${t('aw.winner')}</span><b>?</b></div>
      </div>`;
    })
    .join('');
  const wins = cats.filter((c) => c.nominees[c.winner].yours);
  UI.modal(`
    <div class="awards-stage">
      <div class="spot s1"></div><div class="spot s2"></div>
      <div class="aw-title"><div class="lbl" style="color:var(--gold)">${t('aw.show')}</div><div class="h2">${t('aw.head', { y: p.year })}</div></div>
      <div class="aw-grid">${blocks}</div>
      <div class="win-foot" style="background:transparent;border:0"><button class="btn ghost" data-act="aw-skip" id="aw-skip">${icon('fast')}${t('rep.skip')}</button><span class="sp"></span><button class="btn gold lg" id="aw-done" data-act="aw-done" disabled>${wins.length ? t('aw.thanks') : t('ui.continue')}</button></div>
    </div>`,
    (el) => {
      const revealAll = (instant) => {
        cats.forEach((c, i) => {
          const f = () => {
            const box = $(`.aw[data-i="${i}"]`, el);
            if (!box) return;
            box.classList.add('done');
            const w = c.nominees[c.winner];
            $('.aw-w b', box).textContent = L(w.title) + ' · ' + w.studio;
            $$('.nom', box)[c.winner].classList.add('win');
            if (w.yours) {
              box.classList.add('mine');
              if (!instant) {
                sfx.play('fanfare');
                app.scene.confetti(30);
              }
            } else if (!instant) sfx.play('tick');
          };
          if (instant) f();
          else later(f, 900 + i * 1500);
        });
        const doneAt = instant ? 0 : 900 + cats.length * 1500 + 300;
        const fin = () => {
          const b = $('#aw-done', el);
          if (b) b.disabled = false;
          const s = $('#aw-skip', el);
          if (s) s.style.visibility = 'hidden';
        };
        if (instant) fin();
        else later(fin, doneAt);
      };
      revealAll(false);
      act('aw-skip', () => {
        clearTimers();
        revealAll(true);
      });
      act('aw-done', () => finish());
    },
    'xl',
  );
  music.setMood?.('award');
  sfx.play('fanfare');
}

// ── Mässa ─────────────────────────────────────────────────────────
function expoPrompt(app, G, p, finish) {
  const J = G.job;
  const opt = (lv, ic, col) => `<button class="choice" data-act="ex-pick" data-lv="${lv}" ${G.money < expoCost(G, lv) ? 'disabled' : ''}><b>${icon(ic)} ${t('expo.o' + lv)}</b><span class="muted">${t('expo.d' + lv)}</span>${lv ? `<span class="tag" style="--c:${col}">${money(expoCost(G, lv))}</span>` : ''}</button>`;
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--hot)">${icon('megaphone')}</div><h2>${t('expo.title')}<div class="sub">${esc(J ? J.title : '')}</div></h2></div>
    <div class="win-body"><p class="evtext">${t('expo.text')}</p><div class="choices">${opt(0, 'x', 'var(--faint)')}${opt(1, 'flag', 'var(--accent)')}${opt(2, 'star', 'var(--gold)')}</div></div>`,
    () => {
      act('ex-pick', (b) => {
        const r = resolveExpo(G, p.id, +b.dataset.lv);
        if (r === true) {
          if (+b.dataset.lv > 0) {
            sfx.play('fanfare');
            toast(t('expo.done'), 'good');
          }
          app.promptActive = false;
          UI.closeModal();
          app.menuChanged();
        } else toast(String(r), 'bad');
      });
    },
    'md',
  );
}

// ── Årsrapport ────────────────────────────────────────────────────
function yearPrompt(app, G, p, finish) {
  const lo = (p.year - 1980) * 48;
  const hi = lo + 48;
  const yGames = G.games.filter((g) => g.t >= lo && g.t < hi);
  const hist = G.hist.cash.filter((h) => h.t > lo && h.t <= hi + 1);
  const rev = G.hist.revenue.filter((h) => h.t > lo && h.t <= hi + 1).reduce((s, x) => s + x.v, 0);
  const cash0 = G.hist.cash.find((h) => h.t > lo - 4 && h.t <= lo + 1)?.v ?? G.money0 ?? 0;
  const cash1 = hist.length ? hist[hist.length - 1].v : G.money;
  const fansNow = G.hist.fans.find((h) => h.t > hi - 1)?.v ?? G.fans;
  const fans0 = G.hist.fans.find((h) => h.t > lo && h.t <= lo + 2)?.v ?? 0;
  const best = yGames.slice().sort((a, b) => b.score - a.score)[0];
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--gold)">${icon('calendar')}</div><h2>${t('year.title', { y: p.year })}<div class="sub">${esc(G.studio)}</div></h2></div>
    <div class="win-body">
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
        <div class="counter" style="--c:var(--money)"><div class="v num">${money(rev)}</div><div class="k">${t('year.revenue')}</div></div>
        <div class="counter" style="--c:${cash1 >= cash0 ? 'var(--good)' : 'var(--bug)'}"><div class="v num">${cash1 >= cash0 ? '+' : ''}${money(cash1 - cash0)}</div><div class="k">${t('year.cash')}</div></div>
        <div class="counter" style="--c:var(--fans)"><div class="v num">${fansNow - fans0 >= 0 ? '+' : ''}${fmtNum(fansNow - fans0)}</div><div class="k">${t('hud.fans')}</div></div>
        <div class="counter" style="--c:var(--accent)"><div class="v num">${yGames.length}</div><div class="k">${t('year.games')}</div></div>
      </div>
      ${best ? `<div class="card row" style="margin-top:16px;gap:16px">${coverImg({ id: best.id, title: best.title, topic: best.topic, genre: best.genre, platform: best.platform }, 64)}<div style="flex:1"><div class="lbl">${t('year.best')}</div><div class="h3">${esc(best.title)}</div><div class="muted">${L(TOPIC[best.topic].name)} · ${L(GENRE[best.genre].name)}</div></div><div class="disp" style="font-size:44px;color:${scoreColor(best.score)}">${best.score.toFixed(1)}</div></div>` : `<p class="muted" style="margin-top:16px">${t('year.none')}</p>`}
    </div>
    <div class="win-foot"><span class="sp"></span><button class="btn primary lg" data-act="yr-ok">${t('year.next', { y: p.year + 1 })}${icon('arrow')}</button></div>`,
    () => act('yr-ok', () => finish()),
    'md',
  );
}

// ── Konkurs ───────────────────────────────────────────────────────
function gameoverPrompt(app, G) {
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--bug)">${icon('skull')}</div><h2>${t('over.title')}<div class="sub">${esc(G.studio)}</div></h2></div>
    <div class="win-body"><p class="evtext">${t('over.text', { y: 1980 + Math.floor(G.over.t / 48) })}</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-top:14px">
        <div class="counter" style="--c:var(--accent)"><div class="v num">${G.games.length}</div><div class="k">${t('year.games')}</div></div>
        <div class="counter" style="--c:var(--gold)"><div class="v num">${G.stats.bestScore.toFixed(1)}</div><div class="k">${t('over.best')}</div></div>
        <div class="counter" style="--c:var(--money)"><div class="v num">${money(G.stats.revenue)}</div><div class="k">${t('over.total')}</div></div>
      </div></div>
    <div class="win-foot"><span class="sp"></span><button class="btn primary lg" data-act="over-title">${t('over.again')}</button></div>`,
    () => act('over-title', () => {
      app.promptActive = false;
      app.toTitle();
    }),
    'md',
  );
  music.setMood?.('sad');
}

function endingPrompt(app, G, p, finish) {
  const rank = G.stats.revenue > 1e9 ? 3 : G.stats.revenue > 1e8 ? 2 : G.stats.revenue > 1e7 ? 1 : 0;
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--gold)">${icon('crown')}</div><h2>${t('end.title')}<div class="sub">${esc(G.studio)} · 1980–2020</div></h2></div>
    <div class="win-body"><div class="stamp big" style="--c:var(--gold)">${t('end.rank' + rank)}</div><p class="evtext" style="margin-top:14px">${t('end.text')}</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));margin-top:14px">
        <div class="counter" style="--c:var(--accent)"><div class="v num">${G.games.length}</div><div class="k">${t('year.games')}</div></div>
        <div class="counter" style="--c:var(--gold)"><div class="v num">${G.stats.bestScore.toFixed(1)}</div><div class="k">${t('over.best')}</div></div>
        <div class="counter" style="--c:var(--money)"><div class="v num">${money(G.stats.revenue)}</div><div class="k">${t('over.total')}</div></div>
        <div class="counter" style="--c:var(--fans)"><div class="v num">${fmtNum(G.fans)}</div><div class="k">${t('hud.fans')}</div></div>
        <div class="counter" style="--c:var(--hot)"><div class="v num">${G.awards.length}</div><div class="k">${t('end.awards')}</div></div>
      </div></div>
    <div class="win-foot"><button class="btn" data-act="end-title">${t('menu.title')}</button><span class="sp"></span><button class="btn primary lg" data-act="end-go">${t('end.keep')}${icon('arrow')}</button></div>`,
    () => {
      act('end-go', () => finish());
      act('end-title', () => {
        finish();
        app.toTitle();
      });
    },
    'md',
  );
  app.scene.fireworks(8);
  sfx.play('fanfare');
}

function bailoutPrompt(app, G, p, finish) {
  const amt = bailoutAmount(G);
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--warn)">${icon('bank')}</div><h2>${t('bail.title')}<div class="sub">${esc(G.studio)}</div></h2></div>
    <div class="win-body"><p class="evtext">${t('bail.text', { v: `<b>${money(amt)}</b>` })}</p>
      <div class="choices">
        <button class="choice" data-act="bail-yes"><b>${icon('check')} ${t('bail.yes', { v: money(amt) })}</b><span class="muted">${t('bail.yesD')}</span></button>
        <button class="choice" data-act="bail-no"><b>${icon('x')} ${t('bail.no')}</b><span class="muted">${t('bail.noD')}</span></button>
      </div></div>`,
    () => {
      act('bail-yes', () => {
        takeBailout(G);
        sfx.play('coin');
        finish();
      });
      act('bail-no', () => {
        finish();
        declineBailout(G);
      });
    },
    'md',
  );
  sfx.play('bad');
}
