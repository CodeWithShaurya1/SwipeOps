/**
 * Automated Verification Test Suite for DEVOPS ARENA — 3-Round / 45s Overhaul
 */

import assert from 'node:assert';
import { INCIDENT_BANK } from '../src/data/incidents.js';
import { IncidentEngine } from '../src/systems/IncidentEngine.js';
import { ScoringEngine } from '../src/systems/ScoringEngine.js';
import { ProductionState } from '../src/systems/ProductionState.js';
import { MissionTimer } from '../src/systems/MissionTimer.js';

console.log('--- STARTING 3-ROUND / 45S OVERHAUL VERIFICATION ---');

// 1. Question Bank: Exactly 15 First-Year Friendly Scenarios
console.log('1. Checking Incident Question Bank...');
assert(Array.isArray(INCIDENT_BANK), 'INCIDENT_BANK must be an array');
console.log(`   Total scenarios: ${INCIDENT_BANK.length}`);
assert.strictEqual(INCIDENT_BANK.length, 15, `Expected exactly 15 scenarios, found ${INCIDENT_BANK.length}`);

const validSeverities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const seenIds = new Set();
const foundCategories = new Set();

INCIDENT_BANK.forEach((inc, index) => {
  assert(inc.id, `Scenario #${index} missing id`);
  assert(!seenIds.has(inc.id), `Duplicate scenario ID detected: ${inc.id}`);
  seenIds.add(inc.id);

  assert(inc.category, `Missing category in ${inc.id}`);
  foundCategories.add(inc.category);

  assert(validSeverities.has(inc.severity), `Invalid severity: ${inc.severity} in ${inc.id}`);
  assert(inc.title && inc.title.length > 5, `Missing or too short title in ${inc.id}`);
  assert(inc.description && inc.description.length > 10, `Missing or too short description in ${inc.id}`);
  assert(inc.clue && inc.clue.length > 3, `Missing clue in ${inc.id}`);
  assert(inc.leftAction && inc.leftAction.title && inc.leftAction.description, `Invalid leftAction in ${inc.id}`);
  assert(inc.rightAction && inc.rightAction.title && inc.rightAction.description, `Invalid rightAction in ${inc.id}`);
  assert(inc.correctAction === 'left' || inc.correctAction === 'right', `Invalid correctAction in ${inc.id}`);
  assert(inc.explanation && inc.explanation.length > 10, `Missing explanation in ${inc.id}`);
  assert(inc.impact && typeof inc.impact === 'object', `Missing impact in ${inc.id}`);
});

console.log(`   Unique categories: ${[...foundCategories].join(', ')}`);
console.log('   ✓ 15-question bank verified successfully.');

// 2. Incident Engine: Exactly 3 non-repeating rounds
console.log('2. Checking 3-Round Selection & Progression...');
const engine = new IncidentEngine();
const picked = engine.prepareMission();
assert.strictEqual(picked.length, 3, 'Must select exactly 3 incidents for the session');

const pickedIds = new Set(picked.map(p => p.id));
assert.strictEqual(pickedIds.size, 3, 'All 3 selected incidents must be distinct');

const r1 = engine.nextRound();
assert.strictEqual(r1.roundNumber, 1);
assert.strictEqual(r1.totalRounds, 3);
assert.strictEqual(r1.incident.id, picked[0].id);

const r2 = engine.nextRound();
assert.strictEqual(r2.roundNumber, 2);
assert.strictEqual(r2.incident.id, picked[1].id);

const r3 = engine.nextRound();
assert.strictEqual(r3.roundNumber, 3);
assert.strictEqual(r3.incident.id, picked[2].id);

const r4 = engine.nextRound();
assert.strictEqual(r4, null, 'Must terminate after round 3');
console.log('   ✓ 3-Round sequence verified successfully.');

// 3. Scoring Engine: 350 Max Points for Perfect 3-Round Run
console.log('3. Checking 3-Round Scoring Rules...');
const scoring = new ScoringEngine();
assert.strictEqual(scoring.score, 0);

// Round 1 correct: +100
let res = scoring.processOutcome('INC-01', 'correct');
assert.strictEqual(res.pointsAwarded, 100);
assert.strictEqual(res.bonusAwarded, 0);
assert.strictEqual(scoring.score, 100);
assert.strictEqual(scoring.currentStreak, 1);

// Round 2 correct: +100
res = scoring.processOutcome('INC-02', 'correct');
assert.strictEqual(res.pointsAwarded, 100);
assert.strictEqual(res.bonusAwarded, 0);
assert.strictEqual(scoring.score, 200);
assert.strictEqual(scoring.currentStreak, 2);

// Round 3 correct: +100 + 50 streak bonus = +150
res = scoring.processOutcome('INC-03', 'correct');
assert.strictEqual(res.pointsAwarded, 100);
assert.strictEqual(res.bonusAwarded, 50);
assert.strictEqual(res.isStreakBonus, true);
assert.strictEqual(scoring.score, 350);
assert.strictEqual(scoring.currentStreak, 3);
assert.strictEqual(scoring.maxStreak, 3);
assert.strictEqual(scoring.getAccuracy(), 100);

// Duplicate submission protection (idempotency)
const dup = scoring.processOutcome('INC-03', 'correct');
assert.strictEqual(dup.pointsAwarded, 0);
assert.strictEqual(scoring.score, 350);

console.log('   ✓ Perfect 3-round score is exactly 350 pts.');

// 4. Mission Timer Configuration & Dynamic Countdown
console.log('4. Checking MissionTimer 45s / 15s settings & lifecycle...');
const timer = new MissionTimer({ totalDuration: 45, roundDuration: 15 });
assert.strictEqual(timer.totalDuration, 45, 'Total duration must be 45s');
assert.strictEqual(timer.roundDuration, 15, 'Round duration must be 15s');
assert.strictEqual(timer.remainingMissionSeconds, 45);
assert.strictEqual(timer.remainingRoundSeconds, 15);

// Verify startMission() does not kill round timer
timer.startRoundTimer();
assert.strictEqual(timer.isRoundRunning, true);
assert.strictEqual(timer.remainingRoundSeconds, 15);

// Now start global mission
timer.startMission();
assert.strictEqual(timer.isMissionRunning, true);
assert.strictEqual(timer.isRoundRunning, true, 'startMission() must NOT cancel round timer');

// Verify round deadline calculation
const clockNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
assert(timer.roundDeadline > clockNow, 'Round deadline must be set in the future');
assert.strictEqual(timer.isRoundExpired(), false, 'Round must not be expired at start');

// Verify pause and resume
timer.pause();
assert.strictEqual(timer.isPaused, true);
const savedRoundMs = timer.savedRoundRemainingMs;
assert(savedRoundMs > 0 && savedRoundMs <= 15000);

timer.resume();
assert.strictEqual(timer.isPaused, false);
const clockNowResume = typeof performance !== 'undefined' ? performance.now() : Date.now();
assert(timer.roundDeadline >= clockNowResume, 'Round deadline must be shifted on resume');

// Verify generation tokens & stopping
const gen1 = timer.roundGeneration;
timer.stopRoundTimer();
assert.strictEqual(timer.isRoundRunning, false);
assert(timer.roundGeneration > gen1, 'Generation must advance on stopRoundTimer');

// Verify Round 2 starts fresh 15s window
timer.startRoundTimer();
assert.strictEqual(timer.isRoundRunning, true);
assert.strictEqual(timer.remainingRoundSeconds, 15);
assert.strictEqual(timer.roundTimeoutTriggered, false);

// Clean up
timer.stopAll();
assert.strictEqual(timer.isMissionRunning, false);
assert.strictEqual(timer.isRoundRunning, false);
console.log('   ✓ Timer lifecycle and countdown mechanics verified.');

// 5. Production Health
console.log('5. Checking Production State...');
const prod = new ProductionState();
assert.strictEqual(prod.getMetrics().availability, 100);
prod.applyIncidentOutcome({ availability: 20 }, false);
assert(prod.getMetrics().availability < 100);
console.log('   ✓ Production State verified.');

console.log('--- ALL OVERHAUL TESTS PASSED SUCCESSFULLY! ---');
