/**
 * Registration Component
 * Sophisticated, human-designed operator onboarding experience:
 * - Left pane: Mission briefing and cluster readiness telemetry
 * - Right pane: Refined dark glassmorphic card with clean inputs and instant validation
 * - Clear confirmation screen with session credentials before countdown
 * - Official One-Attempt Enforcement & "YOU HAVE ALREADY PLAYED!" modal view
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { normalizeName, normalizeEnrollment } from '../systems/IdentityUtils.js';
import { MissionLockedModal } from './MissionLockedModal.js';
import { Icons } from './icons.js';

export class Registration {
  constructor({ onReadyToLaunch, onBackToMenu, onViewLeaderboard, onAccessRestricted }) {
    this.onReadyToLaunch = onReadyToLaunch;
    this.onBackToMenu = onBackToMenu;
    this.onViewLeaderboard = onViewLeaderboard;
    this.onAccessRestricted = onAccessRestricted;
    this.playerData = null;
    this.container = null;
  }

  async render(container) {
    this.container = container;
    const conn = await storage.testCloudConnection();

    container.innerHTML = `
      <div class="registration-view">
        <div class="reg-split-container">
          
          <!-- Left Column: Mission Briefing & Infrastructure Telemetry -->
          <div class="reg-briefing-pane">
            <div class="event-badge">
              <span class="badge-dot"></span>
              <span>Operator onboarding · TechVerse · DevOps Club</span>
            </div>

            <h1 class="reg-hero-title">Ready to save production?</h1>
            <p class="reg-hero-desc">
              Three critical production outages will test your cluster instincts.
              Every decision impacts system availability, data integrity, and pipeline stability.
            </p>

            <div class="reg-telemetry-widget glass-surface">
              <div class="widget-header">
                <span class="widget-tag">Infrastructure readiness</span>
                <span class="widget-status"><span class="status-dot status-dot-pass"></span> Cluster armed</span>
              </div>
              <div class="widget-specs">
                <div class="spec-row">
                  <span class="spec-key">Primary gateway</span>
                  <span class="spec-val text-cyan">ingress-01 · TLS 1.3</span>
                </div>
                <div class="spec-row">
                  <span class="spec-key">Mission format</span>
                  <span class="spec-val text-violet">3 incidents · 45 seconds</span>
                </div>
                <div class="spec-row">
                  <span class="spec-key">Tournament rule</span>
                  <span class="spec-val text-amber">1 Official Attempt per Student</span>
                </div>
                <div class="spec-row">
                  <span class="spec-key">Scoring engine</span>
                  <span class="spec-val text-green">100 pts + 50 streak bonus (Max 350)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Registration Card & Credential Verification -->
          <div class="reg-card-pane">
            <div class="reg-card glass-surface">
              <div class="reg-header">
                <div class="reg-card-tag">Operator credentials</div>
                <h2 class="reg-card-title">Register for SwipeOps</h2>
                <p class="reg-card-subtitle">
                  Authenticate your enrollment identifier for the TechVerse leaderboard.
                </p>
              </div>

              <!-- Connection Status Pill -->
              <div class="reg-status-badge ${conn.mode}">
                <span class="status-dot ${conn.isConnected ? 'status-dot-pass' : 'status-dot-standby'}"></span>
                <span class="status-text">${conn.message}</span>
              </div>

              <form id="reg-form" novalidate>
                <div class="reg-form-group">
                  <label class="reg-label" for="reg-name">
                    <span>Full name</span>
                    <span class="req-star">*</span>
                  </label>
                  <div class="input-wrapper">
                    <span class="input-icon">${Icons.user(16)}</span>
                    <input 
                      type="text" 
                      id="reg-name" 
                      class="reg-input" 
                      placeholder="ENTER YOUR FULL NAME" 
                      required 
                      autocomplete="off" 
                    />
                  </div>
                </div>

                <div class="reg-form-group">
                  <label class="reg-label" for="reg-enrollment">
                    <span>Enrollment number</span>
                    <span class="req-star">*</span>
                  </label>
                  <div class="input-wrapper">
                    <span class="input-icon">${Icons.hash(16)}</span>
                    <input 
                      type="text" 
                      id="reg-enrollment" 
                      class="reg-input mono" 
                      placeholder="ENTER YOUR ENROLLMENT NUMBER" 
                      required 
                      autocomplete="off" 
                      autocapitalize="characters"
                    />
                  </div>
                </div>

                <div id="reg-error" class="reg-error-banner" style="display: none;"></div>

                <div class="reg-actions-row">
                  <button type="button" class="btn btn-secondary" id="btn-reg-back">
                    <span class="btn-icon">${Icons.arrowLeft(15)}</span>
                    <span>Back</span>
                  </button>
                  <button type="submit" class="btn btn-primary" id="btn-reg-submit">
                    <span>Verify &amp; enter</span>
                    <span class="btn-icon">${Icons.arrowRight(15)}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    `;

    const form = container.querySelector('#reg-form');
    const nameInput = container.querySelector('#reg-name');
    const enrollInput = container.querySelector('#reg-enrollment');
    const errBox = container.querySelector('#reg-error');
    const submitBtn = container.querySelector('#btn-reg-submit');

    nameInput.focus();

    container.querySelector('#btn-reg-back').addEventListener('click', () => {
      sound.playClick();
      this.onBackToMenu();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      sound.playClick();
      errBox.style.display = 'none';

      const name = normalizeName(nameInput.value);
      const enrollment = normalizeEnrollment(enrollInput.value);

      if (!name || name.length < 2) {
        errBox.textContent = 'Please enter a valid full name (minimum 2 characters).';
        errBox.style.display = 'block';
        return;
      }

      if (!enrollment || enrollment.length < 4) {
        errBox.textContent = 'Please enter a valid enrollment number (minimum 4 characters).';
        errBox.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Verifying official eligibility...</span>`;

      // Check official one-attempt eligibility rule
      const check = await storage.checkStudentStatus(enrollment);

      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Verify &amp; enter</span><span class="btn-icon">${Icons.arrowRight(15)}</span>`;

      if (!check.eligible && check.status === 'ALREADY_PLAYED') {
        const studentInfo = check.student || {
          enrollment_number: enrollment,
          student_name: name,
          best_score: check.bestScore || 0
        };
        if (typeof this.onAccessRestricted === 'function') {
          this.onAccessRestricted(studentInfo);
        } else {
          this.renderAlreadyPlayed(container, studentInfo);
        }
        return;
      }

      if (!check.eligible) {
        errBox.textContent = check.message || 'Enrollment is not eligible for entry.';
        errBox.style.display = 'block';
        return;
      }

      // If existing student registered with a previous name, use registered student name
      const studentName = (check.student && check.student.student_name) ? check.student.student_name : name;

      this.playerData = {
        name: studentName,
        enrollment,
        isReplay: check.status === 'REPLAY_AUTHORIZED',
        resumed: check.status === 'ACTIVE_ATTEMPT'
      };

      this.renderConfirmation(container);
    });
  }

  /**
   * Dedicated Blocking View: YOU HAVE ALREADY PLAYED!
   */
  renderAlreadyPlayed(container, student) {
    container.innerHTML = `
      <div class="registration-view">
        <div class="reg-card glass-surface already-played-card" style="max-width: 560px; margin: 40px auto; text-align: center; border-color: rgba(244, 63, 94, 0.4);">
          <div class="already-played-icon" style="display: inline-flex; width: 64px; height: 64px; border-radius: 50%; background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.4); align-items: center; justify-content: center; color: var(--accent-rose); margin-bottom: 16px;">
            ${Icons.shield(32)}
          </div>

          <div class="event-badge" style="margin-bottom: 12px; background: rgba(244, 63, 94, 0.15); border-color: rgba(244, 63, 94, 0.3);">
            <span class="badge-dot" style="background: var(--accent-rose); box-shadow: 0 0 8px var(--accent-rose);"></span>
            <span style="color: var(--accent-rose);">Single official attempt policy</span>
          </div>

          <h2 class="reg-hero-title" style="font-size: 2.2rem; color: #fff; margin-bottom: 12px; letter-spacing: 0.05em;">
            YOU HAVE ALREADY PLAYED!
          </h2>

          <p class="already-played-desc" style="color: var(--text-muted); font-size: 1rem; line-height: 1.6; margin-bottom: 24px;">
            "Your official attempt has already been recorded. Please contact the event administrator if you require another attempt."
          </p>

          <div class="conf-dossier-panel" style="margin-bottom: 24px; text-align: left;">
            <div class="spec-row">
              <span class="spec-key">Registered Student</span>
              <span class="spec-val text-cyan">${this.escapeHtml(student.student_name || 'Operator')}</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">Enrollment Number</span>
              <span class="spec-val mono">${this.escapeHtml(student.enrollment_number)}</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">Recorded Best Score</span>
              <span class="spec-val text-green mono" style="font-weight: 800;">${student.best_score ?? 0} pts</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">Attempts Used</span>
              <span class="spec-val text-amber mono">${student.attempts_count ?? 1}</span>
            </div>
          </div>

          <div class="reg-actions-row" style="justify-content: center; gap: 14px;">
            <button class="btn btn-secondary" id="btn-played-menu">
              <span class="btn-icon">${Icons.arrowLeft(15)}</span>
              <span>Return to Menu</span>
            </button>
            <button class="btn btn-primary" id="btn-played-lb">
              <span class="btn-icon">${Icons.trophy(15)}</span>
              <span>Public Leaderboard</span>
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-played-menu').addEventListener('click', () => {
      sound.playClick();
      this.onBackToMenu();
    });

    container.querySelector('#btn-played-lb').addEventListener('click', () => {
      sound.playClick();
      if (typeof this.onViewLeaderboard === 'function') {
        this.onViewLeaderboard();
      } else {
        this.onBackToMenu();
      }
    });
  }

  renderConfirmation(container) {
    const isReplay = this.playerData.isReplay;
    const isResumed = this.playerData.resumed;

    let badgeText = 'Credentials verified · Ready for duty';
    if (isReplay) badgeText = '⚡ Admin Replay Authorized';
    if (isResumed) badgeText = '⚠️ Active Attempt Resumed';

    container.innerHTML = `
      <div class="registration-view">
        <div class="reg-card confirmation-card glass-surface">
          <div class="conf-badge-icon">${Icons.shield(28)}</div>
          <div class="event-badge" style="margin-bottom: 12px; ${isReplay ? 'border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.12);' : ''}">
            <span class="badge-dot" style="${isReplay ? 'background: #f59e0b; box-shadow: 0 0 8px #f59e0b;' : ''}"></span>
            <span style="${isReplay ? 'color: #f59e0b;' : ''}">${badgeText}</span>
          </div>

          <h2 class="reg-hero-title" style="font-size: 2rem; margin-bottom: 8px;">
            ${isReplay ? 'Replay Clearance Granted' : 'Operator cleared'}
          </h2>
          <p class="text-muted" style="margin-bottom: 24px;">
            ${isReplay 
              ? 'Administrator has approved this replay attempt. Best Score Policy applies.' 
              : 'Your cluster session is provisioned. The mission clock begins immediately upon launch.'}
          </p>

          <div class="conf-dossier-panel">
            <div class="spec-row">
              <span class="spec-key">On-call operator</span>
              <span class="spec-val text-cyan">${this.escapeHtml(this.playerData.name)}</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">Enrollment number</span>
              <span class="spec-val mono">${this.escapeHtml(this.playerData.enrollment)}</span>
            </div>
            <div class="spec-row">
              <span class="spec-key">Mission window</span>
              <span class="spec-val text-green">3 rounds · 15s each (45s total)</span>
            </div>
            ${isReplay ? `
              <div class="spec-row">
                <span class="spec-key">Authorization</span>
                <span class="spec-val text-amber">Admin Authorized Replay</span>
              </div>
            ` : ''}
          </div>

          <div id="launch-error-banner" class="reg-error-banner" style="display: none; margin-bottom: 16px;"></div>

          <div class="reg-actions-row">
            <button class="btn btn-secondary" id="btn-conf-back">
              <span>Edit details</span>
            </button>
            <button class="btn btn-primary btn-launch-primary" id="btn-conf-launch">
              <span>Launch rescue mission</span>
              <span class="btn-icon">${Icons.rocket(16)}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-conf-back').addEventListener('click', () => {
      sound.playClick();
      this.render(container);
    });

    const launchBtn = container.querySelector('#btn-conf-launch');
    const launchErr = container.querySelector('#launch-error-banner');

    launchBtn.addEventListener('click', async () => {
      sound.playClick();
      launchBtn.disabled = true;
      launchBtn.innerHTML = `<span>Reserving cluster attempt...</span>`;
      launchErr.style.display = 'none';

      // Atomically reserve attempt in database / local store
      const attemptRes = await storage.startAttempt(this.playerData.name, this.playerData.enrollment);

      if (!attemptRes.success || !attemptRes.allowed) {
        launchBtn.disabled = false;
        launchBtn.innerHTML = `<span>Launch rescue mission</span><span class="btn-icon">${Icons.rocket(16)}</span>`;

        if (attemptRes.error === 'ALREADY_PLAYED') {
          const studentInfo = {
            student_name: attemptRes.studentName || this.playerData.name,
            enrollment_number: this.playerData.enrollment,
            best_score: attemptRes.bestScore || 0,
            attempts_count: attemptRes.attemptsUsed || 1
          };
          if (typeof this.onAccessRestricted === 'function') {
            this.onAccessRestricted(studentInfo);
          } else {
            this.renderAlreadyPlayed(container, studentInfo);
          }
          return;
        }

        launchErr.textContent = attemptRes.message || 'Unable to reserve mission attempt.';
        launchErr.style.display = 'block';
        return;
      }

      // Proceed with active attempt ID
      this.playerData.attemptId = attemptRes.attemptId;
      this.playerData.attemptNumber = attemptRes.attemptNumber;
      this.playerData.isReplay = attemptRes.isReplay;

      this.onReadyToLaunch(this.playerData);
    });
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
