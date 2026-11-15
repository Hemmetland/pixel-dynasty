// Fokus per fas: antingen följer teamet genrens ideal så fort studion har lärt sig det (standard), eller så kommer en ruta i början av varje fas
// och du drar i triangeln själv. Är idealet okänt kommer rutan alltid, för att hitta det är en del av spelet. Bara gränssnittet väljer: simuleringen
// ger samma resultat som när du själv trycker "Gå vidare" med startfördelningen, som är idealet när det är känt.
import { t } from './core.js';

export const PFOCUS = ['auto', 'manual'];
export const pfocusOf = (s) => (s && s.pfocus === 'manual' ? 'manual' : 'auto');
export const pfocusSeg = (s) => `<div class="seg">${PFOCUS.map((k) => `<button class="${pfocusOf(s) === k ? 'on' : ''}" data-act="set-pf" data-v="${k}">${t('set.pf.' + k)}</button>`).join('')}</div>`;
