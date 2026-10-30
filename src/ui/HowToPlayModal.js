/**
 * HowToPlayModal
 * Explains mechanics, controls, scoring, and production consequences.
 */

import { sound } from '../systems/SoundFX.js';

export class HowToPlayModal {
  static show() {
    const existing = document.getElementById('how-to-play-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'how-to-play-modal';
    backdrop.className = 'modal-backdrop';

    backdrop.innerHTML = `
      <div class="modal-dialog glass-surface">
        <h3 class="modal-title">Mission briefing · How to play</h3>

        <div class="rule-block">
          <h4>🎮 Swipe controls</h4>
          <p>Each production incident presents <strong>two</strong> possible engineering decisions:</p>
          <ul style="margin: 8px 0 8px 20px; font-size: 0.88rem; color: #CBD5E1;">
            <li><strong>Keyboard:</strong> Press <code>[←] Left Arrow</code> or <code>[→] Right Arrow</code></li>
            <li><strong>Mouse:</strong> Click the Left or Right decision card</li>
            <li><strong>Touch/Trackpad:</strong> Swipe the card Left or Right</li>
          </ul>
        </div>

        <div class="rule-block">
          <h4>⏱️ 3-round mission format · 45s max</h4>
          <p>
            You face exactly <strong>3 production incidents</strong> (15 seconds per round).
            The global mission limit is <strong>45 seconds</strong>. Answer quickly and accurately!
          </p>
        </div>

        <div class="rule-block">
          <h4>🎯 Scoring and streak bonuses</h4>
          <p>
            • <strong>Correct decision:</strong> +100 Points<br/>
            • <strong>Incorrect / Timeout:</strong> 0 Points (resets streak)<br/>
            • <strong>Perfect streak bonus:</strong> Get all 3 correct for a <strong>+50 Bonus</strong> (350 Points max!)
          </p>
        </div>

        <div class="rule-block">
          <h4>🛡️ Production environment health</h4>
          <p>
            Keep all 4 system vitals alive: <strong>Service Availability</strong>, <strong>Data Integrity</strong>, 
            <strong>Security Posture</strong>, and <strong>Deployment Stability</strong>.
            Dangerous commands (like deleting databases or bypassing CI checks) penalize your infrastructure.
          </p>
        </div>

        <div style="text-align: right; margin-top: 24px;">
          <button class="btn btn-primary" id="btn-close-briefing">
            Understood, proceed
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => {
      sound.playClick();
      backdrop.remove();
    };

    backdrop.querySelector('#btn-close-briefing').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }
}
