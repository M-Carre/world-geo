'use strict';
/* FSRS-6 (Free Spaced Repetition Scheduler) — réimplémentation fidèle du planificateur de
   py-fsrs 6.3.3 (open-spaced-repetition, licence MIT), poids par défaut publiés.
   Sources : https://github.com/open-spaced-repetition/py-fsrs (fsrs/scheduler.py)
             https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm (section FSRS-6)
   Temps en millisecondes. États : 1 = apprentissage, 2 = révision, 3 = réapprentissage.
   Notes : 1 = À revoir (Again), 2 = Difficile (Hard), 3 = Bien (Good), 4 = Facile (Easy). */
(function (root) {
  const DEFAULT_W = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
  const DAY = 86400000, MIN = 60000;
  const STABILITY_MIN = 0.001;
  const LEARNING = 1, REVIEW = 2, RELEARNING = 3;
  const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;
  const FUZZ_RANGES = [{start: 2.5, end: 7, factor: 0.15}, {start: 7, end: 20, factor: 0.1}, {start: 20, end: Infinity, factor: 0.05}];
  // round() de Python : arrondi au pair le plus proche pour les .5
  const pyRound = x => { const f = Math.floor(x), d = x - f; if (d > 0.5) return f + 1; if (d < 0.5) return f; return f % 2 === 0 ? f : f + 1; };

  function Scheduler(opt = {}) {
    const w = (opt.w || DEFAULT_W).slice();
    const retention = opt.retention || 0.9;
    const learningSteps = opt.learningSteps || [1 * MIN, 10 * MIN];
    const relearningSteps = opt.relearningSteps || [10 * MIN];
    const maxIvl = opt.maximumInterval || 36500;
    const fuzz = opt.fuzz !== false;
    const random = opt.random || Math.random;
    const DECAY = -w[20], FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

    const clampD = d => Math.min(Math.max(d, 1), 10);
    const clampS = s => Math.max(s, STABILITY_MIN);
    const initS = g => clampS(w[g - 1]);
    const initD = (g, clamp) => { const d = w[4] - Math.exp(w[5] * (g - 1)) + 1; return clamp ? clampD(d) : d; };
    const nextIvl = s => { let i = (s / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1); i = pyRound(i); return Math.min(Math.max(i, 1), maxIvl); };
    const shortS = (s, g) => { let inc = Math.exp(w[17] * (g - 3 + w[18])) * Math.pow(s, -w[19]); if (g >= HARD) inc = Math.max(inc, 1); return clampS(s * inc); };
    const nextD = (d, g) => { const a1 = initD(EASY, false); const dd = -(w[6] * (g - 3)); const a2 = d + (10 - d) * dd / 9; return clampD(w[7] * a1 + (1 - w[7]) * a2); };
    const forgetS = (d, s, r) => Math.min(w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]), s / Math.exp(w[17] * w[18]));
    const recallS = (d, s, r, g) => s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * (g === HARD ? w[15] : 1) * (g === EASY ? w[16] : 1));
    const nextS = (d, s, r, g) => clampS(g === AGAIN ? forgetS(d, s, r) : recallS(d, s, r, g));
    const elapsedDays = (card, now) => Math.floor((now - card.last) / DAY);
    function retrievability(card, now = Date.now()) {
      if (card.last == null || card.s == null) return 0;
      const t = Math.max(0, elapsedDays(card, now));
      return Math.pow(1 + FACTOR * t / card.s, DECAY);
    }
    function fuzzed(days) {
      if (days < 2.5) return days;
      let delta = 1;
      for (const f of FUZZ_RANGES) delta += f.factor * Math.max(Math.min(days, f.end) - f.start, 0);
      let lo = pyRound(days - delta), hi = pyRound(days + delta);
      lo = Math.max(2, lo); hi = Math.min(hi, maxIvl); lo = Math.min(lo, hi);
      return Math.min(Math.floor(random() * (hi - lo + 1) + lo), maxIvl);
    }
    function newCard(now = Date.now()) { return {state: LEARNING, step: 0, s: null, d: null, due: now, last: null, reps: 0, lapses: 0, fails: 0}; }
    function stepInterval(steps, card, g) {
      // renvoie [intervalle en ms, passe en révision ?]
      if (steps.length === 0 || (card.step >= steps.length && g >= HARD)) return [null, true];
      if (g === AGAIN) { card.step = 0; return [steps[0], false]; }
      if (g === HARD) {
        if (card.step === 0 && steps.length === 1) return [steps[0] * 1.5, false];
        if (card.step === 0 && steps.length >= 2) return [(steps[0] + steps[1]) / 2, false];
        return [steps[card.step], false];
      }
      if (g === GOOD) { if (card.step + 1 === steps.length) return [null, true]; card.step++; return [steps[card.step], false]; }
      return [null, true]; // EASY
    }
    function review(card0, g, now = Date.now()) {
      const card = Object.assign({}, card0);
      const days = card.last != null ? elapsedDays(card, now) : null;
      let ivlMs = null, toReview = false, ivlDays = null;
      if (card.state === LEARNING || card.state === RELEARNING) {
        if (card.state === LEARNING && (card.s == null || card.d == null)) { card.s = initS(g); card.d = initD(g, true); }
        else if (days != null && days < 1) { card.s = shortS(card.s, g); card.d = nextD(card.d, g); }
        else { card.s = nextS(card.d, card.s, retrievability(card, now), g); card.d = nextD(card.d, g); }
        [ivlMs, toReview] = stepInterval(card.state === LEARNING ? learningSteps : relearningSteps, card, g);
      } else { // REVIEW
        if (days != null && days < 1) card.s = shortS(card.s, g);
        else card.s = nextS(card.d, card.s, retrievability(card, now), g);
        card.d = nextD(card.d, g);
        if (g === AGAIN) {
          card.lapses = (card.lapses || 0) + 1;
          if (relearningSteps.length === 0) toReview = true;
          else { card.state = RELEARNING; card.step = 0; ivlMs = relearningSteps[0]; }
        } else toReview = true;
      }
      if (toReview) { card.state = REVIEW; card.step = null; ivlDays = nextIvl(card.s); if (fuzz) ivlDays = fuzzed(ivlDays); ivlMs = ivlDays * DAY; }
      if (g === AGAIN) card.fails = (card.fails || 0) + 1;
      card.reps = (card.reps || 0) + 1;
      card.due = now + ivlMs; card.last = now;
      return card;
    }
    return {review, retrievability, newCard, nextInterval: nextIvl, w, retention, DECAY, FACTOR};
  }
  const FSRS = {Scheduler, DEFAULT_W, LEARNING, REVIEW, RELEARNING, AGAIN, HARD, GOOD, EASY, DAY, MIN, VERSION: 'FSRS-6 (py-fsrs 6.3.3)'};
  if (typeof module !== 'undefined' && module.exports) module.exports = FSRS; else root.FSRS = FSRS;
})(typeof self !== 'undefined' ? self : this);
