import { app } from './ui/app.js';
import { buildTitle, showTitle } from './ui/title.js';
import { initTutorial } from './ui/tutorial.js';
import { UI } from './ui/core.js';
import { audioLevel } from './audio/sfx.js';
import * as SIM from './sim/index.js';
import { PLATFORMS, potential, techMult, platTier } from './data/platforms.js';
import { RESEARCH } from './data/research.js';
import { TOPICS } from './data/topics.js';

const root = document.getElementById('app');
app.init(root);
buildTitle(root);
initTutorial(root);
showTitle(app);

// Felsöknings- och testkrokar
window.__pd = app;
window.__ui = UI;
window.__sim = SIM;
window.__audioLevel = audioLevel;
Object.assign(window, { __PL: PLATFORMS, __potential: potential, __techMult: techMult, __platTier: platTier, __RESEARCH: RESEARCH, __TOPICS: TOPICS });
