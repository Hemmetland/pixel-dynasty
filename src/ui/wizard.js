import { $, esc, icon, t, L, UI, act, regWin, bar, money, toast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { glyphImg } from '../render/glyphs.js';
import { coverImg } from '../render/covers.js';
import { TOPICS, TOPIC } from '../data/topics.js';
import { GENRES, GENRE } from '../data/genres.js';
import { PHASES } from '../data/categories.js';
import { PLATFORMS, PLATFORM, potential, platTier, techMult, pcGeneration } from '../data/platforms.js';
import { SCOPES, SCOPE_IDS, AUDIENCES, yearOf, yfOf, engineMult } from '../sim/const.js';
import { startProject, platformOpen, teamOutput, baseHype } from '../sim/dev.js';
import { phaseCats, idealFocus, normFocus, techWeight, platFit, defaultFocus } from '../sim/score.js';
import { buyLicense, licenseCost } from '../sim/actions.js';
import { randomTitle } from '../sim/market.js';
import { focusHTML, bindFocus } from './focus.js';
import { lang } from '../core/i18n.js';
import { clamp } from '../core/util.js';
import { workers } from '../sim/people.js';

const W = {};
function reset(G) {
  Object.assign(W, {
    step: 0, title: '', topic: null, genre: null, genre2: null, platform: null, audience: 'everyone', scope: 'small', engineId: null, sequelOf: null,
    focus: null, titleAuto: true,
  });
  const best = bestPlatform(G);
  W.platform = best;
  W.audience = G.u.aud.includes('everyone') ? 'everyone' : G.u.aud[0];
}
function bestPlatform(G) {
  const yf = yfOf(G.t);
  let b = 'pc';
  let bv = -1;
  for (const id of G.licenses) {
    if (!platformOpen(G, id)) continue;
    const p = PLATFORM[id];
    const v = potential(p, yf);
    if (v > bv) { bv = v; b = id; }
  }
  return b;
}
const COMPAT_COL = { 4: 'var(--good)', 3: 'var(--accent)', 2: 'var(--warn)', 1: 'var(--bug)' };

export function teamReadiness(G, cfg) {
  const year = yearOf(G.t);
  const sc = SCOPES[cfg.scope];
  const out = teamOutput(G, { scope: cfg.scope, crunch: false }, 0.5);
  const eng = cfg.engineId ? G.engines.find((e) => e.id === cfg.engineId) : null;
  const em = engineMult(eng, yfOf(G.t));
  const par = sc.par * techMult(PLATFORM[cfg.platform], year);
  const rd = out.d / par;
  const rt = (out.t * em) / par;
  const tw = cfg.genre ? techWeight(cfg.genre, cfg.genre2) : 0.45;
  const r = Math.pow(Math.max(rd, 0.02), 1 - tw) * Math.pow(Math.max(rt, 0.02), tw);
  return { r, rd, rt, out };
}
const verdict = (r) => (r < 0.45 ? ['bad', 'wiz.tooHard'] : r < 0.75 ? ['warn', 'wiz.hard'] : r < 1.5 ? ['good', 'wiz.good'] : r < 2.4 ? ['good', 'wiz.great'] : ['accent', 'wiz.easy']);
const VCOL = { bad: 'var(--bug)', warn: 'var(--warn)', good: 'var(--good)', accent: 'var(--accent)' };

function trendBadge(G, kind, id) {
  const tr = G.market.trend[kind].find((x) => x.id === id);
  if (!tr) return '';
  return tr.mult > 1.1 ? `<i class="trend hot" data-tip="${t('wiz.trendHot')}">${icon('fire')}</i>` : tr.mult < 0.95 ? `<i class="trend cold" data-tip="${t('wiz.trendCold')}">${icon('snow')}</i>` : '';
}

function stepConcept(G) {
  const topics = TOPICS.filter((x) => G.u.topics.includes(x.id));
  const genres = GENRES.filter((x) => G.u.genres.includes(x.id));
  const known = (tp, ge) => G.know.combos[tp + '|' + ge];
  const tiles = topics
    .map((tp) => {
      let dot = '';
      if (W.genre) {
        const k = known(tp.id, W.genre);
        if (k) dot = `<i class="cdot" style="--c:${COMPAT_COL[Math.round(k)]}" data-tip="${t('compat.' + Math.round(k))}"></i>`;
      }
      return `<button class="tile ${W.topic === tp.id ? 'sel' : ''}" data-act="w-topic" data-id="${tp.id}" style="--t1:${tp.c1};--t2:${tp.c2}">
        <span class="tg">${glyphImg(tp.glyph, '#fff', 32, true)}</span><b>${L(tp.name)}</b>${dot}${trendBadge(G, 'topic', tp.id)}</button>`;
    })
    .join('');
  const genreTile = (ge, which) => {
    let dot = '';
    if (which === 1 && W.topic) {
      const k = known(W.topic, ge.id);
      if (k) dot = `<i class="cdot" style="--c:${COMPAT_COL[Math.round(k)]}" data-tip="${t('compat.' + Math.round(k))}"></i>`;
    }
    const sel = which === 1 ? W.genre === ge.id : W.genre2 === ge.id;
    const dis = which === 2 && W.genre === ge.id;
    return `<button class="tile gtile ${sel ? 'sel' : ''} ${dis ? 'off' : ''}" data-act="${which === 1 ? 'w-genre' : 'w-genre2'}" data-id="${ge.id}" style="--t1:${ge.color};--t2:#10142a" ${dis ? 'disabled' : ''}>
      <span class="tg">${glyphImg(ge.glyph, '#fff', 32, true)}</span><b>${L(ge.name)}</b>${dot}${trendBadge(G, 'genre', ge.id)}</button>`;
  };
  const seqs = G.u.flags.sequels ? G.games.filter((g) => g.score >= 5).slice(-4).reverse() : [];
  let compat = '';
  if (W.topic && W.genre) {
    const k = known(W.topic, W.genre);
    if (k && !W.genre2) compat = `<div class="compat" style="--c:${COMPAT_COL[Math.round(k)]}"><span class="pips">${[1, 2, 3, 4].map((i) => `<i class="${i <= Math.round(k) ? 'on' : ''}"></i>`).join('')}</span><b>${t('compat.' + Math.round(k))}</b><span class="muted">${t('wiz.compatKnown')}</span></div>`;
    else if (W.genre2) {
      compat = `<div class="compat unk"><span class="muted">${t('wiz.compatBlend')}</span></div>`;
    } else compat = `<div class="compat unk">${icon('search')}<span class="muted">${t('wiz.compatUnknown')}</span></div>`;
  }
  return `
    <div class="wz-sec">
      <div class="lbl">${t('wiz.title')}</div>
      <div class="row"><input class="input" id="w-title" maxlength="28" value="${esc(W.title)}" placeholder="${t('wiz.titlePh')}" autocomplete="off"><button class="btn" data-act="w-dice" data-tip="${t('wiz.dice')}">${icon('dice')}</button></div>
    </div>
    ${seqs.length ? `<div class="wz-sec"><div class="lbl">${t('wiz.sequel')}</div><div class="row wrap">${seqs.map((g) => `<button class="chip btnchip ${W.sequelOf === g.id ? 'on' : ''}" data-act="w-seq" data-id="${g.id}">${glyphImg(TOPIC[g.topic].glyph, '#fff', 16, false)}${esc(g.title)}<span class="muted">${g.score.toFixed(1)}</span></button>`).join('')}</div></div>` : ''}
    <div class="wz-sec"><div class="lbl">${t('wiz.topic')}</div><div class="tiles">${tiles}</div></div>
    <div class="wz-sec"><div class="lbl">${t('wiz.genre')}</div><div class="tiles g">${genres.map((g) => genreTile(g, 1)).join('')}</div>${compat}</div>
    ${G.u.flags.genre2 ? `<div class="wz-sec"><div class="lbl">${t('wiz.genre2')} <span class="faint">· ${t('wiz.optional')}</span></div><div class="tiles g">${genres.map((g) => genreTile(g, 2)).join('')}</div></div>` : ''}`;
}

function stepMarket(G) {
  const year = yearOf(G.t);
  const yf = yfOf(G.t);
  const plats = PLATFORMS.filter((p) => yf >= p.y0 + p.m0 / 12 - 0.01 && platformOpen(G, p.id));
  let tot = 0;
  for (const p of PLATFORMS) tot += potential(p, yf);
  const cards = plats
    .sort((a, b) => potential(b, yf) - potential(a, yf))
    .map((p) => {
      const owned = G.licenses.includes(p.id);
      const share = (potential(p, yf) / tot) * 100;
      const tier = platTier(p, year);
      const need = SCOPES[W.scope].minTier;
      const tooWeak = tier < need;
      const fit = W.genre ? platFit(p.id, W.genre, W.genre2) : 1;
      const stars = fit >= 1.2 ? 3 : fit >= 1.0 ? 2 : fit >= 0.85 ? 1 : 0;
      const lc = licenseCost(G, p.id);
      return `<div class="plat ${W.platform === p.id ? 'sel' : ''} ${owned ? '' : 'unowned'} ${tooWeak ? 'weak' : ''}" data-act="w-plat" data-id="${p.id}">
        <div class="pg" style="--c:${p.color}">${glyphImg('gp_' + p.kind, p.color, 32, true)}</div>
        <div class="pi">
          <div class="row"><b>${esc(p.id === 'pc' ? pcGeneration(year) : p.name)}</b><span class="faint" style="font-size:11px">${esc(p.maker)}</span></div>
          <div class="row" style="gap:12px;margin-top:5px">
            <div style="flex:1" data-tip="${t('wiz.share')}">${bar(Math.min(100, share * 3.2), p.color, 'thin')}<div class="faint" style="font-size:10.5px;margin-top:3px">${t('wiz.share')} ${share.toFixed(0)}%</div></div>
            <div data-tip="${t('wiz.tier')}"><span class="pips">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<i class="${i <= tier ? 'on' : ''}"></i>`).join('')}</span><div class="faint" style="font-size:10.5px;margin-top:3px">${t('wiz.tierLabel')} ${tier}</div></div>
            ${W.genre ? `<div data-tip="${t('wiz.genreFit')}"><span class="stars">${[0, 1, 2].map((i) => `<i class="${i < stars ? 'on' : ''}">${icon('star')}</i>`).join('')}</span><div class="faint" style="font-size:10.5px;margin-top:3px">${t('wiz.fit')}</div></div>` : ''}
          </div>
        </div>
        <div class="pr">${owned ? `<span class="tag" style="--c:var(--good)">${t('wiz.owned')}</span>` : `<button class="btn sm gold" data-act="w-buy" data-id="${p.id}" ${G.money < lc ? 'disabled' : ''}>${icon('cart')}${money(lc)}</button>`}${tooWeak ? `<span class="tag" style="--c:var(--bug)">${t('wiz.tooOld')}</span>` : ''}</div>
      </div>`;
    })
    .join('');
  const audiences = AUDIENCES.filter((a) => G.u.aud.includes(a.id));
  const scopes = SCOPE_IDS.map((id) => {
    const sc = SCOPES[id];
    const unlocked = G.u.scopes.includes(id);
    const tier = platTier(PLATFORM[W.platform], year);
    const weak = tier < sc.minTier;
    const rd = teamReadiness(G, { ...W, scope: id });
    const [vk, vtxt] = verdict(rd.r);
    return `<button class="card scope ${W.scope === id ? 'sel' : ''} ${!unlocked || weak ? 'lockd' : ''}" data-act="w-scope" data-id="${id}" ${!unlocked ? 'disabled' : ''}>
      <div class="row"><b class="disp" style="font-size:22px">${L(sc.name)}</b><span class="sp"></span>${unlocked ? (weak ? `<span class="tag" style="--c:var(--bug)">${t('wiz.needTier', { n: sc.minTier })}</span>` : `<span class="tag" style="--c:${VCOL[vk]}">${t(vtxt)}</span>`) : icon('lock')}</div>
      <div class="hint" style="margin:4px 0 8px">${unlocked ? L(sc.desc) : t('wiz.locked')}</div>
      <div class="row" style="gap:14px;font-size:12px"><span>${icon('clock')} ${sc.weeks + sc.polish} ${t('ui.weeksShort')}</span><span>${icon('team')} ${t('wiz.idealTeam', { n: sc.team })}</span></div>
    </button>`;
  }).join('');
  const engines = G.u.flags.engines && G.engines.length
    ? `<div class="wz-sec"><div class="lbl">${t('wiz.engine')}</div><div class="seg wrap-seg"><button class="${!W.engineId ? 'on' : ''}" data-act="w-eng" data-id="">${t('wiz.noEngine')}</button>${G.engines.map((e) => `<button class="${W.engineId === e.id ? 'on' : ''}" data-act="w-eng" data-id="${e.id}">${esc(e.name)} <span class="faint">+${Math.round((engineMult(e, yfOf(G.t)) - 1) * 100)}%</span></button>`).join('')}</div></div>`
    : '';
  return `
    <div class="wz-sec"><div class="lbl">${t('wiz.platform')}</div><div class="plats">${cards}</div></div>
    <div class="wz-sec"><div class="lbl">${t('wiz.scope')}</div><div class="grid scopes">${scopes}</div></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
      <div class="wz-sec"><div class="lbl">${t('wiz.audience')}</div><div class="seg">${audiences.map((a) => `<button class="${W.audience === a.id ? 'on' : ''}" data-act="w-aud" data-id="${a.id}">${L(a.name)}</button>`).join('')}</div></div>
      ${engines}
    </div>`;
}

function stepFocus(G) {
  const cats = phaseCats(G, 0);
  const ideal = G.know.focus[W.genre] ? idealFocus(G, W.genre, 0, W.genre2) : null;
  return `
    <div class="wz-sec">
      <div class="lbl">${t(PHASES[0].name.en ? 'dev.p1' : 'dev.p1')} · ${t('wiz.focusTitle')}</div>
      <p class="hint" style="margin:4px 0 14px">${t('wiz.focusHelp')}</p>
      ${focusHTML(cats, W.focus, ideal, 'wf')}
      <div class="row" style="margin-top:14px;gap:8px">
        ${ideal ? '' : `<span class="hint">${icon('info')} ${t('wiz.focusUnknown')}</span>`}
        <span class="sp"></span>
        ${ideal ? `<button class="btn sm" data-act="w-ideal">${icon('target')}${t('wiz.useIdeal')}</button>` : ''}
        <button class="btn sm" data-act="w-even">${icon('sliders')}${t('wiz.even')}</button>
      </div>
    </div>`;
}

function summary(G) {
  const topic = W.topic ? TOPIC[W.topic] : null;
  const genre = W.genre ? GENRE[W.genre] : null;
  const plat = PLATFORM[W.platform];
  const sc = SCOPES[W.scope];
  const rd = teamReadiness(G, W);
  const [vk, vtxt] = verdict(rd.r);
  const title = W.title || t('wiz.untitled');
  const cover = topic && genre ? coverImg({ id: 4242, title, topic: W.topic, genre: W.genre, platform: W.platform }, 120, 'big') : `<div class="cover-ph">${icon('gamepad')}</div>`;
  const cost = G.licenses.includes(W.platform) ? 0 : licenseCost(G, W.platform);
  return `
    <div class="wz-cover">${cover}</div>
    <div class="h3" style="margin:12px 0 6px;overflow-wrap:anywhere">${esc(title)}</div>
    <div class="row wrap" style="gap:5px;margin-bottom:12px">
      ${genre ? `<span class="chip c" style="--c:${genre.color}">${L(genre.name)}</span>` : ''}
      ${W.genre2 ? `<span class="chip c" style="--c:${GENRE[W.genre2].color}">${L(GENRE[W.genre2].name)}</span>` : ''}
      ${topic ? `<span class="chip">${L(topic.name)}</span>` : ''}
    </div>
    <div class="kv"><span>${t('wiz.platform')}</span><b>${esc(plat.id === 'pc' ? pcGeneration(yearOf(G.t)) : plat.name)}</b></div>
    <div class="kv"><span>${t('wiz.scope')}</span><b>${L(sc.name)}</b></div>
    <div class="kv"><span>${t('wiz.duration')}</span><b>${sc.weeks + sc.polish} ${t('ui.weeksShort')}</b></div>
    <div class="kv"><span>${t('wiz.team')}</span><b>${workers(G).length} ${t('wiz.people')}</b></div>
    <div class="kv"><span>${t('wiz.startHype')}</span><b>${Math.round(baseHype(G) + (W.sequelOf ? 8 : 0))}</b></div>
    ${cost ? `<div class="kv"><span>${t('wiz.license')}</span><b>${money(cost)}</b></div>` : ''}
    <div class="ready" style="--c:${VCOL[vk]}">
      <div class="row"><span class="lbl">${t('wiz.readiness')}</span><span class="sp"></span><b style="color:${VCOL[vk]}">${t(vtxt)}</b></div>
      ${bar(clamp((rd.r / 2) * 100, 4, 100), VCOL[vk], 'tall')}
      <div class="hint" style="margin-top:6px">${t('wiz.readyHelp')}</div>
    </div>`;
}

const STEPS = ['wiz.s1', 'wiz.s2', 'wiz.s3'];
const stepper = () => `<div class="stepper">${STEPS.map((s, i) => `<button class="st ${i === W.step ? 'on' : i < W.step ? 'done' : ''}" data-act="w-go" data-i="${i}"><span class="n">${i < W.step ? icon('check') : i + 1}</span><span class="tx">${t(s)}</span></button>`).join('<i class="sl"></i>')}</div>`;

regWin({
  id: 'wizard',
  icon: 'plus',
  color: 'var(--accent)',
  size: 'xl',
  title: () => t('wiz.head'),
  sub: () => '',
  headExtra: () => stepper(),
  render(G) {
    const body = W.step === 0 ? stepConcept(G) : W.step === 1 ? stepMarket(G) : stepFocus(G);
    return `<div class="wz"><div class="wz-main">${body}</div><aside class="wz-side card">${summary(G)}</aside></div>`;
  },
  foot(G) {
    const canNext = W.step === 0 ? W.topic && W.genre : W.step === 1 ? W.platform && G.licenses.includes(W.platform) && platTier(PLATFORM[W.platform], yearOf(G.t)) >= SCOPES[W.scope].minTier : true;
    const weak = W.step === 1 && platTier(PLATFORM[W.platform], yearOf(G.t)) < SCOPES[W.scope].minTier;
    const hint = W.step === 0 && !(W.topic && W.genre) ? t('wiz.pick') : W.step === 1 && !G.licenses.includes(W.platform) ? t('wiz.needLicense') : weak ? t('wiz.weakHint') : '';
    return `${W.step > 0 ? `<button class="btn" data-act="w-prev">${icon('back')}${t('ui.back')}</button>` : ''}<span class="hint sp" style="text-align:right">${hint}</span>
      ${W.step < 2 ? `<button class="btn primary lg" data-act="w-next" ${canNext ? '' : 'disabled'}>${t('ui.next')}${icon('arrow')}</button>` : `<button class="btn gold lg" data-act="w-start">${icon('rocket')}${t('wiz.start')}</button>`}`;
  },
  bind(el, G) {
    const inp = $('#w-title', el);
    if (inp) inp.addEventListener('input', () => {
      W.title = inp.value;
      W.titleAuto = false;
      const side = $('.wz-side', el);
      if (side) side.innerHTML = summary(G);
    });
    if (W.step === 2) {
      const cats = phaseCats(G, 0);
      const ideal = G.know.focus[W.genre] ? idealFocus(G, W.genre, 0, W.genre2) : null;
      bindFocus(el, cats, W.focus, ideal, 'wf', () => {});
    }
  },
  canOpen: (G) => (G.job ? t('err.busy') : true),
  onOpen: (G) => {
    if (W.keep) {
      W.keep = false;
      return;
    }
    reset(G);
  },
});

// Uppföljarens titel: "Foo" -> "Foo 2", "Foo 2" -> "Foo 3" (bara seriens eget nummer tas bort)
function sequelTitle(g) {
  const n = g.chain >= 2 ? g.chain : 1;
  const base = n >= 2 ? g.title.replace(new RegExp('\\s+' + n + '$'), '') : g.title;
  return base + ' ' + (n + 1);
}
export function openSequel(G, g) {
  if (G.job) {
    toast(t('err.busy'), 'bad');
    return;
  }
  reset(G);
  W.sequelOf = g.id;
  W.topic = g.topic;
  W.genre = g.genre;
  W.genre2 = g.genre2;
  W.title = sequelTitle(g);
  W.titleAuto = false;
  W.focus = null;
  prefill(G);
  W.step = 1;
  W.keep = true;
  UI.open('wizard', null, { force: true });
}

function prefill(G) {
  if (!W.topic || !W.genre) return;
  if (!W.title) {
    const rt = randomTitle(Math.random);
    W.title = rt[lang];
  }
  if (!W.focus) W.focus = defaultFocus(G, W.genre, W.genre2)[0];
}

act('w-topic', (el) => {
  const G = UI.app.G;
  W.topic = el.dataset.id;
  W.sequelOf = null;
  W.focus = null;
  if (W.titleAuto) W.title = '';
  prefill(G);
  UI.refresh();
});
act('w-genre', (el) => {
  const G = UI.app.G;
  W.genre = el.dataset.id;
  if (W.genre2 === W.genre) W.genre2 = null;
  W.focus = null;
  prefill(G);
  UI.refresh();
});
act('w-genre2', (el) => {
  const G = UI.app.G;
  W.genre2 = W.genre2 === el.dataset.id ? null : el.dataset.id;
  W.focus = null;
  prefill(G);
  UI.refresh();
});
act('w-seq', (el) => {
  const G = UI.app.G;
  const g = G.games.find((x) => x.id === +el.dataset.id);
  if (!g) return;
  if (W.sequelOf === g.id) {
    W.sequelOf = null;
  } else {
    W.sequelOf = g.id;
    W.topic = g.topic;
    W.genre = g.genre;
    W.genre2 = g.genre2;
    W.focus = null;
    W.title = sequelTitle(g);
    W.titleAuto = false;
    prefill(G);
  }
  UI.refresh();
});
act('w-dice', () => {
  const rt = randomTitle(Math.random);
  W.title = rt[lang];
  W.titleAuto = false;
  UI.refresh();
});
act('w-plat', (el, e) => {
  if (e.target.closest('[data-act="w-buy"]')) return;
  W.platform = el.dataset.id;
  UI.refresh();
});
act('w-buy', (el, e) => {
  e.stopPropagation();
  const G = UI.app.G;
  const r = buyLicense(G, el.dataset.id);
  if (r === true) {
    W.platform = el.dataset.id;
    sfx.play('coin');
    toast(t('toast.license', { name: `<b>${PLATFORM[el.dataset.id].name}</b>` }), 'money');
  } else if (typeof r === 'string') toast(r, 'bad');
  UI.refresh();
});
act('w-scope', (el) => {
  W.scope = el.dataset.id;
  UI.refresh();
});
act('w-aud', (el) => {
  W.audience = el.dataset.id;
  UI.refresh();
});
act('w-eng', (el) => {
  W.engineId = el.dataset.id ? +el.dataset.id : null;
  UI.refresh();
});
act('w-go', (el) => {
  const i = +el.dataset.i;
  const G = UI.app.G;
  if (i > 0 && !(W.topic && W.genre)) return;
  if (i > 1 && !G.licenses.includes(W.platform)) return;
  W.step = i;
  prefill(G);
  UI.refresh();
});
act('w-prev', () => {
  W.step = Math.max(0, W.step - 1);
  UI.refresh();
});
act('w-next', () => {
  const G = UI.app.G;
  prefill(G);
  W.step = Math.min(2, W.step + 1);
  UI.refresh();
});
act('w-ideal', () => {
  const G = UI.app.G;
  W.focus = idealFocus(G, W.genre, 0, W.genre2);
  UI.refresh();
});
act('w-even', () => {
  const G = UI.app.G;
  const cats = phaseCats(G, 0);
  const raw = {};
  for (const c of cats) raw[c] = 100 / cats.length;
  W.focus = normFocus(cats, raw);
  UI.refresh();
});
act('w-start', () => {
  const G = UI.app.G;
  const r = startProject(G, { title: W.title, topic: W.topic, genre: W.genre, genre2: W.genre2, platform: W.platform, scope: W.scope, audience: W.audience, engineId: W.engineId, sequelOf: W.sequelOf, focus0: W.focus });
  if (typeof r === 'string') {
    toast(r === 'tier' ? t('wiz.tooOld') : r, 'bad');
    return;
  }
  if (G.flags.hypeNext) {
    r.hype = Math.min(100, r.hype + G.flags.hypeNext);
    G.flags.hypeNext = 0;
  }
  UI.close(true);
  sfx.play('start');
  toast(t('toast.started', { title: `<b>${esc(r.title)}</b>` }), 'good');
  UI.app.setSpeed(UI.app.speed || 2);
});
