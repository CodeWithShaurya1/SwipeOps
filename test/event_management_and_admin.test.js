/**
 * Automated Test Suite: Event Management, Leaderboard & Admin System
 * Verifies all 11 parts of the event specification.
 */

import assert from 'node:assert';

// Mock localStorage for node environment
const storageMock = (() => {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

globalThis.localStorage = storageMock;

// Import systems after localStorage mock
const { normalizeEnrollment, normalizeName, maskEnrollment, isTestEnrollment } = await import('../src/systems/IdentityUtils.js');
const { StorageManager } = await import('../src/systems/StorageManager.js');

console.log('--- STARTING SWIPEOPS EVENT MANAGEMENT & ADMIN TESTS ---');

const sm = new StorageManager();

// ============================================================================
// PART 1: PLAYER REGISTRATION & IDENTITY NORMALIZATION
// ============================================================================
console.log('1. Testing Identity Normalization & Masking...');
assert.strictEqual(normalizeEnrollment('  0101cs221045  '), '0101CS221045');
assert.strictEqual(normalizeEnrollment('  0101 it 211002 '), '0101IT211002');
assert.strictEqual(normalizeName('   Alex    Turner   '), 'Alex Turner');

// Privacy Masking
assert.strictEqual(maskEnrollment('0101CS221045'), '0101****1045');
assert.strictEqual(maskEnrollment('0101IT211002'), '0101****1002');
assert.strictEqual(maskEnrollment('TEST-01'), 'TEST****T-01');
assert.strictEqual(isTestEnrollment('TEST-01'), true);
assert.strictEqual(isTestEnrollment('0101CS221045'), false);
console.log('   ✓ Identity normalization and masking verified.');

// ============================================================================
// PART 2: ONE OFFICIAL ATTEMPT PER STUDENT
// ============================================================================
console.log('2. Testing First-Time Student Registration & Attempt Reservation...');
const student1Enroll = '0101CS221001';
const student1Name = 'Sarah Connor';

// Status before registration
const check1 = await sm.checkStudentStatus(student1Enroll);
assert.strictEqual(check1.eligible, true);
assert.strictEqual(check1.status, 'NOT_FOUND');

// Start attempt
const start1 = await sm.startAttempt(student1Name, student1Enroll);
assert.strictEqual(start1.success, true);
assert.strictEqual(start1.allowed, true);
assert.strictEqual(start1.attemptNumber, 1);
assert.strictEqual(start1.isReplay, false);
assert(start1.attemptId, 'Must return attemptId');

// Refresh during game: Resumes active attempt
const resumeCheck = await sm.checkStudentStatus(student1Enroll);
assert.strictEqual(resumeCheck.eligible, true);
assert.strictEqual(resumeCheck.status, 'ACTIVE_ATTEMPT');
assert.strictEqual(resumeCheck.attempt.id, start1.attemptId);

const resumeStart = await sm.startAttempt(student1Name, student1Enroll);
assert.strictEqual(resumeStart.success, true);
assert.strictEqual(resumeStart.resumed, true);
assert.strictEqual(resumeStart.attemptId, start1.attemptId);
console.log('   ✓ Active attempt resumed cleanly on refresh without creating duplicate attempt.');

// Complete Attempt
const complete1 = await sm.completeAttempt(start1.attemptId, {
  enrollment: student1Enroll,
  finalScore: 250,
  accuracy: 85,
  correct: 2,
  incorrect: 1,
  timeout: 0,
  maxStreak: 2,
  missionDuration: 38
});
assert.strictEqual(complete1.success, true);
assert.strictEqual(complete1.isNewBest, true);
assert.strictEqual(complete1.bestScore, 250);

// Repeat visitor attempt: MUST BE BLOCKED
console.log('3. Testing Repeat Visitor Prevention...');
const repeatCheck = await sm.checkStudentStatus(student1Enroll);
assert.strictEqual(repeatCheck.eligible, false);
assert.strictEqual(repeatCheck.status, 'ALREADY_PLAYED');
assert(repeatCheck.message.includes('official attempt has already been recorded'));

// Even if student enters with a different name on same enrollment
const repeatStart = await sm.startAttempt('Imposter Name', student1Enroll);
assert.strictEqual(repeatStart.success, false);
assert.strictEqual(repeatStart.allowed, false);
assert.strictEqual(repeatStart.error, 'ALREADY_PLAYED');
console.log('   ✓ Repeat visitor blocked at storage level even with different name.');

// ============================================================================
// PART 3: ADMIN-AUTHORIZED REPLAYS
// ============================================================================
console.log('4. Testing Admin-Authorized Replay Lifecycle...');
// Authorize replay
const authRes = await sm.adminAuthorizeReplay(student1Enroll, 'Verified Wi-Fi interruption during round 2', 'Lead SRE Admin');
assert.strictEqual(authRes.success, true);

// Verify student is now eligible for replay
const replayCheck = await sm.checkStudentStatus(student1Enroll);
assert.strictEqual(replayCheck.eligible, true);
assert.strictEqual(replayCheck.status, 'REPLAY_AUTHORIZED');

// Verify cannot authorize duplicate pending replay
const duplicateAuth = await sm.adminAuthorizeReplay(student1Enroll, 'Another reason', 'Organizer 2');
assert.strictEqual(duplicateAuth.success, false);
assert(duplicateAuth.message.includes('already has a pending replay authorization'));

// Student starts authorized replay
const replayStart = await sm.startAttempt(student1Name, student1Enroll);
assert.strictEqual(replayStart.success, true);
assert.strictEqual(replayStart.isReplay, true);
assert.strictEqual(replayStart.attemptNumber, 2);

// Replay authorization is now consumed
const postReplayCheck = await sm.checkStudentStatus(student1Enroll);
assert.strictEqual(postReplayCheck.status, 'ACTIVE_ATTEMPT');

// Complete replay with LOWER score (150 pts vs previous 250 pts)
console.log('5. Testing Best Score Policy (Lower Replay Score)...');
const completeReplayLower = await sm.completeAttempt(replayStart.attemptId, {
  enrollment: student1Enroll,
  finalScore: 150,
  accuracy: 60,
  correct: 1,
  incorrect: 2,
  timeout: 0,
  maxStreak: 1,
  missionDuration: 42
});
assert.strictEqual(completeReplayLower.success, true);
assert.strictEqual(completeReplayLower.isNewBest, false);
assert.strictEqual(completeReplayLower.bestScore, 250, 'Best score must remain 250 pts!');

// Authorize another replay and achieve HIGHER score (350 pts)
console.log('6. Testing Best Score Policy (Higher Replay Score)...');
await sm.adminAuthorizeReplay(student1Enroll, 'Second authorized trial', 'Lead Admin');
const replayStart2 = await sm.startAttempt(student1Name, student1Enroll);
assert.strictEqual(replayStart2.attemptNumber, 3);

const completeReplayHigher = await sm.completeAttempt(replayStart2.attemptId, {
  enrollment: student1Enroll,
  finalScore: 350,
  accuracy: 100,
  correct: 3,
  incorrect: 0,
  timeout: 0,
  maxStreak: 3,
  missionDuration: 28
});
assert.strictEqual(completeReplayHigher.success, true);
assert.strictEqual(completeReplayHigher.isNewBest, true);
assert.strictEqual(completeReplayHigher.bestScore, 350);
console.log('   ✓ Best score policy successfully updated to 350 pts.');

// ============================================================================
// PART 4: REPLAY REVOCATION
// ============================================================================
console.log('7. Testing Replay Revocation...');
const student2Enroll = '0101CS221002';
await sm.startAttempt('Kyle Reese', student2Enroll);
const attempts = await sm.adminGetAttempts(student2Enroll);
await sm.completeAttempt(attempts[0].id, {
  enrollment: student2Enroll,
  finalScore: 200,
  accuracy: 75,
  correct: 2,
  incorrect: 1,
  timeout: 0,
  maxStreak: 2,
  missionDuration: 35
});

// Authorize replay
await sm.adminAuthorizeReplay(student2Enroll, 'Mistaken grant', 'Admin');
const replays = await sm.adminGetReplays();
const pendingReplay = replays.find(r => r.enrollment_number === student2Enroll && r.status === 'pending');
assert(pendingReplay, 'Pending replay must exist');

// Revoke replay
const revokeRes = await sm.adminRevokeReplay(pendingReplay.id, 'Organizer revoked mistaken clearance', 'Lead Admin');
assert.strictEqual(revokeRes.success, true);

// Student should now be blocked again
const postRevokeCheck = await sm.checkStudentStatus(student2Enroll);
assert.strictEqual(postRevokeCheck.eligible, false);
assert.strictEqual(postRevokeCheck.status, 'ALREADY_PLAYED');
console.log('   ✓ Replay revocation locked student attempt successfully.');

// ============================================================================
// PART 5: PUBLIC LEADERBOARD TIE-BREAKING & BEST SCORE DISPLAY
// ============================================================================
console.log('8. Testing Leaderboard Ranking & Tie-Breakers...');
// Register student 3 with same score as student 2 (200 pts) but higher accuracy (90% vs 75%)
const student3Enroll = '0101CS221003';
const start3 = await sm.startAttempt('John Connor', student3Enroll);
await sm.completeAttempt(start3.attemptId, {
  enrollment: student3Enroll,
  finalScore: 200,
  accuracy: 90,
  correct: 2,
  incorrect: 1,
  timeout: 0,
  maxStreak: 2,
  missionDuration: 30
});

const lb = await sm.getLeaderboard(10);
assert.strictEqual(lb.data.length, 3, 'Must have exactly 3 distinct students on leaderboard');

// Rank 1: student 1 with 350 pts
assert.strictEqual(lb.data[0].enrollment_number, student1Enroll);
assert.strictEqual(lb.data[0].final_score, 350);
assert.strictEqual(lb.data[0].enrollment_masked, '0101****1001');

// Rank 2: student 3 with 200 pts and 90% accuracy (higher accuracy tie-breaker)
assert.strictEqual(lb.data[1].enrollment_number, student3Enroll);
assert.strictEqual(lb.data[1].final_score, 200);
assert.strictEqual(lb.data[1].accuracy, 90);

// Rank 3: student 2 with 200 pts and 75% accuracy
assert.strictEqual(lb.data[2].enrollment_number, student2Enroll);
assert.strictEqual(lb.data[2].final_score, 200);
assert.strictEqual(lb.data[2].accuracy, 75);
console.log('   ✓ Tie-breaking rules verified: Score DESC -> Accuracy DESC.');

// ============================================================================
// PART 6: ADMIN AUDIT LOG & TELEMETRY STATS
// ============================================================================
console.log('9. Testing Admin Overview Stats & Append-Only Audit Trail...');
const stats = await sm.adminGetStats();
assert.strictEqual(stats.total_registered_players, 3);
assert.strictEqual(stats.highest_score, 350);
assert.strictEqual(stats.students_already_played, 3);

// Audit logs
const auditLogs = await sm.adminGetAuditLog();
assert(auditLogs.length >= 3, 'Audit log must record authorizations, revocations, and consumptions');
const actions = auditLogs.map(l => l.action);
assert(actions.includes('REPLAY_AUTHORIZED'), 'REPLAY_AUTHORIZED must be in audit log');
assert(actions.includes('REPLAY_CONSUMED'), 'REPLAY_CONSUMED must be in audit log');
assert(actions.includes('REPLAY_REVOKED'), 'REPLAY_REVOKED must be in audit log');

// Password verification
assert.strictEqual(sm.verifyAdminPassphrase('devops2026'), true);
assert.strictEqual(sm.verifyAdminPassphrase('wrongpass'), false);
console.log('   ✓ Admin stats, audit logs, and security passphrase verified.');

console.log('--- ALL EVENT MANAGEMENT & ADMIN TESTS PASSED PERFECTLY! ---');
