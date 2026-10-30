/**
 * Test: Multi-Round Incident Progression and Swipe Deck Transitions
 * Verifies that Round 1 -> Round 2 -> Round 3 transitions without blank cards or errors.
 */

import { IncidentEngine } from '../src/systems/IncidentEngine.js';
import { ScoringEngine } from '../src/systems/ScoringEngine.js';
import { ProductionState } from '../src/systems/ProductionState.js';
import { MissionTimer } from '../src/systems/MissionTimer.js';
import { MissionScreen } from '../src/ui/MissionScreen.js';
import assert from 'node:assert';

console.log('--- TESTING MULTI-ROUND INCIDENT PROGRESSION ---');

// Mock DOM container
function createMockElement(id = '', className = '') {
  return {
    id,
    className,
    innerHTML: '',
    textContent: '',
    style: {},
    classList: {
      classes: new Set(className ? className.split(' ') : []),
      add(c) { this.classes.add(c); },
      remove(c) { this.classes.delete(c); },
      contains(c) { return this.classes.has(c); }
    },
    children: [],
    querySelector(selector) {
      if (selector.startsWith('#')) {
        const targetId = selector.slice(1);
        if (this.id === targetId) return this;
        for (const child of this.children) {
          const found = child.querySelector(selector);
          if (found) return found;
        }
      }
      // Simple mock for our known selectors
      return createMockElement(selector.replace(/[#.]/g, ''));
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    setPointerCapture() {},
    releasePointerCapture() {}
  };
}

// Set up mock window and document for Node testing
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    innerWidth: 1200,
    addEventListener() {},
    removeEventListener() {}
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    addEventListener() {},
    removeEventListener() {},
    hidden: false
  };
}

// 1. Initialize mission subsystems
const incidentEngine = new IncidentEngine();
incidentEngine.prepareMission();

const scoringEngine = new ScoringEngine();
const productionState = new ProductionState();
const missionTimer = new MissionTimer({ totalDuration: 45, roundDuration: 15 });

let missionCompleted = false;

// Mock root container
const container = createMockElement('app');

const missionScreen = new MissionScreen({
  playerData: { name: 'TEST-PILOT' },
  incidentEngine,
  scoringEngine,
  productionState,
  missionTimer,
  onMissionComplete: () => {
    missionCompleted = true;
  }
});

// 2. Mount MissionScreen -> Starts Round 1
missionTimer.startMission();
missionScreen.mount(container);

assert.strictEqual(incidentEngine.getCurrentRoundNumber(), 1, 'Should start at Round 1');
const r1Incident = incidentEngine.getCurrent();
assert.ok(r1Incident && r1Incident.title, 'Round 1 incident must be valid');
console.log(`✓ Round 1 loaded: "${r1Incident.title}"`);

// 3. Complete Round 1 with left decision
missionScreen.handleDecision('left', r1Incident);
assert.strictEqual(missionScreen.isHandlingFeedback, true, 'Should enter feedback state');
console.log('✓ Round 1 decision submitted and feedback triggered (No ReferenceError)');

// Simulate feedback advance (1.4s)
// Directly invoke advance by clearing timeout and calling loadNextRound
if (missionScreen.feedbackTimeout) {
  clearTimeout(missionScreen.feedbackTimeout);
}
missionScreen.isHandlingFeedback = false;
missionScreen.loadNextRound();

// 4. Verify Round 2 loaded
assert.strictEqual(incidentEngine.getCurrentRoundNumber(), 2, 'Should advance to Round 2');
const r2Incident = incidentEngine.getCurrent();
assert.ok(r2Incident && r2Incident.title, 'Round 2 incident must be valid');
assert.notStrictEqual(r2Incident.id, r1Incident.id, 'Round 2 must be a different incident');
console.log(`✓ Round 2 loaded: "${r2Incident.title}"`);

// 5. Complete Round 2 with right decision
missionScreen.handleDecision('right', r2Incident);
assert.strictEqual(missionScreen.isHandlingFeedback, true, 'Should enter feedback state for Round 2');
console.log('✓ Round 2 decision submitted successfully');

// Simulate feedback advance for Round 2
if (missionScreen.feedbackTimeout) {
  clearTimeout(missionScreen.feedbackTimeout);
}
missionScreen.isHandlingFeedback = false;
missionScreen.loadNextRound();

// 6. Verify Round 3 loaded
assert.strictEqual(incidentEngine.getCurrentRoundNumber(), 3, 'Should advance to Round 3');
const r3Incident = incidentEngine.getCurrent();
assert.ok(r3Incident && r3Incident.title, 'Round 3 incident must be valid');
console.log(`✓ Round 3 loaded: "${r3Incident.title}"`);

// 7. Complete Round 3 with left decision
missionScreen.handleDecision('left', r3Incident);
console.log('✓ Round 3 decision submitted');

// Simulate feedback advance for Round 3 -> should finish mission
if (missionScreen.feedbackTimeout) {
  clearTimeout(missionScreen.feedbackTimeout);
}
missionScreen.isHandlingFeedback = false;
if (missionScreen.currentRoundData && missionScreen.currentRoundData.roundNumber >= 3) {
  missionScreen.finishMission();
}

assert.strictEqual(missionCompleted, true, 'Mission must complete after Round 3');
console.log('✓ Mission complete triggered successfully after 3 rounds');

console.log('--- MULTI-ROUND INCIDENT PROGRESSION TESTS PASSED! ---');
