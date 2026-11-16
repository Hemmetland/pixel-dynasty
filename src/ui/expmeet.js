// Teammötet: ett viktigt meddelande där ett team tar upp nästa uppdrag och lägger fram tre förslag. Tre sorter (sim/expmeet.js):
// en expansion till ett onlinespel, en uppföljare till ett spel som gått bra och idéer till ett helt nytt spel. Spelaren väljer
// vilket som byggs eller skjuter upp.
import { esc, icon, t, L, UI, act, money, errToast, toast } from './core.js';
import { sfx } from '../audio/sfx.js';
import { glyphImg } from '../render/glyphs.js';
import { avatarImg } from '../render/people.js';
import { expMeetOptions, resolveExpMeet } from '../sim/expmeet.js';
import { dirOf } from '../sim/expdirs.js';
import { SCOPES, WEEKS_PER_MONTH } from '../sim/const.js';
import { TOPIC } from '../data/topics.js';
import { GENRE } from '../data/genres.js';

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
  hypeUp: { k: 'exd.tag.hypeUp', c: 'good' },
  fresher: { k: 'exd.tag.fresher', c: 'good' },
  bigSeq: { k: 'exd.tag.bigSeq', c: '' },
  smallSeq: { k: 'exd.tag.smallSeq', c: '' },
};
const NAME = { more: 'exd.more.n', world: 'exd.world.n', systems: 'exd.systems.n', rival: 'exd.rival.n', fast: 'exd.fast.n', same: 'exd.same.n', bigger: 'exd.bigger.n', twist: 'exd.twist.n', quick: 'exd.quick.n' };
const PITCH = { more: 'exd.more.d', world: 'exd.world.d', systems: 'exd.systems.d', rival: 'exd.rival.d', fast: 'exd.fast.d', same: 'exd.same.d', bigger: 'exd.bigger.d', twist: 'exd.twist.d', quick: 'exd.quick.d' };
const COMPAT_COL = { 4: 'good', 3: '', 2: '', 1: 'bug' };

export function expMeetPrompt(app, G, p, finish) {
  const M = expMeetOptions(G, p);
  if (!M) return finish();
  const g = M.game;
  const lead = M.lead;
  const k = M.kind;
  const who = esc(lead ? lead.name : L(M.name));
  const title = g ? `<b>${esc(g.title)}</b>` : '';
  const intro =
    k === 'new' ? t('em.intro.new', { lead: who })
    : k === 'sequel' ? t('em.intro.sequel', { lead: who, title, score: M.score.toFixed(1) })
    : t(M.reason === 'years' ? 'em.intro.years' : 'em.intro.fresh', { lead: who, title, n: M.fresh, m: Math.round(M.gap / WEEKS_PER_MONTH) });
  const head = t(k === 'new' ? 'em.title.new' : k === 'sequel' ? 'em.title.sequel' : 'em.title');
  const sub = g ? `${esc(L(M.name))} · ${esc(g.title)}` : esc(L(M.name));
  // själva förslaget: en riktning (expansion, uppföljare) eller en idé (nytt spel)
  const body = (o) => {
    if (o.combo) {
      const ge = GENRE[o.combo.genre];
      const mix = o.combo.genre2 ? ` + ${L(GENRE[o.combo.genre2].name)}` : '';
      const chips = `<span class="chip em-tag ${COMPAT_COL[o.compat] || ''}">${t('compat.' + o.compat)}</span>${o.known ? `<span class="chip em-tag good">${t('em.tag.known')}</span>` : ''}${o.novel ? `<span class="chip em-tag">${t('em.tag.novel')}</span>` : ''}`;
      return { name: `${glyphImg(ge.glyph, ge.color, 16, false)} ${L(ge.name)}${mix} · ${L(TOPIC[o.combo.topic].name)}`, pitch: t('em.new.d'), chips };
    }
    const d = dirOf(o.dir);
    return { name: t(NAME[o.dir]), pitch: t(PITCH[o.dir]), chips: d.tags.map((x) => `<span class="chip em-tag ${TAG[x].c}">${t(TAG[x].k)}</span>`).join('') };
  };
  const card = (o) => {
    const B = body(o);
    const why = o.ok === true ? '' : o.ok === 'money' ? t('err.money') : t('tm.err.' + o.ok);
    const q = o.quote;
    return `<button class="choice em-opt${o.rec ? ' rec' : ''}" data-act="em-pick" data-key="${o.key}" ${o.ok === true ? '' : 'disabled'}>
      <b>${o.combo ? '' : icon(o.rec ? 'star' : 'hammer') + ' '}${B.name}${o.rec ? `<span class="tag em-rec" style="--c:var(--gold)">${t('em.rec')}</span>` : ''}</b>
      <span class="muted">${B.pitch}</span>
      ${q ? `<span class="row wrap" style="gap:6px"><span class="tag" style="--c:var(--money)">${money(q.cost)}</span><span class="chip">${t('em.weeks', { n: q.weeks })}</span><span class="chip">${L(SCOPES[q.scope].name)}</span></span>` : ''}
      <span class="row wrap" style="gap:6px">${B.chips}</span>
      ${why ? `<span class="muted" style="color:var(--bug)">${why}</span>` : ''}
    </button>`;
  };
  UI.modal(`
    <div class="win-head"><div class="wi" style="--wc:var(--hot)">${icon('team')}</div><h2>${head}<div class="sub">${sub}</div></h2></div>
    <div class="win-body">
      <div class="em-lead">${lead ? `<div class="sc-av">${avatarImg(lead.look, 3, 'stand')}</div>` : ''}<p class="evtext">${intro}</p></div>
      <div class="lbl" style="margin:12px 0 8px">${t('em.props')}</div>
      <div class="choices">${M.opts.map(card).join('')}</div>
      <div class="choices" style="margin-top:10px"><button class="choice" data-act="em-later"><b>${icon('clock')} ${t('em.later')}</b><span class="muted">${t(k === 'new' ? 'em.laterNew' : 'em.laterD')}</span></button></div>
    </div>`,
    () => {
      act('em-pick', (b) => {
        const r = resolveExpMeet(G, p.id, b.dataset.key);
        if (r !== true) {
          errToast(r);
          // ett team som inte längre kan bygga lämnar mötet: rutan stängs
          if (!G.pending.some((x) => x.id === p.id)) finish();
          return;
        }
        sfx.play('start');
        toast(t(k === 'new' ? 'em.went.new' : 'em.went', { title: g ? esc(g.title) : '' }), 'good');
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
