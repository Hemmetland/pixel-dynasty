// Sparade spel: fem platser. Från titelskärmen: ladda, ta bort eller börja ett nytt spel i en tom plats. Under spelets gång:
// ladda ett annat spel (det pågående sparas först), spara det pågående i en annan plats, eller ta bort. Att skriva över eller
// ta bort kräver två klick (knappen blir röd och frågar). arg.pick = ett nytt spel väntar på en plats att skriva över.
import { esc, icon, t, UI, act, regWin, money, toast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { dateOf } from '../sim/const.js';
import { lang } from '../core/i18n.js';
import { slotList, activeSlot, useSlot, saveGame, deleteSave, SLOTS } from '../core/store.js';
import { hideTitle, beginIn, newGameIn, refreshTitle } from './title.js';

const SL = { armed: '' }; // 'del:3' eller 'over:3'

const when = (at) => {
  if (!at) return '';
  try {
    return new Date(at).toLocaleString(lang === 'sv' ? 'sv-SE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '';
  }
};
const playing = (G) => !!G && UI.app.mode === 'play';

function row(x, G, arg) {
  const n = x.slot;
  const m = x.meta;
  const here = playing(G) && n === activeSlot();
  const pick = !!(arg && arg.pick);
  const arm = (k) => SL.armed === `${k}:${n}`;
  const btn = (act_, label, ic, extra = '') => `<button class="btn sm ${extra}" data-act="${act_}" data-n="${n}">${icon(ic)}${label}</button>`;
  const mark = `<span class="rn-i sbig" style="--c:${here ? 'var(--good)' : m ? 'var(--accent)' : 'var(--muted)'}"><b class="num">${n}</b></span>`;
  if (!m) {
    const right = pick ? btn('sl-over', t('slot.useHere'), 'plus') : playing(G) ? btn('sl-saveto', t('slot.saveHere'), 'save') : btn('sl-new', t('slot.new'), 'plus');
    return `<div class="ltier slot vacant">${mark}<div class="slot-i"><b class="faint">${t('slot.empty')}</b></div><div class="slot-b">${right}</div></div>`;
  }
  const d = dateOf(m.t);
  const facts = [d.year, money(m.money), t('slot.games', { n: m.games }), when(m.at)].filter(Boolean).join(' · ');
  const state = here ? `<span class="tag" style="--c:var(--good)">${icon('check')}${t('slot.active')}</span>` : m.over ? `<span class="tag" style="--c:var(--bug)">${icon('skull')}${t('over.title')}</span>` : '';
  let right = '';
  if (pick) right = btn('sl-over', arm('over') ? t('slot.sure') : t('slot.overwrite'), 'save', arm('over') ? 'danger' : '');
  else {
    if (!m.over && !here) right += btn('sl-load', t('slot.load'), 'play', 'primary');
    if (playing(G) && !here) right += btn('sl-saveto', arm('over') ? t('slot.sure') : t('slot.saveHere'), 'save', arm('over') ? 'danger' : '');
    if (!here) right += btn('sl-del', arm('del') ? t('slot.sure') : t('slot.delete'), 'x', arm('del') ? 'danger' : 'ghost');
  }
  return `<div class="ltier slot ${here ? 'on' : ''}">${mark}<div class="slot-i"><div class="row" style="gap:8px"><b>${esc(m.studio)}</b>${state}</div><div class="faint" style="font-size:11.5px">${facts}</div></div>${right ? `<div class="slot-b">${right}</div>` : ''}</div>`;
}

regWin({
  id: 'slots',
  icon: 'save',
  color: 'var(--accent)',
  size: 'sm',
  title: (G) => t(playing(G) ? 'slot.titleGame' : 'slot.title'),
  render(G, arg) {
    const list = slotList();
    return `<p class="hint" style="margin-bottom:10px">${t(arg && arg.pick ? 'slot.helpPick' : playing(G) ? 'slot.helpGame' : 'slot.help', { n: SLOTS })}</p><div class="col" style="gap:8px">${list.map((x) => row(x, G, arg)).join('')}</div>`;
  },
  onClose() {
    SL.armed = '';
  },
});

// Ladda: från titelskärmen eller under spelet (det pågående sparas först i sin plats)
act('sl-load', (el) => {
  const n = +el.dataset.n;
  const app = UI.app;
  SL.armed = '';
  UI.close(true);
  if (app.mode === 'title') hideTitle();
  if (!app.continueGame(n)) toast(t('slot.loadFail'), 'bad');
  else sfx.play('open');
});
// Ta bort en plats (två klick)
act('sl-del', (el) => {
  const k = `del:${el.dataset.n}`;
  if (SL.armed !== k) {
    SL.armed = k;
    return UI.refresh();
  }
  SL.armed = '';
  deleteSave(+el.dataset.n);
  toast(t('slot.deleted'), 'info');
  UI.refresh();
  if (UI.app.mode === 'title') refreshTitle();
});
// Spara det pågående spelet i en annan plats (en upptagen plats skrivs över efter två klick) och fortsätt spela därifrån
act('sl-saveto', (el) => {
  const n = +el.dataset.n;
  const G = UI.app.G;
  const m = slotList().find((x) => x.slot === n).meta;
  const k = `over:${n}`;
  if (m && SL.armed !== k) {
    SL.armed = k;
    return UI.refresh();
  }
  SL.armed = '';
  if (G && saveGame(G, n)) {
    useSlot(n);
    toast(t('slot.savedTo', { n }), 'good');
  } else toast(t('menu.saveFail'), 'bad');
  UI.refresh();
});
// Ett nytt spel i en tom plats, eller i en upptagen plats efter två klick (när alla är upptagna)
act('sl-new', (el) => newGameIn(+el.dataset.n));
act('sl-over', (el) => {
  const n = +el.dataset.n;
  const m = slotList().find((x) => x.slot === n).meta;
  const k = `over:${n}`;
  if (m && SL.armed !== k) {
    SL.armed = k;
    return UI.refresh();
  }
  SL.armed = '';
  beginIn(n);
});
