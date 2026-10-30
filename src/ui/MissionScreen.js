/**
 * MissionScreen Component
 * Orchestrates the fast-paced 3-Round / 45-Second Mission:
 * - 3-Segment Round Progress Indicator ([ROUND 1] [ROUND 2] [ROUND 3])
 * - 15-second per-round countdown bar
 * - Global 45-second mission ceiling
 * - Interactive SwipeOps Decision Deck
 * - Rapid feedback transitions (1.2s auto-advance or tap to skip)
 */

import { ProductionHealth } from './ProductionHealth.js';
import { IncidentCard } from './IncidentCard.js';
import { sound } from '../systems/SoundFX.js';
import { devopsBg } from '../systems/DevOpsBackground.js';
import { Icons } from './icons.js';

export class MissionScreen {
  constructor({
    playerData,
    incidentEngine,
    scoringEngine,
    productionState,
    missionTimer,
    onMissionComplete
  }) {
    this.playerData = playerData;
    this.incidentEngine = incidentEngine;
    this.scoringEngine = scoringEngine;
    this.productionState = productionState;
    this.missionTimer = missionTimer;
    this.onMissionComplete = onMissionComplete;

    this.container = null;
    this.healthComponent = null;
    this.activeCardComponent = null;
    this.feedbackTimeout = null;

    this.isHandlingFeedback = false;
    this.currentRoundData = null;
  }

  mount(container) {
    this.container = container;
    this.renderLayout();
    this.setupSubscriptions();
    if (this.missionTimer) {
      this.missionTimer.onMissionTick(this.missionTimer.remainingMissionSeconds);
    }
    this.loadNextRound();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="mission-viewport">
        <!-- Top Status Bar -->
        <header class="top-status-bar glass-surface">
          <div class="brand-section">
            <div class="brand-logo-text">SWIPE<span>OPS</span></div>
            <div class="player-tag">
              <span class="player-icon">${Icons.user(13)}</span>
              <span>${this.escapeHtml(this.playerData.name)}</span>
            </div>
          </div>

          <!-- 3-Segment Mission Progress Indicator -->
          <div class="mission-rounds-tracker" id="rounds-tracker">
            <div class="round-segment" id="seg-round-1">
              <span class="seg-num">01</span>
              <span class="seg-label">Round 1</span>
            </div>
            <div class="round-segment" id="seg-round-2">
              <span class="seg-num">02</span>
              <span class="seg-label">Round 2</span>
            </div>
            <div class="round-segment" id="seg-round-3">
              <span class="seg-num">03</span>
              <span class="seg-label">Round 3</span>
            </div>
          </div>

          <div class="stats-cluster">
            <div class="streak-pill" id="hud-streak">
              <span class="streak-icon">${Icons.flame(13)}</span>
              <span id="val-streak">0 streak</span>
            </div>

            <div class="stat-item">
              <span class="stat-label">Score</span>
              <span class="stat-value text-cyan" id="val-score">0</span>
            </div>

            <div class="timer-box" title="Global Mission Timer">
              <span class="timer-icon">${Icons.clock(13)}</span>
              <span id="val-mission-time">45s</span>
            </div>
          </div>
        </header>

        <!-- Compact Production Health Panel -->
        <div id="production-health-slot"></div>

        <!-- Main Stage Container -->
        <main class="stage-container" id="stage-container">
          <!-- Prominent Round Header & 15-Second Timer Bar -->
          <div class="round-header-row">
            <div class="active-round-tag" id="active-round-label">Round 1 of 3</div>
            <div class="round-countdown-text">
              <span id="round-seconds-val">15</span>s remaining
            </div>
          </div>

          <div class="incident-timer-track">
            <div class="incident-timer-bar" id="round-timer-bar" style="width: 100%;"></div>
          </div>

          <!-- Dynamic Incident Deck Slot -->
          <div id="incident-card-slot" style="width: 100%; display: flex; flex-direction: column; align-items: center;"></div>

          <!-- Dynamic Rapid Feedback Overlay Slot -->
          <div id="feedback-slot"></div>
        </main>
      </div>
    `;

    // Mount ProductionHealth component
    const healthSlot = this.container.querySelector('#production-health-slot');
    this.healthComponent = new ProductionHealth(this.productionState);
    this.healthComponent.mount(healthSlot);
  }

  setupSubscriptions() {
    // Scoring subscription
    this.unsubScoring = this.scoringEngine.subscribe((stats) => {
      if (!this.container) return;
      const scoreEl = this.container.querySelector('#val-score');
      const streakEl = this.container.querySelector('#val-streak');
      if (scoreEl) scoreEl.textContent = stats.score;
      if (streakEl) streakEl.textContent = `${stats.currentStreak} STREAK`;
    });

    // Global mission timer tick
    this.missionTimer.onMissionTick = (remainingSeconds) => {
      if (!this.container) return;
      const timeEl = this.container.querySelector('#val-mission-time');
      if (timeEl) {
        timeEl.textContent = `${remainingSeconds}s`;
      }
    };

    // 15-second per-round countdown tick
    this.missionTimer.onRoundTick = (remaining, total, fraction) => {
      if (!this.container) return;
      const secEl = this.container.querySelector('#round-seconds-val');
      const bar = this.container.querySelector('#round-timer-bar');
      if (secEl) secEl.textContent = remaining;
      if (bar) {
        const percent = Math.max(0, Math.min(100, (fraction !== undefined ? fraction : remaining / total) * 100));
        bar.style.width = `${percent}%`;
        if (remaining <= 3) {
          bar.classList.add('urgent');
        } else {
          bar.classList.remove('urgent');
        }
      }
    };

    // Round deadline expired (Timeout)
    this.missionTimer.onRoundTimeUp = () => {
      this.handleTimeout();
    };

    // Total 45-second mission expired
    this.missionTimer.onMissionTimeUp = () => {
      this.finishMission();
    };

    // Handle visibility changes for tab backgrounding
    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.missionTimer.pause();
      } else {
        this.missionTimer.resume();
      }
    };
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  loadNextRound() {
    if (this.missionTimer.remainingMissionSeconds <= 0) {
      this.finishMission();
      return;
    }

    if (this.activeCardComponent) {
      this.activeCardComponent.destroy();
      this.activeCardComponent = null;
    }

    const roundData = this.incidentEngine.nextRound();
    if (!roundData) {
      // All 3 rounds complete!
      this.finishMission();
      return;
    }

    this.currentRoundData = roundData;
    const { incident, roundNumber, totalRounds } = roundData;

    // Update 3-Segment Mission Tracker UI
    for (let r = 1; r <= 3; r++) {
      const seg = this.container.querySelector(`#seg-round-${r}`);
      if (seg) {
        seg.classList.remove('active', 'completed');
        if (r < roundNumber) seg.classList.add('completed');
        else if (r === roundNumber) seg.classList.add('active');
      }
    }

    const roundLabel = this.container.querySelector('#active-round-label');
    if (roundLabel) {
      roundLabel.textContent = `Round ${roundNumber} of ${totalRounds}`;
    }

    const cardSlot = this.container.querySelector('#incident-card-slot');
    const nextIncident = (this.incidentEngine && this.incidentEngine.sessionQueue)
      ? (this.incidentEngine.sessionQueue[roundNumber] || null)
      : null;

    this.activeCardComponent = new IncidentCard({
      onSelectAction: (chosenSide, activeIncident) => {
        this.handleDecision(chosenSide, activeIncident);
      }
    });
    this.activeCardComponent.mount(cardSlot, incident, nextIncident);

    // Start 15-second round countdown
    this.missionTimer.startRoundTimer();
  }

  handleDecision(chosenSide, incident) {
    if (this.isHandlingFeedback) return;
    if (this.missionTimer.isRoundExpired()) {
      // Reject any decisions submitted after round deadline expiration
      return;
    }
    this.isHandlingFeedback = true;

    // Stop round timer during feedback
    this.missionTimer.stopRoundTimer();

    const isCorrect = chosenSide === incident.correctAction;
    const outcome = isCorrect ? 'correct' : 'incorrect';

    const { pointsAwarded, bonusAwarded, streak, isStreakBonus } =
      this.scoringEngine.processOutcome(incident.id, outcome);

    this.productionState.applyIncidentOutcome(incident.impact, isCorrect);

    if (isCorrect) {
      devopsBg.triggerSuccessPulse();
      if (isStreakBonus) {
        sound.playStreak();
      } else {
        sound.playCorrect();
      }
    } else {
      devopsBg.triggerIncidentPulse();
      sound.playWrong();
    }

    this.showFeedback({
      type: isCorrect ? 'correct' : 'incorrect',
      pointsAwarded,
      bonusAwarded,
      streak,
      explanation: incident.explanation,
      correctActionTitle: incident.correctAction === 'left' ? incident.leftAction.title : incident.rightAction.title
    });
  }

  handleTimeout() {
    if (this.isHandlingFeedback) return;
    this.isHandlingFeedback = true;

    // Lock the card so no further late actions can be triggered
    if (this.activeCardComponent) {
      this.activeCardComponent.lock();
    }

    const currentIncident = this.incidentEngine.getCurrent();
    if (!currentIncident) return;

    devopsBg.triggerIncidentPulse();
    sound.playWrong();

    this.scoringEngine.processOutcome(currentIncident.id, 'timeout');
    this.productionState.applyIncidentOutcome(currentIncident.impact, false);

    this.showFeedback({
      type: 'timeout',
      pointsAwarded: 0,
      bonusAwarded: 0,
      streak: 0,
      explanation: currentIncident.explanation,
      correctActionTitle: currentIncident.correctAction === 'left' ? currentIncident.leftAction.title : currentIncident.rightAction.title
    });
  }

  showFeedback(info) {
    const feedbackSlot = this.container.querySelector('#feedback-slot');
    if (!feedbackSlot) return;

    const bannerClass = info.type === 'correct' 
      ? 'correct' 
      : (info.type === 'incorrect' ? 'incorrect' : 'timeout');

    const headline = info.type === 'correct' 
      ? 'Incident Resolved' 
      : (info.type === 'incorrect' ? 'Incorrect Response' : 'Window Expired');

    const pointsLine = info.type === 'correct'
      ? `<div class="banner-points">+${info.pointsAwarded} points</div>`
      : (info.type === 'timeout' ? '<div class="banner-points">Timeout</div>' : '');

    let streakBadge = '';
    if (info.bonusAwarded > 0) {
      streakBadge = `<div class="bonus-badge-pop"><span class="bonus-icon">${Icons.flame(14)}</span><span>+${info.bonusAwarded} streak bonus</span></div>`;
    }

    feedbackSlot.innerHTML = `
      <div class="feedback-overlay" id="active-feedback-overlay">
        <div class="feedback-banner ${bannerClass}">
          <div class="banner-title">${headline}</div>
          ${pointsLine}
        </div>

        ${streakBadge}

        <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--color-primary); margin-bottom: 6px; font-weight: 700;">
          Best action: ${info.correctActionTitle}
        </div>

        <p class="feedback-explanation">
          ${info.explanation}
        </p>

        <div class="feedback-tap-hint">
          <span>Tap anywhere to continue</span>
          <span class="hint-arrow">${Icons.arrowRight(13)}</span>
        </div>
      </div>
    `;

    const advance = () => {
      if (this.feedbackTimeout) {
        clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = null;
      }
      feedbackSlot.innerHTML = '';
      this.isHandlingFeedback = false;

      // Check if we just finished Round 3
      if (this.currentRoundData && this.currentRoundData.roundNumber >= 3) {
        this.finishMission();
      } else {
        this.loadNextRound();
      }
    };

    const overlay = feedbackSlot.querySelector('#active-feedback-overlay');
    if (overlay) {
      overlay.addEventListener('click', advance);
    }

    // Fast auto-advance after 1.4s
    this.feedbackTimeout = setTimeout(advance, 1400);
  }

  finishMission() {
    this.teardown();
    sound.playGameOver();
    this.onMissionComplete();
  }

  teardown() {
    this.missionTimer.stopAll();
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
    if (this.activeCardComponent) {
      this.activeCardComponent.destroy();
      this.activeCardComponent = null;
    }
    if (this.healthComponent) {
      this.healthComponent.destroy();
      this.healthComponent = null;
    }
    if (this.unsubScoring) {
      this.unsubScoring();
      this.unsubScoring = null;
    }
    if (this.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.handleVisibilityChange = null;
    }
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  destroy() {
    this.teardown();
  }
}
