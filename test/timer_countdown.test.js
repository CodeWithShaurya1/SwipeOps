/**
 * Dynamic Round Timer & Lifecycle Verification Test
 */

import assert from 'node:assert';
import { MissionTimer } from '../src/systems/MissionTimer.js';

console.log('--- TESTING DYNAMIC 15-SECOND ROUND COUNTDOWN & TIMEOUT ---');

const timer = new MissionTimer({
  totalDuration: 45,
  roundDuration: 2 // Use 2 seconds for high-speed automated testing
});

let roundTicks = [];
let roundTimeUpCount = 0;
let missionTimeUpCount = 0;

timer.onRoundTick = (remaining, total, fraction) => {
  roundTicks.push({ remaining, total, fraction });
};

timer.onRoundTimeUp = () => {
  roundTimeUpCount++;
};

timer.onMissionTimeUp = () => {
  missionTimeUpCount++;
};

// 1. Start mission & round 1
timer.startMission();
timer.startRoundTimer();

assert.strictEqual(timer.isMissionRunning, true);
assert.strictEqual(timer.isRoundRunning, true);
assert.strictEqual(roundTicks.length, 1);
assert.strictEqual(roundTicks[0].remaining, 2);

// Wait 2.2 seconds for round timeout
await new Promise(r => setTimeout(r, 2200));

assert.strictEqual(roundTimeUpCount, 1, 'Round timeout must fire exactly once');
assert.strictEqual(timer.isRoundRunning, false, 'Round timer must stop after timeout');
assert.strictEqual(timer.isRoundExpired(), true, 'isRoundExpired() must return true');

// 2. Start Round 2 with fresh window
roundTicks = [];
timer.startRoundTimer();
assert.strictEqual(timer.isRoundRunning, true);
assert.strictEqual(timer.roundTimeoutTriggered, false);
assert.strictEqual(roundTicks[0].remaining, 2);

// Early decision submission after 500ms
await new Promise(r => setTimeout(r, 500));
timer.stopRoundTimer();
assert.strictEqual(timer.isRoundRunning, false);
assert.strictEqual(roundTimeUpCount, 1, 'Timeout must NOT fire if decision was made early');

// 3. Start Round 3
timer.startRoundTimer();
assert.strictEqual(timer.isRoundRunning, true);

timer.stopAll();
assert.strictEqual(timer.isRoundRunning, false);
assert.strictEqual(timer.isMissionRunning, false);

console.log('--- DYNAMIC TIMER TEST PASSED SUCCESSFULLY! ---');
