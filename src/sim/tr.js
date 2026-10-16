// Översättning för simulatorn: texter som skickas till UI via toast/log.
import { t } from '../core/i18n.js';
export function tr(G, key, vars) {
  return t(key, vars);
}
