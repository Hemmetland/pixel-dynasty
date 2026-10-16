// Fördelning av betyg för första spelet (bara grundaren, litet spel).
import * as S from '../src/sim/index.js';
const arch = ['designer', 'coder', 'visionary', 'hustler'];
const scope = process.argv[2] || 'small';
for (const a of arch) {
  const scores = [];
  for (let i = 0; i < 160; i++) {
    const G = S.newGame({ studio: 'T', seed: 100 + i, archetype: a });
    S.makeCompetitors(G); S.initWorld(G);
    const tp = G.u.topics[i % G.u.topics.length];
    const ge = G.u.genres[(i >> 3) % G.u.genres.length];
    S.startProject(G, { title: 'x', topic: tp, genre: ge, platform: 'pc', scope, audience: 'everyone' });
    let guard = 0;
    while (G.job && !G.pending.some((p) => p.type === 'report') && guard++ < 4000) {
      if (G.pending.length) { G.pending.shift(); continue; }
      S.stepTick(G);
    }
    scores.push(G.job.report.score);
  }
  scores.sort((x, y) => x - y);
  const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
  console.log(a.padEnd(10), 'avg', avg.toFixed(2), 'p10', scores[16], 'p50', scores[80], 'p90', scores[144], 'max', scores[159]);
}
