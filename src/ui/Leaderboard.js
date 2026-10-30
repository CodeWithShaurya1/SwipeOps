/**
 * Leaderboard Component
 * Displays sorted competitive results from Supabase or local storage.
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { Icons } from './icons.js';

export class Leaderboard {
  constructor({ onBackToMenu, onStartMission }) {
    this.onBackToMenu = onBackToMenu;
    this.onStartMission = onStartMission;
    this.container = null;
  }

  async mount(container) {
    this.container = container;
    this.renderLoading();
    await this.loadData();
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="leaderboard-screen">
        <div class="leaderboard-header">
          <div class="leaderboard-title">
            <div class="category-tag">Club Battle · TechVerse · DevOps Club</div>
            <h2>SwipeOps Global Leaderboard</h2>
          </div>
        </div>
        <div class="leaderboard-card glass-surface">
          <div class="leaderboard-empty">
            <p>Connecting to leaderboard service...</p>
          </div>
        </div>
      </div>
    `;
  }

  async loadData() {
    const { data, source } = await storage.getLeaderboard(50);
    this.renderTable(data, source);
  }

  renderTable(records, source) {
    const isCloud = source === 'cloud';

    let tableRows = '';
    if (records.length === 0) {
      tableRows = `
        <tr>
          <td colspan="7" class="leaderboard-empty">
            No incident missions recorded yet. Be the first on-call hero to complete a mission!
          </td>
        </tr>
      `;
    } else {
      tableRows = records.map((entry, index) => {
        const rank = index + 1;
        let rankClass = '';
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';

        return `
          <tr>
            <td>
              <span class="rank-pill ${rankClass}">${rank}</span>
            </td>
            <td style="font-weight: 700; color: var(--text-main);">
              ${this.escapeHtml(entry.player_name || 'Anonymous')}
            </td>
            <td class="mono text-muted" style="font-size: 0.8rem;">
              ${this.escapeHtml(entry.enrollment_number || '-')}
            </td>
            <td class="mono text-cyan" style="font-weight: 800; font-size: 1.05rem;">
              ${entry.final_score}
            </td>
            <td class="mono text-green">
              ${entry.accuracy ?? 100}%
            </td>
            <td class="mono">
              ${entry.correct_decisions ?? 0}
            </td>
            <td class="mono text-amber">
              ${entry.max_streak ?? 0}
            </td>
          </tr>
        `;
      }).join('');
    }

    this.container.innerHTML = `
      <div class="leaderboard-screen">
        <div class="leaderboard-header">
          <div class="leaderboard-title">
            <div class="category-tag">Club Battle · TechVerse · DevOps Club</div>
            <h2>SwipeOps Global Leaderboard</h2>
            <div style="font-family: var(--font-mono); font-size: 0.8rem; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
              <span class="status-dot ${isCloud ? 'status-dot-pass' : 'status-dot-standby'}"></span>
              <span class="text-muted">Source:</span>
              <span class="${isCloud ? 'status-pass' : 'status-standby'}">${isCloud ? 'Cloud cluster sync' : 'Local standalone storage'}</span>
            </div>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" id="btn-lb-refresh">
              <span class="btn-icon">${Icons.refresh(14)}</span>
              <span>Refresh</span>
            </button>
            <button class="btn btn-secondary" id="btn-lb-menu">
              <span class="btn-icon">${Icons.arrowLeft(14)}</span>
              <span>Menu</span>
            </button>
            <button class="btn btn-primary" id="btn-lb-play">
              <span class="btn-icon">${Icons.play(14)}</span>
              <span>Start mission</span>
            </button>
          </div>
        </div>

        <div class="leaderboard-card glass-surface">
          <div class="table-responsive">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th style="width: 60px;">Rank</th>
                  <th>Operator</th>
                  <th>Enrollment</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Resolved</th>
                  <th>Max Streak</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-lb-refresh').addEventListener('click', async () => {
      sound.playClick();
      this.renderLoading();
      await this.loadData();
    });

    this.container.querySelector('#btn-lb-menu').addEventListener('click', () => {
      sound.playClick();
      this.onBackToMenu();
    });

    this.container.querySelector('#btn-lb-play').addEventListener('click', () => {
      sound.playClick();
      this.onStartMission();
    });
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
