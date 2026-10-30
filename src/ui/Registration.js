/**
 * Registration Component
 * Sophisticated, human-designed operator onboarding experience:
 * - Left pane: Mission briefing and cluster readiness telemetry
 * - Right pane: Refined dark glassmorphic card with clean inputs and instant validation
 * - Clear confirmation screen with session credentials before countdown
 */

import { sound } from '../systems/SoundFX.js';
import { storage } from '../systems/StorageManager.js';
import { Icons } from './icons.js';

export class Registration {
  constructor({ onReadyToLaunch, onBackToMenu }) {
    this.onReadyToLaunch = onReadyToLaunch;
    this.onBackToMenu = onBackToMenu;
    this.playerData = null;
  }

  async render(container) {
    const conn = await storage.testCloudConnection();

    container.innerHTML = `
      <div class="registration-view">
        <div class="reg-split-container">
          
          <!-- Left Column: Mission Briefing & Infrastructure Telemetry -->
          <div class="reg-briefing-pane">
            <div class="event-badge">
              <span class="badge-dot"></span>
              <span>Operator onboarding · TechVerse</span>
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
                  <span class="spec-key">Scoring engine</span>
                  <span class="spec-val text-green">100 pts + 50 streak bonus</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Registration Card & Credential Verification -->
          <div class="reg-card-pane">
            <div class="reg-card glass-surface">
              <div class="reg-header">
                <div class="reg-card-tag">Operator credentials</div>
                <h2 class="reg-card-title">Enter the Arena</h2>
                <p class="reg-card-subtitle">
                  Authenticate your callsign for the TechVerse leaderboard.
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
                    <span>Callsign / Full name</span>
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

      const name = nameInput.value.trim();
      const enrollment = enrollInput.value.trim().toUpperCase();

      if (!name || name.length < 2) {
        errBox.textContent = 'Please enter a valid callsign or name (minimum 2 characters).';
        errBox.style.display = 'block';
        return;
      }

      if (!enrollment || enrollment.length < 4) {
        errBox.textContent = 'Please enter a valid enrollment number.';
        errBox.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Verifying cluster access...</span>`;

      // Check official one-attempt eligibility rule
      const check = await storage.checkEnrollmentEligibility(enrollment);

      if (!check.eligible) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Verify &amp; enter</span><span class="btn-icon">${Icons.arrowRight(15)}</span>`;
        errBox.textContent = check.message;
        errBox.style.display = 'block';
        return;
      }

      this.playerData = { name, enrollment };
      this.renderConfirmation(container);
    });
  }

  renderConfirmation(container) {
    container.innerHTML = `
      <div class="registration-view">
        <div class="reg-card confirmation-card glass-surface">
          <div class="conf-badge-icon">${Icons.shield(28)}</div>
          <div class="event-badge" style="margin-bottom: 12px;">
            <span class="badge-dot"></span>
            <span>Credentials verified · Ready for duty</span>
          </div>

          <h2 class="reg-hero-title" style="font-size: 2rem; margin-bottom: 8px;">Operator cleared</h2>
          <p class="text-muted" style="margin-bottom: 24px;">
            Your cluster session is provisioned. The mission clock begins immediately upon launch.
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
          </div>

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

    container.querySelector('#btn-conf-launch').addEventListener('click', () => {
      sound.playClick();
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
