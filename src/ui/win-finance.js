import { $, esc, icon, t, L, UI, act, regWin, bar, money, moneyFull, toast, MONTHS } from './core.js';
import { sfx } from '../audio/sfx.js';
import { loanLimit, loanTotal, takeLoan, repayLoan, loanInterest, rentOf, facUpkeep } from '../sim/studio.js';
import { payroll } from '../sim/people.js';
import { moneyScale, yearOf, dateOf } from '../sim/const.js';
import { lang } from '../core/i18n.js';
import { liveCostMonth } from '../sim/live.js';
import { plot, gridLines } from './chart.js';

function lineChart(pts, color, w = 560, h = 190) {
  if (pts.length < 2) return `<div class="empty" style="padding:30px">${t('fin.noData')}</div>`;
  const vals = pts.map((p) => p.v);
  let lo = Math.min(0, ...vals);
  let hi = Math.max(...vals, 1);
  if (hi === lo) hi = lo + 1;
  const pad = { l: 8, r: 8, t: 12, b: 20 };
  const X = (i) => pad.l + (i / (pts.length - 1)) * (w - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (h - pad.t - pad.b);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${d} L${X(pts.length - 1)} ${Y(Math.max(lo, 0))} L${X(0)} ${Y(Math.max(lo, 0))} Z`;
  const zero = lo < 0 ? `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(255,107,92,.5)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` : '';
  const last = pts[pts.length - 1];
  const labels = [0, 0.5, 1].map((f) => {
    const i = Math.round(f * (pts.length - 1));
    const d_ = dateOf(pts[i].t);
    return { x: X(i), y: h - 8, text: `${MONTHS[lang][d_.month]} ${d_.year}`, at: f === 0 ? 'start' : f === 1 ? 'end' : 'middle' };
  });
  const svg = `<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".4"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${gridLines(pad.l, w - pad.r, [0.25, 0.5, 0.75].map((f) => pad.t + f * (h - pad.t - pad.b)))}
    ${zero}<path d="${area}" fill="url(#fg)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  return plot({ w, h, svg, labels, dot: { x: X(pts.length - 1), y: Y(last.v), c: color } });
}

const CAT_KEYS = ['sales', 'subs', 'shop', 'servers', 'contracts', 'awards', 'events', 'loan', 'other', 'salaries', 'rent', 'facilities', 'marketing', 'research', 'licenses', 'interest', 'engines', 'office', 'patches', 'ports'];

regWin({
  id: 'finance',
  icon: 'bank',
  color: 'var(--money)',
  size: 'xl',
  title: () => t('fin.title'),
  sub: (G) => `${t('fin.cash')} <b style="color:${G.money < 0 ? 'var(--bug)' : 'var(--money)'}">${moneyFull(G.money)}</b>`,
  render(G) {
    const pts = G.hist.cash.slice(-36);
    const lm = G.lastMonth;
    const net = lm.income - lm.expense;
    const bd = { ...lm.breakdown };
    const rows = Object.entries(bd)
      .filter(([, v]) => Math.abs(v) >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<div class="kv"><span>${t('fin.c.' + k)}</span><b class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : ''}${money(v)}</b></div>`)
      .join('');
    const burn = payroll(G) + rentOf(G) + facUpkeep(G) + loanInterest(G) + liveCostMonth(G);
    const runway = burn > 0 ? Math.max(0, G.money / burn) : 99; // i skuld finns ingen marginal kvar
    const room = Math.max(0, loanLimit(G) - loanTotal(G));
    const step = Math.max(1000, Math.round((20000 * moneyScale(yearOf(G.t))) / 2000) * 1000);
    return `
      <div class="grid" style="grid-template-columns:1.5fr 1fr;gap:20px;align-items:start">
        <div class="col">
          <div class="card"><div class="row" style="margin-bottom:8px"><div class="lbl">${t('fin.cashChart')}</div><span class="sp"></span><span class="chip c" style="--c:${net >= 0 ? 'var(--good)' : 'var(--bug)'}">${net >= 0 ? '▲' : '▼'} ${money(Math.abs(net))}${t('ui.perMonth')}</span></div>${lineChart(pts, '#7cf29a')}</div>
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
            <div class="counter" style="--c:${burn <= 0 ? 'var(--good)' : runway < 3 ? 'var(--bug)' : 'var(--warn)'}"><div class="v num">${money(burn)}</div><div class="k">${t('fin.burn')}</div></div>
            <div class="counter" style="--c:${runway < 3 ? 'var(--bug)' : 'var(--accent)'}"><div class="v num">${runway > 60 ? '∞' : runway.toFixed(1)}</div><div class="k">${t('fin.runway')}</div></div>
            <div class="counter" style="--c:var(--money)"><div class="v num">${money(G.stats.revenue)}</div><div class="k">${t('fin.lifetime')}</div></div>
          </div>
        </div>
        <div class="col">
          <div class="card"><div class="lbl" style="margin-bottom:6px">${t('fin.lastMonth')}</div>${rows || `<div class="muted">${t('fin.noData')}</div>`}
            <div class="divider"></div><div class="kv"><span><b>${t('fin.net')}</b></span><b class="${net >= 0 ? 'up' : 'down'}">${net >= 0 ? '+' : ''}${money(net)}</b></div></div>
          <div class="card"><div class="row"><div class="lbl">${t('fin.loans')}</div><span class="sp"></span><span class="muted num" style="font-size:12px">${money(loanTotal(G))} / ${money(loanLimit(G))}</span></div>
            ${bar((loanTotal(G) / Math.max(1, loanLimit(G))) * 100, 'var(--warn)', 'thin')}
            <p class="hint" style="margin:8px 0">${t('fin.loanHelp')}</p>
            <div class="row wrap" style="gap:6px"><button class="btn sm" data-act="f-loan" data-v="${step}" ${room < step ? 'disabled' : ''}>${icon('plus')}${money(step)}</button><button class="btn sm" data-act="f-loan" data-v="${step * 5}" ${room < step * 5 ? 'disabled' : ''}>${icon('plus')}${money(step * 5)}</button><button class="btn sm" data-act="f-loan" data-v="max" ${room < 1000 ? 'disabled' : ''}>${t('fin.max')}</button><span class="sp"></span><button class="btn sm primary" data-act="f-repay" ${loanTotal(G) < 1 || G.money < 1 ? 'disabled' : ''}>${t('fin.repay')}</button></div>
            ${loanTotal(G) > 0 ? `<div class="hint" style="margin-top:8px">${t('fin.interest', { v: money(loanInterest(G)) })}</div>` : ''}</div>
        </div>
      </div>`;
  },
});
act('f-loan', (el) => {
  const G = UI.app.G;
  const room = Math.max(0, loanLimit(G) - loanTotal(G));
  const amt = el.dataset.v === 'max' ? room : +el.dataset.v;
  const r = takeLoan(G, amt);
  if (r) {
    sfx.play('coin');
    toast(t('toast.loan', { v: `<b>${money(r)}</b>` }), 'money');
  }
  UI.refresh();
});
act('f-repay', () => {
  const G = UI.app.G;
  const r = repayLoan(G, Math.min(G.money, loanTotal(G)));
  if (r) sfx.play('coin');
  UI.refresh();
});
void CAT_KEYS; void $; void esc; void L;
