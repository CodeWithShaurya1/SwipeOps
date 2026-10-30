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

                <div class="admin-replay-cta-box">
                  <div class="admin-replay-cta-header">
                    <span class="btn-icon">${Icons.key(15)}</span>
                    <span>Admin Key Re-access</span>
                  </div>
                  <p class="admin-replay-cta-desc">
                    Already played and need a re-attempt? Authorized event admins can grant 1 replay attempt.
                  </p>
                  <button type="button" class="btn btn-admin-replay" id="btn-reg-admin-replay">
                    <span class="btn-icon">${Icons.key(14)}</span>
                    <span>Enter Admin Key to Play Again</span>
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
    const footerAdminBtn = container.querySelector('#btn-reg-admin-replay');

    nameInput.addEventListener('input', () => {
      nameInput.value = nameInput.value.toUpperCase();
    });
    enrollInput.addEventListener('input', () => {
      enrollInput.value = enrollInput.value.toUpperCase();
    });

    nameInput.focus();

    container.querySelector('#btn-reg-back').addEventListener('click', () => {
      sound.playClick();
      this.onBackToMenu();
    });

    if (footerAdminBtn) {
      footerAdminBtn.addEventListener('click', () => {
        sound.playClick();
        const enroll = normalizeEnrollment(enrollInput.value) || '';
        const name = normalizeName(nameInput.value) || 'OPERATOR';
        this.openAdminReplayModal({ enrollment_number: enroll, student_name: name });
      });
    }

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
          return;
        }

        // Fallback error banner
        errBox.innerHTML = `
          <div class="reg-error-msg-text">
            Enrollment <strong>${this.escapeHtml(enrollment)}</strong> already recorded a score (${studentInfo.best_score ?? 0} pts).
          </div>
          <div class="reg-error-subtext">
            Single official attempt policy active. Contact event admin to play again.
          </div>
          <button type="button" class="btn-error-action" id="btn-err-admin-key">
            <span class="btn-icon">${Icons.key(14)}</span>
            <span>ENTER ADMIN KEY TO PLAY AGAIN</span>
          </button>
        `;
        errBox.style.display = 'block';

        const unlockBtn = errBox.querySelector('#btn-err-admin-key');
        if (unlockBtn) {
          unlockBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            sound.playClick();
            this.openAdminReplayModal(studentInfo);
          });
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

          <div class="reg-actions-row" style="justify-content: center; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary" id="btn-played-unlock" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #0284c7, #38bdf8); border-color: #38bdf8; font-weight: 800;">
              <span class="btn-icon">${Icons.key(15)}</span>
              <span>Enter Admin Key to Play Again</span>
            </button>
            <div style="display: flex; gap: 10px; width: 100%;">
              <button class="btn btn-secondary" id="btn-played-menu" style="flex: 1; justify-content: center;">
                <span class="btn-icon">${Icons.arrowLeft(15)}</span>
                <span>Return to Menu</span>
              </button>
              <button class="btn btn-secondary" id="btn-played-lb" style="flex: 1; justify-content: center;">
                <span class="btn-icon">${Icons.trophy(15)}</span>
                <span>Leaderboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-played-unlock').addEventListener('click', () => {
      sound.playClick();
      this.openAdminReplayModal(student);
    });

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

  /**
   * Dedicated Replay Popup: Enter Admin Key to Play Again Once
   */
  openAdminReplayModal(studentInfo = {}) {
    const existing = document.getElementById('admin-replay-modal');
    if (existing) existing.remove();

    const rawEnrollment = studentInfo.enrollment_number || studentInfo.enrollment || '';
    const studentName = studentInfo.student_name || studentInfo.name || 'Operator';
    const maskedEnroll = rawEnrollment ? maskEnrollment(rawEnrollment) : 'Required';

    const modal = document.createElement('div');
    modal.id = 'admin-replay-modal';
    modal.className = 'replay-popup-backdrop';

    modal.innerHTML = `
      <div class="replay-popup-card glass-surface">
        <div class="admin-key-header">
          <div class="admin-key-icon-wrap" style="color: var(--color-amber); background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4);">
            ${Icons.key(28)}
          </div>
          <div class="event-badge" style="margin-bottom: 8px;">
            <span class="badge-dot" style="background: var(--color-amber);"></span>
            <span>Admin Authorization</span>
          </div>
          <h2 class="admin-key-title">Play Again Authorization</h2>
          <p class="admin-key-desc">
            Enter administrator key to grant <strong>1 replay attempt</strong> for:<br/>
            <strong>${this.escapeHtml(studentName)}</strong> · <span class="mono text-cyan">${this.escapeHtml(maskedEnroll)}</span>
          </p>
        </div>

        <form id="replay-unlock-form" novalidate>
          <div class="admin-key-input-group">
            <label class="admin-key-label" for="replay-key-input">
              <span>Administrator Key</span>
              <span class="req-star">*</span>
            </label>
            <div class="input-wrapper admin-key-wrapper">
              <span class="input-icon">${Icons.key(16)}</span>
              <input 
                type="password" 
                id="replay-key-input" 
                class="reg-input mono" 
                placeholder="Enter admin key" 
                required 
                autocomplete="off"
              />
              <button type="button" class="btn-toggle-mask" id="btn-replay-toggle-mask" title="Toggle visibility" tabindex="-1">
                ${Icons.eye(16)}
              </button>
            </div>
          </div>

          <div id="replay-modal-error" class="reg-error-banner" style="display: none; margin-bottom: 16px;"></div>

          <div class="admin-key-actions">
            <button type="button" class="btn btn-secondary" id="btn-replay-cancel">
              <span>Cancel</span>
            </button>
            <button type="submit" class="btn btn-primary" id="btn-replay-verify" style="background: linear-gradient(135deg, #0284c7, #38bdf8); border-color: #38bdf8;">
              <span>Unlock &amp; Play Again</span>
              <span class="btn-icon">${Icons.zap(15)}</span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector('#replay-unlock-form');
    const keyInput = modal.querySelector('#replay-key-input');
    const toggleBtn = modal.querySelector('#btn-replay-toggle-mask');
    const cancelBtn = modal.querySelector('#btn-replay-cancel');
    const verifyBtn = modal.querySelector('#btn-replay-verify');
    const errBox = modal.querySelector('#replay-modal-error');

    setTimeout(() => keyInput && keyInput.focus(), 60);

    toggleBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const isPass = keyInput.type === 'password';
      keyInput.type = isPass ? 'text' : 'password';
      toggleBtn.innerHTML = isPass ? Icons.eyeOff(16) : Icons.eye(16);
    });

    cancelBtn.addEventListener('click', () => {
      sound.playClick();
      modal.remove();
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      sound.playClick();
      errBox.style.display = 'none';

      const keyVal = keyInput.value.trim();
      if (!keyVal) {
        errBox.textContent = 'Please enter the administrator key.';
        errBox.style.display = 'block';
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<span>Verifying clearance...</span>`;

      // Determine enrollment
      let targetEnroll = rawEnrollment;
      if (!targetEnroll) {
        const enrollField = this.container ? this.container.querySelector('#reg-enrollment') : null;
        targetEnroll = enrollField ? normalizeEnrollment(enrollField.value) : '';
      }

      if (!targetEnroll) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `<span>Unlock &amp; Play Again</span><span class="btn-icon">${Icons.zap(15)}</span>`;
        errBox.textContent = 'Please enter an enrollment number on the registration card first.';
        errBox.style.display = 'block';
        return;
      }

      const res = await storage.unlockWithAdminKey(targetEnroll, keyVal);

      verifyBtn.disabled = false;
      verifyBtn.innerHTML = `<span>Unlock &amp; Play Again</span><span class="btn-icon">${Icons.zap(15)}</span>`;

      if (!res.success) {
        errBox.textContent = res.message || 'Invalid administrator key. Authorization denied.';
        errBox.style.display = 'block';
        return;
      }

      // Success: Render Step 2 (Clearance Granted & Play Again Button)
      modal.innerHTML = `
        <div class="replay-popup-card glass-surface" style="text-align: center;">
          <div class="admin-key-icon-wrap" style="color: var(--color-emerald); background: rgba(57, 217, 160, 0.15); border-color: rgba(57, 217, 160, 0.5); margin: 0 auto 16px;">
            ${Icons.check(32)}
          </div>

          <div class="event-badge" style="margin-bottom: 12px; border-color: rgba(57, 217, 160, 0.4); background: rgba(57, 217, 160, 0.12);">
            <span class="badge-dot" style="background: var(--color-emerald); box-shadow: 0 0 8px var(--color-emerald);"></span>
            <span style="color: var(--color-emerald);">1 REPLAY ATTEMPT AUTHORIZED</span>
          </div>

          <h2 class="admin-key-title" style="margin-bottom: 8px;">Replay Clearance Granted!</h2>
          <p class="admin-key-desc" style="margin-bottom: 24px;">
            Student <strong>${this.escapeHtml(res.studentName || studentName)}</strong> (<span class="mono text-cyan">${this.escapeHtml(targetEnroll)}</span>) can now play again once.
          </p>

          <div class="admin-key-actions" style="justify-content: center;">
            <button type="button" class="btn btn-primary" id="btn-replay-launch-now" style="width: 100%; justify-content: center; background: linear-gradient(135deg, #059669, #10b981); border-color: #34d399; font-weight: 800; padding: 14px 20px;">
              <span>PLAY AGAIN NOW</span>
              <span class="btn-icon">${Icons.rocket(16)}</span>
            </button>
          </div>
        </div>
      `;

      modal.querySelector('#btn-replay-launch-now').addEventListener('click', () => {
        sound.playClick();
        modal.remove();
        this.playerData = {
          name: res.studentName || studentName,
          enrollment: targetEnroll,
          attemptId: res.attemptId,
          attemptNumber: res.attemptNumber,
          isReplay: true
        };
        this.onReadyToLaunch(this.playerData);
      });
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
