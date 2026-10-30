/**
 * TECHVERSE LEADERBOARD COMPONENT
 * Pixel-faithful reproduction of the official TechVerse Leaderboard reference design.
 * Features:
 * - Orbitron Electric Cyan title: TECHVERSE LEADERBOARD
 * - Official tournament standings status dot
 * - [ SHARED EVENT CLOUD (LIVE) ] & [ RESET LOCAL ] header tags
 * - Rank podium medals (🥇 1, 🥈 2, 🥉 3, #4...)
 * - Magenta / Pink Enrollment with [ RUN #2 ] replay badges
 * - Comma-formatted cyan scores (e.g. 2,250)
 * - Streak with fire emoji (e.g. 4🔥)
 * - Time formatted date column (HH:MM)
 * - Bottom action bar: [⚡ NEXT PLAYER], [⚙ CLOUD SYNC], [🔄 REFRESH], [CLOSE]
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';

export class Leaderboard {
  constructor({ onBackToMenu, onStartMission, onOpenAdmin }) {
    this.onBackToMenu = onBackToMenu;
    this.onStartMission = onStartMission;
    this.onOpenAdmin = onOpenAdmin;
    this.container = null;
  }

  async mount(container) {
    this.container = container;
    this.renderLoading();
    await this.loadData();
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="techverse-lb-screen">
        <div class="techverse-lb-card">
          <div class="techverse-lb-header">
            <div class="techverse-lb-title-group">
              <h1 class="techverse-lb-title">TECHVERSE LEADERBOARD</h1>
              <div class="techverse-lb-standings-badge">
                <span class="techverse-dot-cyan"></span>
                <span>OFFICIAL TOURNAMENT STANDINGS</span>
              </div>
            </div>
            <div class="techverse-lb-top-controls">
              <div class="techverse-cloud-status-badge live">
                [ SHARED EVENT CLOUD (LIVE) ]
              </div>
            </div>
          </div>
          <div class="techverse-table-container">
            <div class="techverse-empty-row" style="padding: 60px 20px; text-align: center;">
              <div class="techverse-spinner"></div>
              <p style="color: #38bdf8; font-family: var(--font-mono); margin-top: 14px; letter-spacing: 0.08em; font-size: 0.85rem;">
                FETCHING CLOUD STANDINGS FROM CLUSTER...
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadData() {
    const { data, source } = await storage.getLeaderboard(100);
    this.renderTable(data, source);
  }

  renderTable(records, source) {
    const isCloud = source === 'cloud';

    let tableRows = '';
    if (!records || records.length === 0) {
      tableRows = `
        <tr>
          <td colspan="7" class="techverse-empty-row" style="text-align: center; padding: 56px 24px;">
            <div style="font-size: 1.1rem; color: #f8fafc; font-family: var(--font-mono); font-weight: 700; margin-bottom: 8px; letter-spacing: 0.05em;">
              NO MISSION ATTEMPTS RECORDED YET
            </div>
            <div style="color: #64748b; font-family: var(--font-mono); font-size: 0.85rem;">
              Click <strong style="color: #00f0ff;">[ ⚡ NEXT PLAYER ]</strong> to launch the first official tournament run!
            </div>
          </td>
        </tr>
      `;
    } else {
      tableRows = records.map((entry, index) => {
        const rank = index + 1;
        let rankDisplay = '';

        if (rank === 1) {
          rankDisplay = `<span class="tv-rank-podium gold"><span class="medal-icon">🥇</span> 1</span>`;
        } else if (rank === 2) {
          rankDisplay = `<span class="tv-rank-podium silver"><span class="medal-icon">🥈</span> 2</span>`;
        } else if (rank === 3) {
          rankDisplay = `<span class="tv-rank-podium bronze"><span class="medal-icon">🥉</span> 3</span>`;
        } else {
          rankDisplay = `<span class="tv-rank-default">#${rank}</span>`;
        }

        const operatorName = this.escapeHtml(entry.student_name || entry.player_name || 'Operator');
        const rawEnrollment = entry.enrollment_number || entry.enrollment_masked || '—';
        const attemptsCount = Number(entry.attempts_count || 1);
        const runBadge = attemptsCount > 1 ? `<span class="tv-run-badge">RUN #${attemptsCount}</span>` : '';

        // Formatted score with commas e.g. 2,250
        const scoreVal = Number(entry.final_score || 0);
        const formattedScore = scoreVal.toLocaleString('en-US');

        // Accuracy
        const accuracyVal = entry.accuracy != null ? `${entry.accuracy}%` : '100%';

        // Streak with fire emoji e.g. 4🔥 or 0🔥
        const streakNum = entry.max_streak != null ? entry.max_streak : (entry.correct_decisions ?? 0);
        const streakVal = `${streakNum}🔥`;

        // Time format: HH:MM from completed_at
        let timeStr = '10:58';
        if (entry.completed_at) {
          try {
            const d = new Date(entry.completed_at);
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            timeStr = `${hours}:${mins}`;
          } catch (_) {}
        }

        return `
          <tr class="tv-table-row rank-${rank}">
            <td class="col-rank">${rankDisplay}</td>
            <td class="col-operator">${operatorName}</td>
            <td class="col-enrollment">
              <span class="tv-enrollment-text">${this.escapeHtml(rawEnrollment)}</span>
              ${runBadge}
            </td>
            <td class="col-score">${formattedScore}</td>
            <td class="col-accuracy">${accuracyVal}</td>
            <td class="col-streak">${streakVal}</td>
            <td class="col-date">${timeStr}</td>
          </tr>
        `;
      }).join('');
    }

    this.container.innerHTML = `
      <div class="techverse-lb-screen">
        <div class="techverse-lb-card">
          
          <!-- Top Header Bar -->
          <div class="techverse-lb-header">
            <div class="techverse-lb-title-group">
              <h1 class="techverse-lb-title">TECHVERSE LEADERBOARD</h1>
              <div class="techverse-lb-standings-badge">
                <span class="techverse-dot-cyan"></span>
                <span>OFFICIAL TOURNAMENT STANDINGS</span>
              </div>
            </div>

            <div class="techverse-lb-top-controls">
              <div class="techverse-cloud-status-badge ${isCloud ? 'live' : 'offline'}">
                ${isCloud ? '[ SHARED EVENT CLOUD (LIVE) ]' : '[ LOCAL STANDALONE ENGINE ]'}
              </div>
              <button type="button" class="techverse-btn-reset-local" id="btn-lb-reset-local" title="Reset tournament data">
                <span>🧹 RESET LOCAL</span>
              </button>
            </div>
          </div>

          <!-- Table Container -->
          <div class="techverse-table-container">
            <table class="techverse-table">
              <thead>
                <tr>
                  <th style="width: 90px;">RANK</th>
                  <th>OPERATOR</th>
                  <th>ENROLLMENT</th>
                  <th>SCORE</th>
                  <th>ACCURACY</th>
                  <th>STREAK</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>

          <!-- Bottom Action Buttons Footer -->
          <div class="techverse-lb-footer">
            <div class="techverse-lb-footer-left">
              <button type="button" class="techverse-btn-action next-player" id="btn-lb-next-player">
                <span>⚡ NEXT PLAYER</span>
              </button>
              <button type="button" class="techverse-btn-action cloud-sync" id="btn-lb-cloud-sync">
                <span>⚙ CLOUD SYNC</span>
              </button>
            </div>

            <div class="techverse-lb-footer-right">
              <button type="button" class="techverse-btn-action refresh" id="btn-lb-refresh">
                <span>🔄 REFRESH</span>
              </button>
              <button type="button" class="techverse-btn-action close" id="btn-lb-close">
                <span>CLOSE</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-lb-next-player').addEventListener('click', () => {
      sound.playClick();
      this.onStartMission();
    });

    this.container.querySelector('#btn-lb-cloud-sync').addEventListener('click', async () => {
      sound.playClick();
      const syncBtn = this.container.querySelector('#btn-lb-cloud-sync');
      syncBtn.disabled = true;
      syncBtn.innerHTML = `<span>⚙ SYNCING...</span>`;
      await this.loadData();
    });

    this.container.querySelector('#btn-lb-refresh').addEventListener('click', async () => {
      sound.playClick();
      this.renderLoading();
      await this.loadData();
    });

    this.container.querySelector('#btn-lb-close').addEventListener('click', () => {
      sound.playClick();
      this.onBackToMenu();
    });

    this.container.querySelector('#btn-lb-reset-local').addEventListener('click', async () => {
      sound.playClick();
      const pass = window.prompt('Enter Administrator Authorization Key to reset tournament records:');
      if (!pass) return;

      const isValid = await storage.verifyAdminKey(pass);
      if (!isValid) {
        alert('Access Denied: Invalid Administrator Authorization Key.');
        return;
      }

      if (window.confirm('WARNING: Are you sure you want to purge local competition records?')) {
        await storage.resetTournamentRecords(pass);
        alert('Tournament records successfully cleared. Ready for new attempts.');
        this.renderLoading();
        await this.loadData();
      }
    });
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
