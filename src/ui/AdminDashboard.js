/**
 * AdminDashboard Component
 * Private Administrator Console for SwipeOps Event Management:
 * 1. Overview Statistics (Live telemetry)
 * 2. Registered Players (Searchable, filterable, student history inspect)
 * 3. Attempt History (Chronological ledger of all runs)
 * 4. Replay Management (Authorize 1 replay with reason, revoke unused)
 * 5. Leaderboard Management (Live official audit & test filtering)
 * 6. Admin Activity Log (Append-only audit trail)
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { normalizeEnrollment } from '../systems/IdentityUtils.js';
import { Icons } from './icons.js';

export class AdminDashboard {
  constructor({ onClose }) {
    this.onClose = onClose;
    this.isAuthenticated = false;
    this.currentAdmin = 'Lead SRE Admin';
    this.activeTab = 'overview'; // 'overview' | 'players' | 'attempts' | 'replays' | 'leaderboard' | 'audit'

    // State cache
    this.stats = null;
    this.players = [];
    this.attempts = [];
    this.replays = [];
    this.auditLogs = [];

    // Filter states
    this.playerSearch = '';
    this.playerFilter = 'all';
    this.attemptEnrollmentFilter = '';

    this.container = null;
  }

  async mount(container) {
    this.container = container;
    if (!this.isAuthenticated) {
      this.renderLoginScreen();
    } else {
      await this.renderDashboard();
    }
  }

  renderLoginScreen() {
    this.container.innerHTML = `
      <div class="admin-login-overlay">
        <div class="admin-login-card glass-surface">
          <div class="admin-lock-icon">${Icons.shield(32)}</div>
          <div class="category-tag" style="margin-bottom: 8px;">Restricted Event Administration</div>
          <h2 style="font-family: var(--font-display); font-size: 1.8rem; color: #fff; margin-bottom: 8px; letter-spacing: 0.05em;">
            SWIPEOPS SRE DASHBOARD
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px;">
            Authorized event organizers only. Access controls and replay authorizations are audited.
          </p>

          <form id="admin-login-form">
            <div class="reg-form-group" style="text-align: left; margin-bottom: 16px;">
              <label class="reg-label" for="admin-name-input">
                <span>Admin Call-sign / Name</span>
              </label>
              <div class="input-wrapper">
                <span class="input-icon">${Icons.user(16)}</span>
                <input 
                  type="text" 
                  id="admin-name-input" 
                  class="reg-input" 
                  value="${this.currentAdmin}" 
                  required 
                />
              </div>
            </div>

            <div class="reg-form-group" style="text-align: left; margin-bottom: 20px;">
              <label class="reg-label" for="admin-pass-input">
                <span>Security Passphrase</span>
              </label>
              <div class="input-wrapper">
                <span class="input-icon">🔑</span>
                <input 
                  type="password" 
                  id="admin-pass-input" 
                  class="reg-input mono" 
                  placeholder="Enter administrator passkey" 
                  required 
                  autocomplete="current-password"
                />
              </div>
            </div>

            <div id="admin-login-err" class="reg-error-banner" style="display: none; margin-bottom: 16px;"></div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" id="btn-admin-cancel">
                <span>Cancel</span>
              </button>
              <button type="submit" class="btn btn-primary" id="btn-admin-submit">
                <span>Authenticate</span>
                <span class="btn-icon">${Icons.arrowRight(14)}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#admin-login-form');
    const passInput = this.container.querySelector('#admin-pass-input');
    const nameInput = this.container.querySelector('#admin-name-input');
    const errBox = this.container.querySelector('#admin-login-err');

    passInput.focus();

    this.container.querySelector('#btn-admin-cancel').addEventListener('click', () => {
      sound.playClick();
      this.onClose();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sound.playClick();
      errBox.style.display = 'none';

      const pass = passInput.value.trim();
      const adminName = nameInput.value.trim() || 'Lead SRE Admin';

      if (!storage.verifyAdminPassphrase(pass)) {
        errBox.textContent = 'Invalid administrator passkey. Access denied.';
        errBox.style.display = 'block';
        return;
      }

      this.isAuthenticated = true;
      this.currentAdmin = adminName;
      this.renderDashboard();
    });
  }

  async renderDashboard() {
    this.container.innerHTML = `
      <div class="admin-dashboard-container">
        <!-- Top Navigation Bar -->
        <header class="admin-topbar glass-surface">
          <div class="admin-brand">
            <span class="admin-badge-dot"></span>
            <div class="admin-title-wrap">
              <span class="admin-main-title">SWIPEOPS // SRE EVENT CONSOLE</span>
              <span class="admin-sub-title">Organizer: ${this.escapeHtml(this.currentAdmin)} · Live Tournament Control</span>
            </div>
          </div>

          <div class="admin-topbar-actions">
            <button class="btn btn-secondary btn-sm" id="btn-admin-reset" style="border-color: rgba(244, 63, 94, 0.4); color: var(--accent-rose);" title="Reset event records for fresh competition">
              <span>🧹 Reset Data</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-admin-refresh">
              <span class="btn-icon">${Icons.refresh(13)}</span>
              <span>Refresh</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-admin-exit">
              <span class="btn-icon">${Icons.arrowLeft(13)}</span>
              <span>Exit Console</span>
            </button>
          </div>
        </header>

        <!-- Tab Navigation Navigation -->
        <div class="admin-tabs-nav glass-surface">
          <button class="admin-tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
            <span>📊 Overview</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'players' ? 'active' : ''}" data-tab="players">
            <span>👥 Registered Players</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'attempts' ? 'active' : ''}" data-tab="attempts">
            <span>📜 Attempt History</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'replays' ? 'active' : ''}" data-tab="replays">
            <span>⚡ Replay Management</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'leaderboard' ? 'active' : ''}" data-tab="leaderboard">
            <span>🏆 Leaderboard Audit</span>
          </button>
          <button class="admin-tab-btn ${this.activeTab === 'audit' ? 'active' : ''}" data-tab="audit">
            <span>🛡️ Admin Activity Log</span>
          </button>
        </div>

        <!-- Main Tab Content Area -->
        <main class="admin-tab-content" id="admin-tab-body">
          <div class="admin-loading-state">
            <span class="status-standby">Fetching telemetry...</span>
          </div>
        </main>
      </div>
    `;

    // Hook tab switches
    this.container.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        this.activeTab = btn.getAttribute('data-tab');
        this.container.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadActiveTab();
      });
    });

    this.container.querySelector('#btn-admin-refresh').addEventListener('click', () => {
      sound.playClick();
      this.loadActiveTab();
    });

    const resetBtn = this.container.querySelector('#btn-admin-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        sound.playClick();
        if (confirm('Are you sure you want to reset all tournament records? This clears all registered students, attempts, and replays so you can start a fresh competition.')) {
          storage.adminResetAllData(this.currentAdmin).then(() => {
            alert('Tournament records successfully reset. Ready for new registrations.');
            this.loadActiveTab();
          });
        }
      });
    }

    this.container.querySelector('#btn-admin-exit').addEventListener('click', () => {
      sound.playClick();
      this.onClose();
    });

    await this.loadActiveTab();
  }

  async loadActiveTab() {
    const body = this.container.querySelector('#admin-tab-body');
    if (!body) return;

    body.innerHTML = `
      <div class="admin-loading-state">
        <span class="status-standby">Fetching telemetry...</span>
      </div>
    `;

    if (this.activeTab === 'overview') {
      await this.renderOverviewTab(body);
    } else if (this.activeTab === 'players') {
      await this.renderPlayersTab(body);
    } else if (this.activeTab === 'attempts') {
      await this.renderAttemptsTab(body);
    } else if (this.activeTab === 'replays') {
      await this.renderReplaysTab(body);
    } else if (this.activeTab === 'leaderboard') {
      await this.renderLeaderboardTab(body);
    } else if (this.activeTab === 'audit') {
      await this.renderAuditLogTab(body);
    }
  }

  // ==========================================================================
  // TAB 1: OVERVIEW STATISTICS
  // ==========================================================================
  async renderOverviewTab(body) {
    this.stats = await storage.adminGetStats();
    const s = this.stats;

    body.innerHTML = `
      <div class="admin-overview-grid">
        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Total Registered Players</span>
          <span class="stat-card-num text-cyan">${s.total_registered_players}</span>
          <span class="stat-card-meta">Students onboarded into database</span>
        </div>

        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Completed Attempts</span>
          <span class="stat-card-num text-green">${s.total_completed_attempts}</span>
          <span class="stat-card-meta">Finished 3-round incident runs</span>
        </div>

        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Currently Active Attempts</span>
          <span class="stat-card-num text-amber">${s.currently_active_attempts}</span>
          <span class="stat-card-meta">Operators currently inside mission</span>
        </div>

        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Students Not Played</span>
          <span class="stat-card-num text-muted">${s.students_not_played}</span>
          <span class="stat-card-meta">Registered but not started</span>
        </div>

        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Students Already Played</span>
          <span class="stat-card-num text-purple">${s.students_already_played}</span>
          <span class="stat-card-meta">Locked by 1-attempt rule</span>
        </div>

        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Authorized Replays (Pending)</span>
          <span class="stat-card-num text-amber">${s.authorized_replays}</span>
          <span class="stat-card-meta">Waiting to be launched</span>
        </div>

        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Used Replays (Consumed)</span>
          <span class="stat-card-num text-green">${s.used_replays}</span>
          <span class="stat-card-meta">Replays completed</span>
        </div>

        <div class="admin-stat-card glass-surface">
          <span class="stat-card-title">Total Attempts (All Runs)</span>
          <span class="stat-card-num text-main">${s.total_attempts}</span>
          <span class="stat-card-meta">Official + Replays combined</span>
        </div>

        <div class="admin-stat-card glass-surface" style="border-color: rgba(56, 189, 248, 0.4);">
          <span class="stat-card-title">Tournament Highest Score</span>
          <span class="stat-card-num text-cyan">${s.highest_score} <span style="font-size: 1rem; color: var(--text-muted);">/ 350 pts</span></span>
          <span class="stat-card-meta">Top score recorded on cluster</span>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 2: REGISTERED PLAYERS
  // ==========================================================================
  async renderPlayersTab(body) {
    this.players = await storage.adminGetStudents(this.playerSearch, this.playerFilter);

    body.innerHTML = `
      <div class="admin-subview">
        <div class="admin-controls-bar glass-surface">
          <div class="admin-search-wrap">
            <span class="input-icon">${Icons.search ? Icons.search(14) : '🔍'}</span>
            <input 
              type="text" 
              id="admin-player-search" 
              class="admin-input" 
              placeholder="Search by student name or enrollment number..." 
              value="${this.escapeHtml(this.playerSearch)}"
            />
          </div>

          <div class="admin-filter-wrap">
            <label class="admin-filter-label">Status Filter:</label>
            <select id="admin-player-filter" class="admin-select">
              <option value="all" ${this.playerFilter === 'all' ? 'selected' : ''}>All Students</option>
              <option value="completed" ${this.playerFilter === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="active" ${this.playerFilter === 'active' ? 'selected' : ''}>Active Attempt</option>
              <option value="replay_authorized" ${this.playerFilter === 'replay_authorized' ? 'selected' : ''}>Replay Authorized</option>
            </select>
          </div>
        </div>

        <div class="admin-table-card glass-surface">
          <div class="table-responsive">
            <table class="leaderboard-table admin-table">
              <thead>
                <tr>
                  <th>Player Name</th>
                  <th>Enrollment Number</th>
                  <th>Registered</th>
                  <th>Attempts</th>
                  <th>Best Score</th>
                  <th>Status</th>
                  <th>Replay Status</th>
                  <th style="text-align: right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${this.players.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">No student records found matching search criteria.</td></tr>
                ` : this.players.map(p => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">
                      ${this.escapeHtml(p.student_name)}
                      ${p.is_test ? '<span class="status-standby" style="font-size: 0.65rem; padding: 2px 5px; border-radius: 4px; margin-left: 4px;">TEST</span>' : ''}
                    </td>
                    <td class="mono text-cyan">${this.escapeHtml(p.enrollment_number)}</td>
                    <td class="mono text-muted" style="font-size: 0.78rem;">${new Date(p.created_at).toLocaleTimeString()}</td>
                    <td class="mono text-amber">${p.attempts_count ?? 1}</td>
                    <td class="mono text-green" style="font-weight: 800;">${p.best_score ?? 0} pts</td>
                    <td>
                      <span class="status-pill status-${p.status === 'completed' ? 'pass' : (p.status === 'active' ? 'active' : 'standby')}">
                        ${p.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      ${p.replay_authorized 
                        ? '<span class="status-pass" style="font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); color: #f59e0b;">AUTHORIZED</span>' 
                        : '<span class="text-muted" style="font-size: 0.75rem;">None</span>'}
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-xs btn-inspect-history" data-enrollment="${p.enrollment_number}">
                        <span>View History</span>
                      </button>
                      ${!p.replay_authorized ? `
                        <button class="btn btn-secondary btn-xs btn-quick-replay" data-enrollment="${p.enrollment_number}" data-name="${this.escapeHtml(p.student_name)}" style="border-color: rgba(245, 158, 11, 0.4); color: #f59e0b; margin-left: 6px;">
                          <span>+ Replay</span>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Search & Filter listeners
    const searchInput = body.querySelector('#admin-player-search');
    const filterSelect = body.querySelector('#admin-player-filter');

    searchInput.addEventListener('input', (e) => {
      this.playerSearch = e.target.value;
      this.renderPlayersTab(body);
    });

    filterSelect.addEventListener('change', (e) => {
      this.playerFilter = e.target.value;
      this.renderPlayersTab(body);
    });

    body.querySelectorAll('.btn-inspect-history').forEach(b => {
      b.addEventListener('click', () => {
        sound.playClick();
        this.attemptEnrollmentFilter = b.getAttribute('data-enrollment');
        this.activeTab = 'attempts';
        this.container.querySelectorAll('.admin-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-tab') === 'attempts');
        });
        this.loadActiveTab();
      });
    });

    body.querySelectorAll('.btn-quick-replay').forEach(b => {
      b.addEventListener('click', () => {
        sound.playClick();
        this.openReplayModal(b.getAttribute('data-enrollment'), b.getAttribute('data-name'));
      });
    });
  }

  // ==========================================================================
  // TAB 3: COMPLETE ATTEMPT HISTORY
  // ==========================================================================
  async renderAttemptsTab(body) {
    this.attempts = await storage.adminGetAttempts(this.attemptEnrollmentFilter || null);

    body.innerHTML = `
      <div class="admin-subview">
        <div class="admin-controls-bar glass-surface" style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: var(--font-mono); font-size: 0.88rem;">
            ${this.attemptEnrollmentFilter ? `
              Showing runs for enrollment: <span class="text-cyan font-bold">${this.escapeHtml(this.attemptEnrollmentFilter)}</span>
              <button class="btn btn-secondary btn-xs" id="btn-clear-attempt-filter" style="margin-left: 8px;">Clear Filter</button>
            ` : 'Complete chronological audit log of all tournament mission attempts.'}
          </div>
          <span class="text-muted" style="font-family: var(--font-mono); font-size: 0.8rem;">Total attempts: ${this.attempts.length}</span>
        </div>

        <div class="admin-table-card glass-surface">
          <div class="table-responsive">
            <table class="leaderboard-table admin-table">
              <thead>
                <tr>
                  <th>Player Name</th>
                  <th>Enrollment</th>
                  <th>Attempt #</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th>Decisions</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${this.attempts.length === 0 ? `
                  <tr><td colspan="10" style="text-align: center; padding: 32px; color: var(--text-muted);">No attempt records available.</td></tr>
                ` : this.attempts.map(a => `
                  <tr>
                    <td style="font-weight: 700; color: #fff;">${this.escapeHtml(a.player_name)}</td>
                    <td class="mono text-cyan">${this.escapeHtml(a.enrollment_number)}</td>
                    <td class="mono text-amber" style="font-weight: 800;">#${a.attempt_number}</td>
                    <td>
                      ${a.is_replay 
                        ? '<span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); color: #c4b5fd;">REPLAY</span>' 
                        : '<span class="text-muted" style="font-size: 0.72rem;">OFFICIAL</span>'}
                    </td>
                    <td class="mono text-green" style="font-weight: 800; font-size: 1.05rem;">${a.final_score}</td>
                    <td class="mono text-cyan">${a.accuracy}%</td>
                    <td class="mono" style="font-size: 0.8rem;">
                      <span class="text-green">${a.correct_decisions}</span> /
                      <span class="text-rose">${(a.incorrect_decisions || 0) + (a.timed_out_decisions || 0)}</span>
                    </td>
                    <td class="mono text-muted">${a.mission_duration_seconds ? `${a.mission_duration_seconds}s` : '—'}</td>
                    <td class="mono text-muted" style="font-size: 0.78rem;">${new Date(a.started_at).toLocaleTimeString()}</td>
                    <td>
                      <span class="status-pill status-${a.status === 'completed' ? 'pass' : (a.status === 'started' ? 'active' : 'rose')}">
                        ${a.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const clearBtn = body.querySelector('#btn-clear-attempt-filter');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        sound.playClick();
        this.attemptEnrollmentFilter = '';
        this.renderAttemptsTab(body);
      });
    }
  }

  // ==========================================================================
  // TAB 4: REPLAY MANAGEMENT INTERFACE
  // ==========================================================================
  async renderReplaysTab(body) {
    this.replays = await storage.adminGetReplays();

    body.innerHTML = `
      <div class="admin-subview">
        <div class="admin-controls-bar glass-surface" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-family: var(--font-display); font-size: 1.1rem; color: #fff; margin-bottom: 4px;">
              Admin-Authorized Replay Controls
            </h3>
            <p style="color: var(--text-muted); font-size: 0.82rem;">
              Authorize a one-time repeat mission for students with verified technical difficulties.
            </p>
          </div>

          <button class="btn btn-primary" id="btn-open-authorize-modal">
            <span>+ Authorize Student Replay</span>
          </button>
        </div>

        <div class="admin-table-card glass-surface">
          <div class="table-responsive">
            <table class="leaderboard-table admin-table">
              <thead>
                <tr>
                  <th>Enrollment</th>
                  <th>Authorized By</th>
                  <th>Reason</th>
                  <th>Created At</th>
                  <th>Status</th>
                  <th>Consumed / Revoked</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${this.replays.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">No replay authorizations recorded.</td></tr>
                ` : this.replays.map(r => `
                  <tr>
                    <td class="mono text-cyan" style="font-weight: 700;">${this.escapeHtml(r.enrollment_number)}</td>
                    <td class="text-main">${this.escapeHtml(r.authorized_by)}</td>
                    <td class="text-muted" style="max-width: 260px; font-size: 0.82rem;">${this.escapeHtml(r.reason)}</td>
                    <td class="mono text-muted" style="font-size: 0.78rem;">${new Date(r.created_at).toLocaleTimeString()}</td>
                    <td>
                      <span class="status-pill status-${r.status === 'consumed' ? 'pass' : (r.status === 'pending' ? 'active' : 'rose')}">
                        ${r.status.toUpperCase()}
                      </span>
                    </td>
                    <td class="mono text-muted" style="font-size: 0.78rem;">
                      ${r.status === 'consumed' && r.consumed_at ? `Consumed at ${new Date(r.consumed_at).toLocaleTimeString()}` : ''}
                      ${r.status === 'revoked' && r.revoked_at ? `Revoked by ${r.revoked_by || 'Admin'}` : ''}
                      ${r.status === 'pending' ? 'Pending Operator Launch' : ''}
                    </td>
                    <td style="text-align: right;">
                      ${r.status === 'pending' ? `
                        <button class="btn btn-secondary btn-xs btn-revoke-replay" data-id="${r.id}" data-enrollment="${r.enrollment_number}" style="border-color: rgba(244, 63, 94, 0.4); color: var(--accent-rose);">
                          <span>Revoke</span>
                        </button>
                      ` : '<span class="text-muted" style="font-size: 0.75rem;">Locked</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    body.querySelector('#btn-open-authorize-modal').addEventListener('click', () => {
      sound.playClick();
      this.openReplayModal();
    });

    body.querySelectorAll('.btn-revoke-replay').forEach(b => {
      b.addEventListener('click', () => {
        sound.playClick();
        const replayId = b.getAttribute('data-id');
        const enrollment = b.getAttribute('data-enrollment');
        this.openRevokeModal(replayId, enrollment);
      });
    });
  }

  // ==========================================================================
  // TAB 5: LEADERBOARD MANAGEMENT
  // ==========================================================================
  async renderLeaderboardTab(body) {
    const { data: scores } = await storage.getLeaderboard(100);

    body.innerHTML = `
      <div class="admin-subview">
        <div class="admin-controls-bar glass-surface" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-family: var(--font-display); font-size: 1.1rem; color: #fff; margin-bottom: 4px;">
              Public Leaderboard Audit (Best Score Policy)
            </h3>
            <p style="color: var(--text-muted); font-size: 0.82rem;">
              Enforces 1 entry per student, tie-breakers (Score &gt; Accuracy &gt; Duration &gt; Timestamp).
            </p>
          </div>
          <span class="text-muted" style="font-family: var(--font-mono); font-size: 0.8rem;">Ranked students: ${scores.length}</span>
        </div>

        <div class="admin-table-card glass-surface">
          <div class="table-responsive">
            <table class="leaderboard-table admin-table">
              <thead>
                <tr>
                  <th style="width: 60px;">Rank</th>
                  <th>Student Name</th>
                  <th>Full Enrollment</th>
                  <th>Masked (Public)</th>
                  <th>Best Score</th>
                  <th>Accuracy</th>
                  <th>Duration</th>
                  <th>Attempts</th>
                </tr>
              </thead>
              <tbody>
                ${scores.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">No official entries recorded on leaderboard.</td></tr>
                ` : scores.map((s, idx) => `
                  <tr>
                    <td><span class="rank-pill ${idx === 0 ? 'gold' : (idx === 1 ? 'silver' : (idx === 2 ? 'bronze' : ''))}">${idx + 1}</span></td>
                    <td style="font-weight: 700; color: #fff;">
                      ${this.escapeHtml(s.student_name)}
                      ${s.is_test ? '<span class="status-standby" style="font-size: 0.65rem; padding: 2px 5px; border-radius: 4px; margin-left: 4px;">TEST</span>' : ''}
                    </td>
                    <td class="mono text-cyan">${this.escapeHtml(s.enrollment_number)}</td>
                    <td class="mono text-muted">${this.escapeHtml(s.enrollment_masked)}</td>
                    <td class="mono text-cyan" style="font-weight: 800; font-size: 1.1rem;">${s.final_score}</td>
                    <td class="mono text-green">${s.accuracy}%</td>
                    <td class="mono text-muted">${s.duration_seconds ? `${s.duration_seconds}s` : '—'}</td>
                    <td class="mono text-amber">${s.attempts_count ?? 1}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 6: ADMIN ACTIVITY LOG (APPEND-ONLY)
  // ==========================================================================
  async renderAuditLogTab(body) {
    this.auditLogs = await storage.adminGetAuditLog();

    body.innerHTML = `
      <div class="admin-subview">
        <div class="admin-controls-bar glass-surface">
          <div style="font-family: var(--font-mono); font-size: 0.88rem;">
            🛡️ <span class="text-cyan font-bold">Append-Only Administrative Audit Trail</span> · Immutable record of all organizer actions.
          </div>
        </div>

        <div class="admin-table-card glass-surface">
          <div class="table-responsive">
            <table class="leaderboard-table admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Administrator</th>
                  <th>Target Student</th>
                  <th>Reason / Details</th>
                </tr>
              </thead>
              <tbody>
                ${this.auditLogs.length === 0 ? `
                  <tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">No administrative actions recorded yet.</td></tr>
                ` : this.auditLogs.map(l => `
                  <tr>
                    <td class="mono text-muted" style="font-size: 0.78rem;">${new Date(l.created_at).toLocaleString()}</td>
                    <td>
                      <span class="status-pill status-${l.action.includes('AUTHORIZED') ? 'pass' : (l.action.includes('REVOKED') ? 'rose' : 'active')}">
                        ${l.action}
                      </span>
                    </td>
                    <td class="text-main" style="font-weight: 700;">${this.escapeHtml(l.admin_identity)}</td>
                    <td class="mono text-cyan">${this.escapeHtml(l.target_enrollment || '—')}</td>
                    <td class="text-muted" style="font-size: 0.82rem;">${this.escapeHtml(l.reason || '—')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // CONFIRMATION MODALS: AUTHORIZE & REVOKE REPLAY
  // ==========================================================================
  openReplayModal(prefilledEnrollment = '', prefilledName = '') {
    const modal = document.createElement('div');
    modal.className = 'admin-modal-backdrop';
    modal.innerHTML = `
      <div class="admin-modal-card glass-surface">
        <h3 class="admin-modal-title">Authorize Student Replay</h3>
        <p class="text-muted" style="font-size: 0.88rem; margin-bottom: 18px;">
          This will grant exactly ONE additional official attempt. The student's public leaderboard rank will follow the Best Score Policy.
        </p>

        <form id="form-auth-replay">
          <div class="reg-form-group" style="text-align: left; margin-bottom: 14px;">
            <label class="reg-label" for="modal-enrollment">
              <span>Target Enrollment Number</span>
              <span class="req-star">*</span>
            </label>
            <div class="input-wrapper">
              <span class="input-icon">${Icons.hash(15)}</span>
              <input 
                type="text" 
                id="modal-enrollment" 
                class="reg-input mono" 
                placeholder="ENTER ENROLLMENT NUMBER" 
                value="${prefilledEnrollment}" 
                required 
                autocapitalize="characters"
              />
            </div>
          </div>

          <div class="reg-form-group" style="text-align: left; margin-bottom: 14px;">
            <label class="reg-label" for="modal-reason">
              <span>Reason for Replay Clearance</span>
              <span class="req-star">*</span>
            </label>
            <div class="input-wrapper">
              <span class="input-icon">📝</span>
              <input 
                type="text" 
                id="modal-reason" 
                class="reg-input" 
                placeholder="e.g. Verified browser crash / Wi-Fi disruption" 
                required 
              />
            </div>
          </div>

          <div class="reg-form-group" style="text-align: left; margin-bottom: 18px;">
            <label class="reg-label" for="modal-admin-name">
              <span>Authorizing Administrator Call-sign</span>
            </label>
            <div class="input-wrapper">
              <span class="input-icon">${Icons.user(15)}</span>
              <input 
                type="text" 
                id="modal-admin-name" 
                class="reg-input" 
                value="${this.currentAdmin}" 
                required 
              />
            </div>
          </div>

          <div id="modal-replay-err" class="reg-error-banner" style="display: none; margin-bottom: 16px;"></div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" id="btn-modal-cancel">
              <span>Cancel</span>
            </button>
            <button type="submit" class="btn btn-primary" id="btn-modal-confirm">
              <span>Confirm Authorization</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-modal-cancel').addEventListener('click', () => {
      sound.playClick();
      modal.remove();
    });

    const form = modal.querySelector('#form-auth-replay');
    const errBox = modal.querySelector('#modal-replay-err');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      sound.playClick();
      errBox.style.display = 'none';

      const enroll = modal.querySelector('#modal-enrollment').value.trim().toUpperCase();
      const reason = modal.querySelector('#modal-reason').value.trim();
      const adminName = modal.querySelector('#modal-admin-name').value.trim() || this.currentAdmin;

      if (!enroll || enroll.length < 4) {
        errBox.textContent = 'Please enter a valid enrollment number.';
        errBox.style.display = 'block';
        return;
      }

      if (!reason) {
        errBox.textContent = 'Reason is required for audit verification.';
        errBox.style.display = 'block';
        return;
      }

      const res = await storage.adminAuthorizeReplay(enroll, reason, adminName);
      if (!res.success) {
        errBox.textContent = res.message || 'Failed to authorize replay.';
        errBox.style.display = 'block';
        return;
      }

      modal.remove();
      this.loadActiveTab();
    });
  }

  openRevokeModal(replayId, enrollment) {
    const modal = document.createElement('div');
    modal.className = 'admin-modal-backdrop';
    modal.innerHTML = `
      <div class="admin-modal-card glass-surface">
        <h3 class="admin-modal-title" style="color: var(--accent-rose);">Revoke Replay Authorization</h3>
        <p class="text-muted" style="font-size: 0.88rem; margin-bottom: 18px;">
          Revoke pending replay clearance for student <span class="text-cyan mono font-bold">${this.escapeHtml(enrollment)}</span>.
        </p>

        <form id="form-revoke-replay">
          <div class="reg-form-group" style="text-align: left; margin-bottom: 18px;">
            <label class="reg-label" for="modal-revoke-reason">
              <span>Revocation Reason</span>
              <span class="req-star">*</span>
            </label>
            <div class="input-wrapper">
              <span class="input-icon">⚠️</span>
              <input 
                type="text" 
                id="modal-revoke-reason" 
                class="reg-input" 
                placeholder="e.g. Authorized by mistake or resolved without replay" 
                required 
              />
            </div>
          </div>

          <div id="modal-revoke-err" class="reg-error-banner" style="display: none; margin-bottom: 16px;"></div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" id="btn-revoke-cancel">
              <span>Cancel</span>
            </button>
            <button type="submit" class="btn btn-primary" style="background: var(--accent-rose); border-color: var(--accent-rose);">
              <span>Revoke Replay</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#btn-revoke-cancel').addEventListener('click', () => {
      sound.playClick();
      modal.remove();
    });

    const form = modal.querySelector('#form-revoke-replay');
    const errBox = modal.querySelector('#modal-revoke-err');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      sound.playClick();
      errBox.style.display = 'none';

      const reason = modal.querySelector('#modal-revoke-reason').value.trim();
      if (!reason) {
        errBox.textContent = 'Revocation reason is required.';
        errBox.style.display = 'block';
        return;
      }

      const res = await storage.adminRevokeReplay(replayId, reason, this.currentAdmin);
      if (!res.success) {
        errBox.textContent = res.message || 'Failed to revoke replay.';
        errBox.style.display = 'block';
        return;
      }

      modal.remove();
      this.loadActiveTab();
    });
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
