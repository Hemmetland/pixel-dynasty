// Affärsavdelning (research b_biz): sköter förlaget och licensaffärerna åt dig. Du anger vad den får göra (G.bz): skriva på pitchar
// som har ett tillräckligt högt betyg i demons mitt, och ta emot licensaffärer (prylar och serietidningar alltid, film när rykets mitt
// är tillräckligt högt). Den skriver bara på när kassan efter förskottet är minst BIZ_RESERVE månader av kostnaderna, tar aldrig
// mer än avtalsplatserna räcker till, och lägger fram en rapport varje kvartal. Pitchar och erbjudanden som den tar hand om ger
// inga egna nyheter. Allt är deterministiskt och drar inget ur G.rng.
import { clamp, fmtMoney } from '../core/util.js';
import { note } from './news.js';
import { beat } from './life.js';
import { burnOf } from './board.js';
import { canPublish, pubOf, canSign, signPitch } from './publish.js';
import { canFranchise, frOf, canAccept, acceptOffer } from './franchise.js';

export const BIZ_RESERVE = 6; // månader av kostnader som ska finnas kvar i kassan efter ett förskott
export const BIZ_PUB = [8, 7.5, 7]; // lägsta mitt i demons betygsintervall: bara de bästa, bra, det mesta
export const BIZ_FILM = [7.5, 7, 6.5]; // lägsta mitt i filmens ryktesintervall
export const bizOpen = (G) => !!G.u.flags.bizAuto;
const fresh = () => ({ pub: 0, lic: 0, pubLvl: 2, filmLvl: 2, signed: 0, taken: 0, q: { signed: 0, taken: 0, up: 0 } });
export const bizOf = (G) => G.bz || (G.bz = fresh());
// Är avdelningen igång för förlaget (pub) eller licenserna (lic)? Då tystas deras egna nyheter.
export const bizAuto = (G, kind) => bizOpen(G) && !!G.bz && !!G.bz[kind];

// Policyn: pub och lic är av (0) eller på (1), pubLvl och filmLvl är index i BIZ_PUB och BIZ_FILM
export function setBiz(G, key, v) {
  if (!bizOpen(G) || !['pub', 'lic', 'pubLvl', 'filmLvl'].includes(key)) return false;
  const b = bizOf(G);
  const n = key.endsWith('Lvl') ? clamp(Math.round(v), 0, 2) : v ? 1 : 0;
  if (b[key] === n) return false;
  b[key] = n;
  return true;
}

const mid = (x) => (x.lo + x.hi) / 2;

// Veckovis (efter förlagets och licensernas egna veckosteg): skriv på och ta emot
export function bizWeek(G) {
  if (!bizOpen(G) || !G.bz) return;
  const b = G.bz;
  if (b.pub && canPublish(G)) {
    const reserve = BIZ_RESERVE * burnOf(G);
    for (const p of pubOf(G).pitches.slice().sort((x, y) => mid(y) - mid(x) || x.id - y.id)) {
      if (canSign(G, p.id) !== true) continue;
      if (mid(p) < BIZ_PUB[b.pubLvl] || G.money - p.advance < reserve) continue;
      if (signPitch(G, p.id) === true) {
        b.signed++;
        b.q.signed++;
      }
    }
  }
  if (b.lic && canFranchise(G)) {
    for (const o of frOf(G).offers.slice().sort((x, y) => y.up - x.up || x.id - y.id)) {
      if (o.kind === 'film' && mid(o) < BIZ_FILM[b.filmLvl]) continue;
      if (canAccept(G, o.id) !== true) continue;
      const up = o.up;
      if (acceptOffer(G, o.id) === true) {
        b.taken++;
        b.q.taken++;
        b.q.up += up;
      }
    }
  }
  if (G.t % 12 === 5 && (b.q.signed || b.q.taken)) {
    beat(G, 'grpBiz', { a: b.q.signed });
    note(G, 'news.bizReport', { a: b.q.signed, b: b.q.taken, v: fmtMoney(b.q.up) }, 'info');
    b.q = { signed: 0, taken: 0, up: 0 };
  }
}
