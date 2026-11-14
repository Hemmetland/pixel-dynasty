// Spelets tempo: hur fort tiden går. Bara klockan i gränssnittet skalas, själva spelreglerna är desamma (och simuleringen
// ger samma resultat), så ett lugnt tempo ändrar inte poängen, bara hur mycket tid man får på sig att läsa och välja.
import { t } from './core.js';

export const PACES = ['calm', 'normal'];
export const PACE_MULT = { calm: 0.6, normal: 1 };
export const paceOf = (s) => (PACE_MULT[s && s.pace] ? s.pace : 'normal');
export const paceSeg = (s) => `<div class="seg">${PACES.map((k) => `<button class="${paceOf(s) === k ? 'on' : ''}" data-act="set-pace" data-v="${k}">${t('set.pace.' + k)}</button>`).join('')}</div>`;
