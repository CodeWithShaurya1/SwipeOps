/**
 * MissionTimer
 * Enforces a strict 45-second total mission ceiling,
 * divided into three 15-second decision rounds.
 * 
 * Features:
 * - High-precision absolute timestamp deadline tracking (performance.now / Date.now)
 * - Independent lifecycle for global mission clock vs per-round response windows
 * - Generation tokens to prevent stale interval leaks across rounds
 * - Pause / resume with deadline preservation
 * - Safe against late decision submissions and duplicate timeouts
 */

import { sound } from './SoundFX.js';

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class MissionTimer {
  constructor(options = {}) {
    this.totalDuration = options.totalDuration || 45; // 45 seconds total mission limit
    this.roundDuration = options.roundDuration || 15; // 15 seconds per round

    this.onMissionTick = options.onMissionTick || (() => {});
    this.onMissionTimeUp = options.onMissionTimeUp || (() => {});
    this.onRoundTick = options.onRoundTick || (() => {});
    this.onRoundTimeUp = options.onRoundTimeUp || (() => {});

    // Mission State
    this.isMissionRunning = false;
    this.missionDeadline = null;
    this.remainingMissionSeconds = this.totalDuration;
    this.missionInterval = null;
    this.missionTimeoutTriggered = false;

    // Round State
    this.isRoundRunning = false;
    this.roundDeadline = null;
    this.remainingRoundSeconds = this.roundDuration;
    this.roundInterval = null;
    this.roundGeneration = 0;
    this.roundTimeoutTriggered = false;
    this.lastReportedRoundSecond = -1;

    // Pause State
    this.isPaused = false;
    this.savedMissionRemainingMs = this.totalDuration * 1000;
    this.savedRoundRemainingMs = this.roundDuration * 1000;
  }

  /**
   * Starts the 45-second global mission clock.
   * Does NOT cancel or terminate any active round timer.
   */
  startMission() {
    this.stopMission();
    this.isMissionRunning = true;
    this.isPaused = false;
    this.missionTimeoutTriggered = false;

    const now = getNow();
    this.missionDeadline = now + this.totalDuration * 1000;
    this.remainingMissionSeconds = this.totalDuration;
    this.onMissionTick(this.remainingMissionSeconds);

    this.missionInterval = setInterval(() => {
      if (!this.isMissionRunning || this.isPaused) return;

      const currentTime = getNow();
      const msLeft = this.missionDeadline - currentTime;
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));

      if (secLeft !== this.remainingMissionSeconds) {
        this.remainingMissionSeconds = secLeft;
        this.onMissionTick(this.remainingMissionSeconds);
      }

      if (msLeft <= 0 || secLeft <= 0) {
        if (!this.missionTimeoutTriggered) {
          this.missionTimeoutTriggered = true;
          this.stopAll();
          this.onMissionTimeUp();
        }
      }
    }, 100);
  }

  /**
   * Starts a fresh 15-second response window for the active round.
   */
  startRoundTimer() {
    this.stopRoundTimer();
    this.roundGeneration++;
    const currentGen = this.roundGeneration;

    this.isRoundRunning = true;
    this.roundTimeoutTriggered = false;
    this.lastReportedRoundSecond = this.roundDuration;
    this.remainingRoundSeconds = this.roundDuration;

    const now = getNow();
    this.roundDeadline = now + this.roundDuration * 1000;

    // Immediate tick for 15s display and 100% bar
    this.onRoundTick(this.roundDuration, this.roundDuration, 1.0);

    this.roundInterval = setInterval(() => {
      // Guard against stale callbacks from earlier rounds
      if (!this.isRoundRunning || this.roundGeneration !== currentGen) {
        clearInterval(this.roundInterval);
        return;
      }
      if (this.isPaused) return;

      const currentTime = getNow();
      const msLeft = this.roundDeadline - currentTime;
      const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
      const fraction = Math.max(0, Math.min(1, msLeft / (this.roundDuration * 1000)));

      if (secLeft !== this.lastReportedRoundSecond) {
        this.lastReportedRoundSecond = secLeft;
        this.remainingRoundSeconds = secLeft;

        if (secLeft <= 3 && secLeft > 0) {
          sound.playTick();
        }
      }

      this.onRoundTick(secLeft, this.roundDuration, fraction);

      if (msLeft <= 0 || secLeft <= 0) {
        if (!this.roundTimeoutTriggered && this.roundGeneration === currentGen) {
          this.roundTimeoutTriggered = true;
          this.stopRoundTimer();
          this.onRoundTimeUp();
        }
      }
    }, 60);
  }

  /**
   * Returns true if round deadline has passed or round is not running.
   */
  isRoundExpired() {
    if (!this.isRoundRunning || !this.roundDeadline) return true;
    return getNow() >= this.roundDeadline;
  }

  stopRoundTimer() {
    if (this.roundInterval) {
      clearInterval(this.roundInterval);
      this.roundInterval = null;
    }
    this.isRoundRunning = false;
    this.roundGeneration++;
  }

  stopMission() {
    if (this.missionInterval) {
      clearInterval(this.missionInterval);
      this.missionInterval = null;
    }
    this.isMissionRunning = false;
  }

  stopAll() {
    this.stopMission();
    this.stopRoundTimer();
  }

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    const now = getNow();

    if (this.isMissionRunning && this.missionDeadline) {
      this.savedMissionRemainingMs = Math.max(0, this.missionDeadline - now);
    }
    if (this.isRoundRunning && this.roundDeadline) {
      this.savedRoundRemainingMs = Math.max(0, this.roundDeadline - now);
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    const now = getNow();

    if (this.isMissionRunning) {
      this.missionDeadline = now + this.savedMissionRemainingMs;
    }
    if (this.isRoundRunning) {
      this.roundDeadline = now + this.savedRoundRemainingMs;
    }
  }

  getMissionElapsed() {
    if (!this.missionDeadline) return 0;
    const now = getNow();
    const elapsed = Math.floor((now - (this.missionDeadline - this.totalDuration * 1000)) / 1000);
    return Math.min(this.totalDuration, Math.max(0, elapsed));
  }
}
