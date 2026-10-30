/**
 * MainMenu Component
 * Upgraded hero landing screen with living interactive deployment pipeline visualization,
 * bold modern typography, and high-energy call-to-action controls.
 */

import { sound } from '../systems/SoundFX.js';

export class MainMenu {
  constructor({ onStartMission, onHowToPlay, onLeaderboard }) {
    this.onStartMission = onStartMission;
    this.onHowToPlay = onHowToPlay;
    this.onLeaderboard = onLeaderboard;
  }

  render(container) {
    const isSoundOn = sound.isEnabled();

    container.innerHTML = `
      <div class="hero-screen">
        <!-- Event Top Badge -->
        <div class="event-badge">
          <span class="pulse-dot"></span>
          <span>Club Battle · TechVerse · DevOps Club</span>
        </div>

        <!-- Hero Title & Tagline -->
        <h1 class="hero-title">DEVOPS ARENA</h1>
        <h2 class="hero-subtitle">The Production Rescue Mission</h2>
        <p class="hero-tagline">
          React fast. Think smart. Save production.<br/>
          3 critical incidents. 45 seconds. Can you keep the cluster online?
        </p>

        <!-- Integrated CI/CD Pipeline Rail (Floating Frosted Glass Dashboard) -->
        <div class="live-pipeline-rail pipeline-container glass-surface">
          <div class="rail-header">
            <span class="rail-title">Live deployment pipeline · Runner 04</span>
            <span class="rail-live-tag"><span class="status-dot status-dot-pass blink-dot"></span> Streaming</span>
          </div>

          <div class="pipeline-stages-grid">
            <div class="pipe-node active-pass node-ready">
              <div class="pipe-icon">📦</div>
              <div class="pipe-name">Source</div>
              <div class="pipe-status status-ready"><span class="status-dot status-dot-ready"></span> Ready</div>
            </div>
            <div class="pipe-track active">
              <div class="packet-runner"></div>
            </div>

            <div class="pipe-node active-pass node-pass">
              <div class="pipe-icon">⚙️</div>
              <div class="pipe-name">Build</div>
              <div class="pipe-status status-pass"><span class="status-dot status-dot-pass"></span> Pass</div>
            </div>
            <div class="pipe-track active">
              <div class="packet-runner"></div>
            </div>

            <div class="pipe-node active-pass node-pass">
              <div class="pipe-icon">🧪</div>
              <div class="pipe-name">Tests</div>
              <div class="pipe-status status-pass"><span class="status-dot status-dot-pass"></span> Pass</div>
            </div>
            <div class="pipe-track standby"></div>

            <div class="pipe-node active-standby node-standby">
              <div class="pipe-icon">🚀</div>
              <div class="pipe-name">Deploy</div>
              <div class="pipe-status status-standby standby-text"><span class="status-dot status-dot-standby"></span> Standby</div>
            </div>
            <div class="pipe-track standby"></div>

            <div class="pipe-node active-pass node-active">
              <div class="pipe-icon">📡</div>
              <div class="pipe-name">Monitor</div>
              <div class="pipe-status status-pass"><span class="status-dot status-dot-pass"></span> Active</div>
            </div>
          </div>
        </div>

        <!-- Supercharged Hero Call To Action -->
        <div class="hero-actions">
          <button class="btn btn-hero-start start-btn" id="btn-start-mission">
            <span class="hero-btn-glow"></span>
            <span class="hero-btn-icon">⚡</span>
            <span class="hero-btn-label">START MISSION</span>
            <span class="hero-btn-arrow">→</span>
          </button>
        </div>

        <!-- Secondary Actions & Sound Toggle -->
        <div class="hero-subactions">
          <button class="btn btn-secondary" id="btn-how-to-play">
            <span>📖</span>
            <span>How to Play</span>
          </button>
          <button class="btn btn-secondary" id="btn-leaderboard">
            <span>🏆</span>
            <span>Leaderboard</span>
          </button>
          <button class="audio-toggle-btn" id="btn-toggle-audio" title="Toggle Sound FX">
            <span id="audio-icon">${isSoundOn ? '🔊' : '🔇'}</span>
            <span id="audio-label">${isSoundOn ? 'Sound on' : 'Muted'}</span>
          </button>
        </div>
      </div>
    `;

    // Attach event listeners
    container.querySelector('#btn-start-mission').addEventListener('click', () => {
      sound.playClick();
      this.onStartMission();
    });

    container.querySelector('#btn-how-to-play').addEventListener('click', () => {
      sound.playClick();
      this.onHowToPlay();
    });

    container.querySelector('#btn-leaderboard').addEventListener('click', () => {
      sound.playClick();
      this.onLeaderboard();
    });

    const audioBtn = container.querySelector('#btn-toggle-audio');
    audioBtn.addEventListener('click', () => {
      const active = sound.toggle();
      container.querySelector('#audio-icon').textContent = active ? '🔊' : '🔇';
      container.querySelector('#audio-label').textContent = active ? 'Sound on' : 'Muted';
    });
  }
}
