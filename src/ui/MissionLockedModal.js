/**
 * MissionLockedModal Component
 * Polished, high-security modal displayed when a previously played student
 * returns or tries to bypass the one-attempt restriction:
 * 
 * Content:
 * MISSION LOCKED
 * Your mission has already been completed.
 * This enrollment number has used its permitted attempt.
 * To request another attempt, contact the event administrator.
 * 
 * Admin Authorization Key
 * [ Enter administrator key ]
 * [ UNLOCK MISSION ]
 * [ RETURN TO HOME ]
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { maskEnrollment } from '../systems/IdentityUtils.js';
import { Icons } from './icons.js';

export class MissionLockedModal {
  constructor({ student, onUnlocked, onReturnHome }) {
    this.student = student;
    this.onUnlocked = onUnlocked;
    this.onReturnHome = onReturnHome;
    this.modalEl = null;
  }

  show() {
    // Remove any existing locked modal before mounting
    const existing = document.getElementById('mission-locked-modal');
    if (existing) existing.remove();

    this.modalEl = document.createElement('div');
    this.modalEl.id = 'mission-locked-modal';
    this.modalEl.className = 'locked-modal-backdrop';

    const maskedEnroll = maskEnrollment(this.student.enrollment_number);
    const studentName = this.student.student_name || 'Operator';
    const bestScore = this.student.best_score ?? 0;

    this.modalEl.innerHTML = `
      <div class="locked-modal-card glass-surface">
        
        <!-- Status Indicator Pill -->
        <div class="locked-status-pill">
          <span class="locked-status-dot"></span>
          <span>ATTEMPT RECORDED · ACCESS RESTRICTED</span>
        </div>

        <!-- Lock Badge Icon -->
        <div class="locked-icon-badge">
          ${Icons.lock(28)}
        </div>

        <!-- Headings -->
        <h2 class="locked-modal-title">MISSION LOCKED</h2>
        <p class="locked-modal-sub">
          Your mission has already been completed.<br/>
          This enrollment number has used its permitted attempt.
        </p>
        <p class="locked-modal-help">
          To request another attempt, contact the event administrator.
        </p>

        <!-- Student Verification Dossier -->
        <div class="locked-student-dossier">
          <div class="dossier-item">
            <span class="dossier-label">Operator:</span>
            <span class="dossier-value text-main">${this.escapeHtml(studentName)}</span>
          </div>
          <div class="dossier-item">
            <span class="dossier-label">Enrollment:</span>
            <span class="dossier-value text-cyan mono">${this.escapeHtml(maskedEnroll)}</span>
          </div>
          <div class="dossier-item">
            <span class="dossier-label">Best Score:</span>
            <span class="dossier-value text-green mono" style="font-weight: 800;">${bestScore} pts</span>
          </div>
        </div>

        <!-- Admin Authorization Unlock Form -->
        <form id="locked-unlock-form" novalidate>
          <div class="locked-input-group">
            <label class="locked-input-label" for="admin-auth-key-input">
              <span>Admin Authorization Key</span>
            </label>
            <div class="input-wrapper">
              <span class="input-icon">🔑</span>
              <input 
                type="password" 
                id="admin-auth-key-input" 
                class="reg-input mono" 
                placeholder="Enter administrator key" 
                required 
                autocomplete="off"
              />
            </div>
          </div>

          <div id="locked-error-msg" class="reg-error-banner" style="display: none; margin-bottom: 16px;"></div>

          <div class="locked-actions-row">
            <button type="submit" class="btn btn-primary btn-unlock-action" id="btn-unlock-mission">
              <span>UNLOCK MISSION</span>
              <span class="btn-icon">⚡</span>
            </button>
            <button type="button" class="btn btn-secondary" id="btn-return-home">
              <span class="btn-icon">${Icons.arrowLeft(14)}</span>
              <span>RETURN TO HOME</span>
            </button>
          </div>
        </form>

      </div>
    `;

    document.body.appendChild(this.modalEl);

    const form = this.modalEl.querySelector('#locked-unlock-form');
    const keyInput = this.modalEl.querySelector('#admin-auth-key-input');
    const errBox = this.modalEl.querySelector('#locked-error-msg');
    const unlockBtn = this.modalEl.querySelector('#btn-unlock-mission');
    const homeBtn = this.modalEl.querySelector('#btn-return-home');

    keyInput.focus();

    homeBtn.addEventListener('click', () => {
      sound.playClick();
      this.close();
      if (typeof this.onReturnHome === 'function') {
        this.onReturnHome();
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      sound.playClick();
      errBox.style.display = 'none';

      const enteredKey = keyInput.value.trim();
      if (!enteredKey) {
        errBox.textContent = 'Please enter an administrator authorization key.';
        errBox.style.display = 'block';
        return;
      }

      unlockBtn.disabled = true;
      unlockBtn.innerHTML = `<span>VERIFYING CLEARANCE...</span>`;

      // Secure backend / storage validation of the admin key
      const unlockRes = await storage.unlockWithAdminKey(
        this.student.enrollment_number,
        enteredKey
      );

      unlockBtn.disabled = false;
      unlockBtn.innerHTML = `<span>UNLOCK MISSION</span><span class="btn-icon">⚡</span>`;

      if (!unlockRes.success) {
        errBox.textContent = unlockRes.message || 'Invalid administrator key. Authorization denied.';
        errBox.style.display = 'block';
        return;
      }

      // Success: Replay cleared
      this.close();
      if (typeof this.onUnlocked === 'function') {
        this.onUnlocked({
          enrollment: this.student.enrollment_number,
          name: unlockRes.studentName || this.student.student_name,
          attemptId: unlockRes.attemptId,
          attemptNumber: unlockRes.attemptNumber,
          isReplay: true
        });
      }
    });
  }

  close() {
    if (this.modalEl && this.modalEl.parentNode) {
      this.modalEl.parentNode.removeChild(this.modalEl);
    }
    this.modalEl = null;
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
