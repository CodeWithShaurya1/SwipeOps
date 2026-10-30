/**
 * Leaderboard Component
 * Displays competitive results with Best Score Policy,
 * partially masked student enrollment numbers, tie-breaker ranking,
 * and top 3 podium treatments.
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { maskEnrollment } from '../systems/IdentityUtils.js';
import { Icons } from './icons.js';

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
      <div class="leaderboard-screen">
        <div class="leaderboard-header">
          <div class="leaderboard-title">
            <div class="category-tag">Club Battle · TechVerse · DevOps Club</div>
            <h2>SwipeOps Global Leaderboard</h2>
          </div>
        </div>
        <div class="leaderboard-card glass-surface">
          <div class="leaderboard-empty">
            <p>Connecting to cluster leaderboard service...</p>
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
          <td colspan="7" class="leaderboard-empty" style="text-align: center; padding: 48px 24px;">
            <div style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 8px;">No mission attempts recorded yet.</div>
            <div style="color: var(--text-muted); font-size: 0.85rem;">Be the first on-call operator to resolve production incidents and claim Rank #1!</div>
          </td>
        </tr>
      `;
    } else {
      tableRows = records.map((entry, index) => {
        const rank = index + 1;
        let rankClass = '';
        let rowClass = '';
        let badgeIcon = '';

        if (rank === 1) {
          rankClass = 'gold';
          rowClass = 'rank-1-row';
          badgeIcon = '👑';
        } else if (rank === 2) {
          rankClass = 'silver';
          rowClass = 'rank-2-row';
          badgeIcon = '🥈';
        } else if (rank === 3) {
          rankClass = 'bronze';
          rowClass = 'rank-3-row';
          badgeIcon = '🥉';
        }

        const maskedEnrollment = entry.enrollment_masked || maskEnrollment(entry.enrollment_number);
        const durationText = entry.duration_seconds ? `${entry.duration_seconds}s` : '—';

        return `
          <tr class="${rowClass}">
            <td>
              <span class="rank-pill ${rankClass}">
                ${badgeIcon ? `${badgeIcon} ` : ''}${rank}
              </span>
            </td>
            <td style="font-weight: 700; color: var(--text-main);">
              ${this.escapeHtml(entry.student_name || entry.player_name || 'Anonymous')}
              ${entry.is_test ? '<span class="status-standby" style="font-size: 0.65rem; margin-left: 6px; padding: 2px 6px; border-radius: 4px;">TEST</span>' : ''}
            </td>
            <td class="mono text-muted" style="font-size: 0.82rem; letter-spacing: 0.05em;">
              ${this.escapeHtml(maskedEnrollment)}
            </td>
            <td class="mono text-cyan" style="font-weight: 800; font-size: 1.1rem;">
              ${entry.final_score}
            </td>
            <td class="mono text-green">
              ${entry.accuracy ?? 100}%
            </td>
            <td class="mono text-muted">
              ${durationText}
            </td>
            <td class="mono text-amber">
              ${entry.correct_decisions ?? 0} / 3
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
            <div style="font-family: var(--font-mono); font-size: 0.8rem; margin-top: 6px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                <span class="status-dot status-dot-pass"></span>
                <span class="text-muted">Cluster Mode:</span>
                <span class="status-pass">${isCloud ? 'Cloud Sync Active' : 'Offline Tournament Engine · Active'}</span>
              </span>
              <span class="text-muted">· Best Score Policy (1 Entry / Student)</span>
            </div>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
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
            <button class="btn btn-secondary" id="btn-lb-admin" style="border-color: rgba(139, 92, 246, 0.4); color: #c4b5fd;">
              <span class="btn-icon">⚡</span>
              <span>Admin Portal</span>
            </button>
          </div>
        </div>

        <div class="leaderboard-card glass-surface">
          <div class="table-responsive">
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th style="width: 70px;">Rank</th>
                  <th>Operator</th>
                  <th>Enrollment (Protected)</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Duration</th>
                  <th>Resolved</th>
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

    const adminBtn = this.container.querySelector('#btn-lb-admin');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        sound.playClick();
        if (typeof this.onOpenAdmin === 'function') {
          this.onOpenAdmin();
        }
      });
    }
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
