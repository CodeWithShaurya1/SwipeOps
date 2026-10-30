/**
 * AccessRestricted Component
 * Dedicated Security Protocol Screen for SwipeOps
 * 
 * Recreates the exact Access Restricted specification:
 * - Dark, nearly black background consistent with SwipeOps
 * - Reduced background animation intensity
 * - Prominent crimson/red security border with subtle glow
 * - Red security badge: "SECURITY PROTOCOL · ONE-RUN POLICY"
 * - Bold futuristic heading: "ACCESS RESTRICTED"
 * - Large lock icon inside a circular red outline
 * - Main message: "You have already played. Please contact the admin."
 * - Supporting message: "Each student is allowed one attempt. Contact the event administrator if you need another attempt."
 * - Three prominent actions:
 *   1. "REGISTER NEW STUDENT"
 *   2. "ENTER ADMIN KEY" (with masked input, rate-limiting, explicit confirmation, and audit logging)
 *   3. "GO BACK"
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { maskEnrollment, normalizeEnrollment } from '../systems/IdentityUtils.js';
import { Icons } from './icons.js';

export class AccessRestricted {
  constructor({ studentData = {}, onRegisterNew, onGoBack, onAttemptReset }) {
    this.student = studentData;
    this.onRegisterNew = onRegisterNew;
    this.onGoBack = onGoBack;
    this.onAttemptReset = onAttemptReset;
    this.container = null;
    this.modalEl = null;

    // Rate limiting tracking for admin key entry
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.verifiedKey = null;
  }

  mount(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="access-restricted-view">
        <div class="access-restricted-card">
          
          <!-- Red Security Badge: SECURITY PROTOCOL // ONE-RUN POLICY -->
          <div class="security-badge-red">
            <span class="security-badge-dot"></span>
            <span>SECURITY PROTOCOL // ONE-RUN POLICY</span>
          </div>

          <!-- Futuristic Heading -->
          <h1 class="access-restricted-title">ACCESS RESTRICTED</h1>

          <!-- Circular Red Lock Outline -->
          <div class="security-lock-circle">
            <span class="security-lock-emoji">🔒</span>
          </div>

          <!-- Main Warning -->
          <p class="access-restricted-msg">
            You have already played. Please contact the admin.
          </p>

          <!-- Supporting Policy Text -->
          <p class="access-restricted-submsg">
            Each student is allowed one attempt. Contact the event administrator if you need another attempt.
          </p>

          <!-- Action Buttons Layout from Reference -->
          <div class="access-restricted-actions-layout">
            <button type="button" class="btn-ref-primary" id="btn-restricted-new-student">
              <span class="btn-icon">⚡</span>
              <span>REGISTER NEW STUDENT</span>
            </button>

            <div class="access-restricted-secondary-row">
              <button type="button" class="btn-ref-admin-key" id="btn-restricted-admin-key">
                <span class="btn-icon">🔑</span>
                <span>ENTER ADMIN KEY</span>
              </button>

              <button type="button" class="btn-ref-go-back" id="btn-restricted-go-back">
                <span class="btn-icon">←</span>
                <span>GO BACK</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Bind event handlers
    const newStudentBtn = this.container.querySelector('#btn-restricted-new-student');
    const adminKeyBtn = this.container.querySelector('#btn-restricted-admin-key');
    const goBackBtn = this.container.querySelector('#btn-restricted-go-back');

    newStudentBtn.addEventListener('click', () => {
      sound.playClick();
      if (typeof this.onRegisterNew === 'function') {
        this.onRegisterNew();
      }
    });

    adminKeyBtn.addEventListener('click', () => {
      sound.playClick();
      this.openAdminKeyModal();
    });

    goBackBtn.addEventListener('click', () => {
      sound.playClick();
      if (typeof this.onGoBack === 'function') {
        this.onGoBack();
      }
    });
  }

  // ==========================================================================
  // ADMIN KEY & ATTEMPT RESET MODAL
  // ==========================================================================

  openAdminKeyModal() {
    this.closeModal();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'admin-key-modal';
    this.modalEl.className = 'admin-key-backdrop';

    this.renderModalStepKey();
    document.body.appendChild(this.modalEl);
  }

  renderModalStepKey() {
    const rawEnrollment = this.student.enrollment_number || this.student.enrollment || '';
    const maskedEnroll = maskEnrollment(rawEnrollment);
    const studentName = this.student.student_name || this.student.name || 'Operator';

    const now = Date.now();
    const isLocked = this.lockoutUntil > now;
    const remainingSeconds = isLocked ? Math.ceil((this.lockoutUntil - now) / 1000) : 0;

    this.modalEl.innerHTML = `
      <div class="admin-key-card glass-surface">
        <div class="admin-key-header">
          <div class="admin-key-icon-wrap">
            ${Icons.key(26)}
          </div>
          <div class="event-badge" style="margin-bottom: 8px;">
            <span class="badge-dot" style="background: var(--color-amber);"></span>
            <span>Administrator Authorization</span>
          </div>
          <h2 class="admin-key-title">Enter Admin Key</h2>
          <p class="admin-key-desc">
            Authorize a secure replay attempt for <strong>${this.escapeHtml(studentName)}</strong> (<span class="mono text-cyan">${this.escapeHtml(maskedEnroll)}</span>).
          </p>
        </div>

        <form id="admin-key-form" novalidate>
          <div class="admin-key-input-group">
            <label class="admin-key-label" for="admin-key-input">
              <span>Administrator Secret Key</span>
              <span class="req-star">*</span>
            </label>
            <div class="input-wrapper admin-key-wrapper">
              <span class="input-icon">${Icons.key(16)}</span>
              <input 
                type="password" 
                id="admin-key-input" 
                class="reg-input mono" 
                placeholder="Enter secret administrator key" 
                required 
                autocomplete="off"
                ${isLocked ? 'disabled' : ''}
              />
              <button type="button" class="btn-toggle-mask" id="btn-toggle-mask" title="Toggle visibility" tabindex="-1">
                ${Icons.eye(16)}
              </button>
            </div>
          </div>

          <div id="admin-key-error" class="reg-error-banner" style="${isLocked ? 'display: block;' : 'display: none;'} margin-bottom: 16px;">
            ${isLocked ? `Too many failed attempts. Key entry locked for ${remainingSeconds}s.` : ''}
          </div>

          <div class="admin-key-actions">
            <button type="button" class="btn btn-secondary" id="btn-admin-cancel">
              <span>Cancel</span>
            </button>
            <button type="submit" class="btn btn-primary" id="btn-admin-verify" ${isLocked ? 'disabled' : ''}>
              <span>Verify Key</span>
              <span class="btn-icon">${Icons.arrowRight(15)}</span>
            </button>
          </div>
        </form>
      </div>
    `;

    const form = this.modalEl.querySelector('#admin-key-form');
    const keyInput = this.modalEl.querySelector('#admin-key-input');
    const toggleBtn = this.modalEl.querySelector('#btn-toggle-mask');
    const cancelBtn = this.modalEl.querySelector('#btn-admin-cancel');
    const verifyBtn = this.modalEl.querySelector('#btn-admin-verify');
    const errBox = this.modalEl.querySelector('#admin-key-error');

    if (!isLocked) {
      setTimeout(() => keyInput && keyInput.focus(), 80);
    }

    // Toggle password mask
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPass = keyInput.type === 'password';
      keyInput.type = isPass ? 'text' : 'password';
      toggleBtn.innerHTML = isPass ? Icons.eyeOff(16) : Icons.eye(16);
    });

    cancelBtn.addEventListener('click', () => {
      sound.playClick();
      this.closeModal();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      sound.playClick();

      if (this.lockoutUntil > Date.now()) {
        const secs = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
        errBox.textContent = `Too many failed attempts. Key entry locked for ${secs}s.`;
        errBox.style.display = 'block';
        return;
      }

      const keyVal = keyInput.value.trim();
      if (!keyVal) {
        errBox.textContent = 'Please enter the administrator authorization key.';
        errBox.style.display = 'block';
        return;
      }

      verifyBtn.disabled = true;
      verifyBtn.innerHTML = `<span>Verifying key...</span>`;
      errBox.style.display = 'none';

      // Verify administrator key via StorageManager (secure server RPC or SHA-256 hash)
      const isKeyValid = await storage.verifyAdminKey(keyVal);

      if (!isKeyValid) {
        this.failedAttempts += 1;
        if (this.failedAttempts >= 5) {
          this.lockoutUntil = Date.now() + 30000; // 30 second lockout
        }

        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `<span>Verify Key</span><span class="btn-icon">${Icons.arrowRight(15)}</span>`;

        // Log failed attempt
        storage._appendAuditLog(
          'ADMIN_KEY_FAILED',
          'SECURITY_FIREWALL',
          rawEnrollment,
          `Failed admin key entry (attempt ${this.failedAttempts}/5)`
        );

        if (this.failedAttempts >= 5) {
          errBox.textContent = 'Too many failed verification attempts. Key entry locked for 30s.';
          keyInput.disabled = true;
          verifyBtn.disabled = true;
        } else {
          errBox.textContent = `Invalid administrator authorization key. Authorization denied (${5 - this.failedAttempts} attempts remaining).`;
        }
        errBox.style.display = 'block';
        return;
      }

      // Valid key: reset failure counter and transition to Explicit Confirmation step
      this.failedAttempts = 0;
      this.verifiedKey = keyVal;
      this.renderModalStepConfirm();
    });
  }

  /**
   * Explicit Confirmation Step
   * Protects against accidental resets and fulfills strict requirement:
   * "Identify the student by normalized enrollment number. Require explicit confirmation."
   */
  renderModalStepConfirm() {
    const rawEnrollment = this.student.enrollment_number || this.student.enrollment || '';
    const cleanEnrollment = normalizeEnrollment(rawEnrollment);
    const maskedEnroll = maskEnrollment(cleanEnrollment);
    const studentName = this.student.student_name || this.student.name || 'Operator';

    this.modalEl.innerHTML = `
      <div class="admin-key-card glass-surface">
        <div class="admin-key-header">
          <div class="admin-key-icon-wrap" style="color: var(--color-emerald); background: rgba(57, 217, 160, 0.12); border-color: rgba(57, 217, 160, 0.4);">
            ${Icons.shield(26)}
          </div>
          <div class="event-badge" style="margin-bottom: 8px; border-color: rgba(57, 217, 160, 0.4); background: rgba(57, 217, 160, 0.12);">
            <span class="badge-dot" style="background: var(--color-emerald); box-shadow: 0 0 8px var(--color-emerald);"></span>
            <span style="color: var(--color-emerald);">Key Verified · Explicit Confirmation</span>
          </div>
          <h2 class="admin-key-title">Confirm Attempt Reset</h2>
          <p class="admin-key-desc">
            Confirming will grant <strong>1 additional official mission attempt</strong> to:
          </p>
        </div>

        <div class="conf-dossier-panel" style="margin-bottom: 20px;">
          <div class="spec-row">
            <span class="spec-key">Student Name</span>
            <span class="spec-val text-main" style="font-weight: 700;">${this.escapeHtml(studentName)}</span>
          </div>
          <div class="spec-row">
            <span class="spec-key">Normalized Enrollment</span>
            <span class="spec-val text-cyan mono" style="font-weight: 700;">${this.escapeHtml(cleanEnrollment)}</span>
          </div>
          <div class="spec-row">
            <span class="spec-key">Action</span>
            <span class="spec-val text-amber mono">AUTHORIZE 1 REPLAY</span>
          </div>
          <div class="spec-row">
            <span class="spec-key">Audit Policy</span>
            <span class="spec-val text-muted mono">Logged to immutable trail</span>
          </div>
        </div>

        <div id="admin-confirm-error" class="reg-error-banner" style="display: none; margin-bottom: 16px;"></div>

        <div class="admin-key-actions">
          <button type="button" class="btn btn-secondary" id="btn-confirm-cancel">
            <span>Cancel</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-confirm-reset" style="background: linear-gradient(135deg, #059669, #10b981); border-color: #34d399;">
            <span>Authorize Attempt</span>
            <span class="btn-icon">${Icons.zap(15)}</span>
          </button>
        </div>
      </div>
    `;

    const cancelBtn = this.modalEl.querySelector('#btn-confirm-cancel');
    const confirmBtn = this.modalEl.querySelector('#btn-confirm-reset');
    const errBox = this.modalEl.querySelector('#admin-confirm-error');

    cancelBtn.addEventListener('click', () => {
      sound.playClick();
      this.closeModal();
    });

    confirmBtn.addEventListener('click', async () => {
      sound.playClick();
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span>Updating records...</span>`;
      errBox.style.display = 'none';

      // Perform authoritative attempt unlock via StorageManager
      const resetRes = await storage.unlockWithAdminKey(cleanEnrollment, this.verifiedKey);

      if (!resetRes.success) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span>Authorize Attempt</span><span class="btn-icon">${Icons.zap(15)}</span>`;
        errBox.textContent = resetRes.message || 'Failed to authorize attempt reset.';
        errBox.style.display = 'block';
        return;
      }

      // Log specific reset action
      storage._appendAuditLog(
        'ATTEMPT_RESET',
        'ADMIN_KEY_OVERRIDE',
        cleanEnrollment,
        `Event administrator authorized additional attempt #${resetRes.attemptNumber} for student ${studentName}`,
        {
          attemptId: resetRes.attemptId,
          attemptNumber: resetRes.attemptNumber
        }
      );

      this.renderModalStepSuccess(resetRes, studentName, cleanEnrollment);
    });
  }

  /**
   * Success Clearance Step
   */
  renderModalStepSuccess(clearance, studentName, cleanEnrollment) {
    this.modalEl.innerHTML = `
      <div class="admin-key-card glass-surface" style="text-align: center;">
        <div class="admin-key-icon-wrap" style="color: var(--color-emerald); background: rgba(57, 217, 160, 0.15); border-color: rgba(57, 217, 160, 0.5); margin: 0 auto 16px;">
          ${Icons.check(32)}
        </div>

        <div class="event-badge" style="margin-bottom: 12px; border-color: rgba(57, 217, 160, 0.4); background: rgba(57, 217, 160, 0.12);">
          <span class="badge-dot" style="background: var(--color-emerald); box-shadow: 0 0 8px var(--color-emerald);"></span>
          <span style="color: var(--color-emerald);">ATTEMPT UNLOCKED</span>
        </div>

        <h2 class="admin-key-title" style="margin-bottom: 8px;">Clearance Granted</h2>
        <p class="admin-key-desc" style="margin-bottom: 24px;">
          Student <strong>${this.escapeHtml(studentName)}</strong> is now authorized for mission attempt #${clearance.attemptNumber || 2}.
        </p>

        <div class="admin-key-actions" style="justify-content: center;">
          <button type="button" class="btn btn-primary" id="btn-success-launch" style="width: 100%; justify-content: center;">
            <span>LAUNCH MISSION NOW</span>
            <span class="btn-icon">${Icons.rocket(16)}</span>
          </button>
        </div>
      </div>
    `;

    this.modalEl.querySelector('#btn-success-launch').addEventListener('click', () => {
      sound.playClick();
      this.closeModal();
      if (typeof this.onAttemptReset === 'function') {
        this.onAttemptReset({
          name: clearance.studentName || studentName,
          enrollment: cleanEnrollment,
          attemptId: clearance.attemptId,
          attemptNumber: clearance.attemptNumber,
          isReplay: true
        });
      }
    });
  }

  closeModal() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
    this.modalEl = null;
  }

  destroy() {
    this.closeModal();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
