/**
 * Automated Verification for Tinder-Style SwipeOps Deck & Physics
 */

import assert from 'node:assert';
import { IncidentCard } from '../src/ui/IncidentCard.js';

console.log('--- TESTING TINDER-STYLE CARD DECK & INTERACTION PHYSICS ---');

// Mock DOM container
class MockElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this.innerHTML = '';
    this.style = {};
    this.classList = new Set();
    this.classList.add = (c) => this.classList[c] = true;
    this.classList.remove = (c) => delete this.classList[c];
    this.listeners = {};
    this.disabled = false;
  }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  removeEventListener() {}
  querySelector(sel) {
    return new MockElement();
  }
  setPointerCapture() {}
}

const mockContainer = new MockElement();

const sampleIncident = {
  id: 'INC-01',
  severity: 'CRITICAL',
  category: 'KUBERNETES',
  title: 'CrashLoopBackOff on Pods',
  description: 'Pods fail to start due to missing environment variable.',
  clue: 'exit 1: DB_PORT undefined',
  leftAction: {
    title: 'Rollback Release',
    description: 'Revert deployment to stable revision v2.3'
  },
  rightAction: {
    title: 'Inject Env Var',
    description: 'Update configmap with DB_PORT=5432 and restart'
  },
  correctAction: 'right'
};

let selectedChoice = null;
const card = new IncidentCard({
  onSelectAction: (choice, inc) => {
    selectedChoice = choice;
  }
});

card.mount(mockContainer, sampleIncident);

// 1. Verify deck markup has 3 layered stack cards
assert(mockContainer.innerHTML.includes('card-depth-2'), 'Deck must contain depth-2 background card');
assert(mockContainer.innerHTML.includes('card-depth-1'), 'Deck must contain depth-1 background card');
assert(mockContainer.innerHTML.includes('card-active'), 'Deck must contain active foreground card');

// 2. Verify directional stamps use actual incident actions
assert(mockContainer.innerHTML.includes('ROLLBACK RELEASE'), 'Left stamp must reflect left action title');
assert(mockContainer.innerHTML.includes('INJECT ENV VAR'), 'Right stamp must reflect right action title');

// 3. Verify in-card choice tray
assert(mockContainer.innerHTML.includes('deck-decision-tray'), 'Deck must contain integrated in-card choice tray');
assert(mockContainer.innerHTML.includes('choice-left'), 'Must have left choice option box');
assert(mockContainer.innerHTML.includes('choice-right'), 'Must have right choice option box');

// 4. Verify snap-back without submission on small drag
card.handlePointerDown({ clientX: 100, clientY: 100, pointerId: 1 });
card.currentX = 140; // 40px delta < 110px threshold
card.startTime = performance.now() - 500; // slow velocity (0.08 px/ms)
card.handlePointerUp({ clientX: 140, clientY: 100 });
assert.strictEqual(selectedChoice, null, 'Incomplete drag must snap back without submitting');
assert.strictEqual(card.isLocked, false, 'Card must remain unlocked on incomplete drag');

// 5. Verify deliberate swipe commits decision
card.handlePointerDown({ clientX: 100, clientY: 100, pointerId: 1 });
card.currentX = 230; // 130px delta >= 110px threshold
card.handlePointerUp({ clientX: 230, clientY: 100 });
assert.strictEqual(selectedChoice, 'right', 'Right swipe must commit right action');
assert.strictEqual(card.isLocked, true, 'Card must be locked after commitment');

// 6. Verify duplicate submissions are blocked
selectedChoice = null;
card.triggerChoice('left');
assert.strictEqual(selectedChoice, null, 'Locked card must reject secondary submission attempts');

// 7. Verify lock() disables card
card.isLocked = false;
card.lock();
assert.strictEqual(card.isLocked, true);

card.destroy();

console.log('--- ALL TINDER DECK TESTS PASSED SUCCESSFULLY! ---');
