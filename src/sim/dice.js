// Tärningar utan slump: ett tal ur fröet och en nyckel (hashStr), så att samma frö ger samma utfall oavsett vad som hänt i G.rng.
// Varje system tar ett eget namnområde (dice('folk')), så att deras tal inte hänger ihop.
import { hashStr } from '../core/rng.js';

export function dice(ns) {
  // 0 till 4294967295 (hashStr sprider tätt följande tal ojämnt, så resultatet blandas en gång till)
  const h32 = (G, tag) => {
    let h = hashStr(`${G.seed || 0}|${ns}|${tag}`);
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  };
  return { h32, u01: (G, tag) => h32(G, tag) / 4294967296 };
}
