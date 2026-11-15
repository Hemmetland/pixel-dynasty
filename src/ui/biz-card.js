import { t, UI, act, esc } from './core.js';
import { lang } from '../core/i18n.js';
import { sfx } from '../audio/sfx.js';
import { seg } from './group-tab.js';
import { BIZ_PUB, BIZ_FILM, BIZ_RESERVE, bizOpen, bizOf, setBiz } from '../sim/bizdept.js';
import { canPublish } from '../sim/publish.js';
import { canFranchise } from '../sim/franchise.js';

// Affärsavdelningens kort: överst i förlagsfliken. Vad den får göra och hur kräsen den ska vara.
const num = (v) => String(v).replace('.', lang === 'sv' ? ',' : '.') + '+';
const onOff = () => [t('board.off'), t('board.on')];
export function bizCard(G) {
  if (!bizOpen(G)) return canPublish(G) && canFranchise(G) ? `<p class="hint" style="margin-bottom:12px">${t('biz.needResearch')}</p>` : '';
  const b = bizOf(G);
  const blk = (label, ctl) => `<div><div class="lbl" style="margin-bottom:6px">${label}</div>${ctl}</div>`;
  const ctl = `<div class="grp-ctl">
    ${blk(t('biz.pub'), seg(onOff(), b.pub, 'bz-set', 'pub', () => t('biz.pubTip')))}
    ${blk(t('biz.pubLvl'), seg(BIZ_PUB.map(num), b.pubLvl, 'bz-set', 'pubLvl', () => t('biz.pubLvlTip')))}
    ${blk(t('biz.lic'), seg(onOff(), b.lic, 'bz-set', 'lic', () => t('biz.licTip')))}
    ${blk(t('biz.filmLvl'), seg(BIZ_FILM.map(num), b.filmLvl, 'bz-set', 'filmLvl', () => t('biz.filmLvlTip')))}
  </div>`;
  const tot = b.signed || b.taken ? `<p class="hint" style="margin-top:8px">${t('biz.totals', { a: b.signed, b: b.taken })}</p>` : '';
  return `<div class="card" style="margin-bottom:14px"><div class="lbl" style="margin-bottom:6px">${esc(t('biz.title'))}</div>
    <p class="hint" style="margin-bottom:10px">${t('biz.help', { n: BIZ_RESERVE })}</p>${ctl}${tot}</div>`;
}

act('bz-set', (el) => {
  if (setBiz(UI.app.G, el.dataset.id, +el.dataset.i)) sfx.play('click');
  UI.refresh();
});
