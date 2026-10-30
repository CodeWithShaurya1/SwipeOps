/**
 * GameOver / Results Screen Component
 * Renders concise, exciting 3-round mission results:
 * - Animated final score reveal
 * - Round scorecard (3/3 completed)
 * - Final production health vitals
 * - Real-time cloud/local leaderboard submission with Best Score Policy
 * - Confetti celebration on strong or perfect runs (350 pts)
 * - Single Official Attempt Enforcement (No direct Play Again loophole)
 */

import confetti from 'canvas-confetti';
import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { maskEnrollment } from '../systems/IdentityUtils.js';
import { Icons } from './icons.js';

export class GameOver {
  constructor({
    playerData,
    scoringStats,
    healthMetrics,
    missionDuration,
    onViewLeaderboard,
    onNextPlayer,
    onReturnToMenu
  }) {
    this.playerData = playerData;
    this.scoringStats = scoringStats;
    this.healthMetrics = healthMetrics;
    this.missionDuration = missionDuration;
    this.onViewLeaderboard = onViewLeaderboard;
    this.onNextPlayer = onNextPlayer;
    this.onReturnToMenu = onReturnToMenu;

    this.syncStatus = 'SYNCING OFFICIAL SCORE...';
    this.bestScoreNotice = '';
  }

  async mount(container) {
    this.container = container;
    this.render();
    this.animateScore();
    this.triggerCelebration();
    await this.submitAndFetchRank();
  }

  getPerformanceTier(score, correct) {
    if (score >= 350 || correct === 3) return 'Flawless Run · Principal SRE Architect';
    if (score >= 200 || correct === 2) return 'Production Rescue Specialist';
    if (score >= 100 || correct === 1) return 'On-Call Systems Engineer';
    return 'DevOps Apprentice';
  }

  render() {
    const stats = this.scoringStats;
    const health = this.healthMetrics;
    const tier = this.getPerformanceTier(stats.score, stats.correct);

    this.container.innerHTML = `
      <div class="game-over-screen">
        <div class="results-card glass-surface">
          <div class="results-eyebrow">SwipeOps · 3-round mission complete</div>
          <h2 class="results-title">Mission Debriefing</h2>
          
          <div class="results-tier-badge">
            ${tier}
          </div>

          <div class="big-score-display">
            <span class="big-score-num" id="animated-score">0</span>
            <span class="big-score-label">Final Score · Max 350 pts</span>
          </div>

          <div id="best-score-badge-slot" style="margin-bottom: 12px; display: none;"></div>

          <!-- Operator Details -->
          <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-muted); margin-bottom: 20px;">
            Operator: <span class="text-main" style="font-weight: 700;">${this.escapeHtml(this.playerData.name)}</span> ·
            Enrollment: <span class="text-cyan">${this.escapeHtml(maskEnrollment(this.playerData.enrollment))}</span> ·
            Status: <span id="sync-status-badge" class="status-standby">${this.syncStatus}</span>
          </div>

          <!-- Performance Statistics Grid -->
          <div class="results-grid">
            <div class="result-stat-box">
              <span class="result-stat-label">Round outcome</span>
              <span class="result-stat-val text-green">${stats.correct} / 3</span>
            </div>
            <div class="result-stat-box">
              <span class="result-stat-label">Failed / Timeout</span>
              <span class="result-stat-val text-rose">${stats.incorrect + stats.timeout}</span>
            </div>
            <div class="result-stat-box">
              <span class="result-stat-label">Accuracy</span>
              <span class="result-stat-val text-cyan">${stats.accuracy}%</span>
            </div>
            <div class="result-stat-box">
              <span class="result-stat-label">Streak</span>
              <span class="result-stat-val text-amber">${stats.maxStreak}</span>
            </div>
          </div>

          <!-- Production Health Retrospective -->
          <div style="text-align: left; margin-bottom: 8px; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">
            Final infrastructure vitals
          </div>
          <div class="results-health-row">
            <div class="health-stat-mini">
              <span class="text-muted">Availability</span>
              <span class="${health.availability >= 70 ? 'text-green' : 'text-rose'}">${health.availability}%</span>
            </div>
            <div class="health-stat-mini">
              <span class="text-muted">Data integrity</span>
              <span class="${health.integrity >= 70 ? 'text-green' : 'text-rose'}">${health.integrity}%</span>
            </div>
            <div class="health-stat-mini">
              <span class="text-muted">Security</span>
              <span class="${health.security >= 70 ? 'text-green' : 'text-rose'}">${health.security}%</span>
            </div>
            <div class="health-stat-mini">
              <span class="text-muted">Stability</span>
              <span class="${health.stability >= 70 ? 'text-green' : 'text-rose'}">${health.stability}%</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="results-actions">
            <button class="btn btn-primary" id="btn-results-leaderboard">
              <span class="btn-icon">${Icons.trophy(15)}</span>
              <span>View Leaderboard</span>
            </button>
            <button class="btn btn-secondary" id="btn-results-next">
              <span class="btn-icon">${Icons.user(15)}</span>
              <span>Next Player</span>
            </button>
            <button class="btn btn-secondary" id="btn-results-menu">
              <span class="btn-icon">${Icons.arrowLeft(15)}</span>
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-results-leaderboard').addEventListener('click', () => {
      sound.playClick();
      this.onViewLeaderboard();
    });

    this.container.querySelector('#btn-results-next').addEventListener('click', () => {
      sound.playClick();
      this.onNextPlayer();
    });

    this.container.querySelector('#btn-results-menu').addEventListener('click', () => {
      sound.playClick();
      this.onReturnToMenu();
    });
  }

  animateScore() {
    const target = this.scoringStats.score;
    const scoreEl = this.container.querySelector('#animated-score');
    if (!scoreEl) return;

    if (target === 0) {
      scoreEl.textContent = '0';
      return;
    }

    const duration = 900;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);

      scoreEl.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        scoreEl.textContent = target;
      }
    };

    requestAnimationFrame(step);
  }

  triggerCelebration() {
    if (this.scoringStats.score >= 200) {
      try {
        confetti({
          particleCount: this.scoringStats.score >= 350 ? 120 : 60,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#38BDF8', '#8B5CF6', '#34D399', '#FBBF24']
        });
      } catch (_) {}
    }
  }

  async submitAndFetchRank() {
    const record = {
      enrollment: this.playerData.enrollment,
      finalScore: this.scoringStats.score,
      correct: this.scoringStats.correct,
      incorrect: this.scoringStats.incorrect,
      timeout: this.scoringStats.timeout,
      accuracy: this.scoringStats.accuracy,
      maxStreak: this.scoringStats.maxStreak,
      missionDuration: this.missionDuration
    };

    const res = await storage.completeAttempt(this.playerData.attemptId, record);
    const badge = this.container.querySelector('#sync-status-badge');
    const bestSlot = this.container.querySelector('#best-score-badge-slot');

    if (badge) {
      if (res.cloudSaved) {
        badge.textContent = 'SAVED TO CLOUD LEADERBOARD';
        badge.className = 'status-pass';
      } else {
        badge.textContent = 'SAVED LOCALLY (STANDALONE)';
        badge.className = 'status-standby';
      }
    }

    if (bestSlot) {
      if (res.isNewBest) {
        bestSlot.innerHTML = `<span class="status-pass" style="font-family: var(--font-mono); font-size: 0.85rem; padding: 4px 10px; border-radius: 6px; background: rgba(52, 211, 153, 0.15); border: 1px solid rgba(52, 211, 153, 0.4);">★ NEW BEST TOURNAMENT SCORE!</span>`;
        bestSlot.style.display = 'block';
      } else if (res.bestScore > record.finalScore) {
        bestSlot.innerHTML = `<span class="status-standby" style="font-family: var(--font-mono); font-size: 0.85rem; padding: 4px 10px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4);">BEST SCORE MAINTAINED (${res.bestScore} PTS)</span>`;
        bestSlot.style.display = 'block';
      }
    }
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
