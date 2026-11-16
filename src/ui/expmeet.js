// Expansionsmötet: ett viktigt meddelande där teamet som sköter ett onlinespel tar upp frågan om en expansion och lägger fram
// några förslag på riktning. Spelaren väljer vilken som byggs eller skjuter upp (se sim/expmeet.js och sim/expdirs.js).
import { esc, icon, t, L, UI, act, money, errToast, toast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { avatarImg } from '../render/people.js';
import { expMeetOptions, resolveExpMeet } from '../sim/expmeet.js';
import { EXP_DIRS } from '../sim/expdirs.js';
import { SCOPES, WEEKS_PER_MONTH } from '../sim/const.js';

// Raderna under ett förslag: bra (grönt), dåligt (rött) eller bara en upplysning. Nycklarna skrivs ut så att nyckelkontrollen ser dem.
const TAG = {
  safe: { k: 'exd.tag.safe', c: '' },
  big: { k: 'exd.tag.big', c: '' },
  buyUp: { k: 'exd.tag.buyUp', c: 'good' },
  talk: { k: 'exd.tag.talk', c: 'good' },
  bugUp: { k: 'exd.tag.bugUp', c: 'bug' },
  bugDown: { k: 'exd.tag.bugDown', c: 'good' },
  age: { k: 'exd.tag.age', c: 'good' },
  shield: { k: 'exd.tag.shield', c: 'good' },
  small: { k: 'exd.tag.small', c: '' },
  cheap: { k: 'exd.tag.cheap', c: 'good' },
  buyDown: { k: 'exd.tag.buyDown', c: 'bug' },
};
const NAME = { more: 'exd.more.n', world: 'exd.world.n', systems: 'exd.systems.n', rival: 'exd.rival.n', fast: 'exd.fast.n' };
const PITCH = { more: 'exd.more.d', world: 'exd.world.d', systems: 'exd.systems.d', rival: 'exd.rival.d', fast: 'exd.fast.d' };

export function expMeetPrompt(app, G, p, finish) {
  const M = expMeetOptions(G, p);
  if (!M) return finish();
  const g = M.game;
  const lead = M.lead;
  const intro = t(M.reason === 'years' ? 'em.intro.years' : 'em.intro.fresh', { lead: esc(lead ? lead.name : L(M.name)), title: `<b>${esc(g.title)}</b>`, n: M.fresh, m: Math.round(M.gap / WEEKS_PER_MONTH) });
  const card = (o) => {
    const d = EXP_DIRS[o.dir];
    const why = o.ok === true ? '' : o.ok === 'money' ? t('err.money') : t('tm.err.' + o.ok);
    const chips = d.tags.map((k) => `<span class="chip em-tag ${TAG[k].c}">${t(TAG[k].k)}</span>`).join('');
    const q = o.quote;
    return `<button class="choice em-opt${o.rec ? ' rec' : ''}" data-act="em-pick" data-dir="${o.dir}" ${o.ok === true ? '' : 'disabled'}>
      <b>${icon(o.rec ? 'star' : 'hammer')} ${t(NAME[o.dir])}${o.rec ? `<span class="tag em-rec" style="--c:var(--gold)">${t('em.rec')}</span>` : ''}</b>
      <span class="muted">${t(PITCH[o.dir])}</span>
      ${q ? `<span class="row wrap" style="gap:6px"><span class="tag" style="--c:var(--money)">${money(q.cost)}</span><span class="chip">${t('em.weeks', { n: q.weeks })}</span><span class="chip">${L(SCOPES[q.scope].name)}</span></span>` : ''}
      <span class="row wrap" style="gap:6px">${chips}</span>
      ${why ? `<span class="muted" style="color:var(--bug)">${why}</span>` : ''}
    </button>`;
  };
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--hot)">${icon('team')}</div><h2>${t('em.title')}<div class="sub">${esc(L(M.name))} · ${esc(g.title)}</div></h2></div>
    <div class="win-body">
      <div class="em-lead">${lead ? `<div class="sc-av">${avatarImg(lead.look, 3, 'stand')}</div>` : ''}<p class="evtext">${intro}</p></div>
      <div class="lbl" style="margin:12px 0 8px">${t('em.props')}</div>
      <div class="choices">${M.opts.map(card).join('')}</div>
      <div class="choices" style="margin-top:10px"><button class="choice" data-act="em-later"><b>${icon('clock')} ${t('em.later')}</b><span class="muted">${t('em.laterD')}</span></button></div>
    </div>`,
    () => {
      act('em-pick', (b) => {
        const r = resolveExpMeet(G, p.id, b.dataset.dir);
        if (r !== true) {
          errToast(r);
          // ett team som inte längre kan bygga lämnar mötet: rutan stängs
          if (!G.pending.some((x) => x.id === p.id)) finish();
          return;
        }
        sfx.play('start');
        toast(t('em.went', { title: esc(g.title) }), 'good');
        finish();
      });
      act('em-later', () => {
        resolveExpMeet(G, p.id, 'later');
        sfx.play('click');
        finish();
      });
    },
    'lg',
  );
  sfx.play('notify');
}
