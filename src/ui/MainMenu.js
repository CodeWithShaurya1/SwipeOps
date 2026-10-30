/**
 * MainMenu Component
 * Human-designed editorial landing screen with a continuous software delivery pipeline,
 * refined typography, and purposeful interactive controls.
 */

import { sound } from '../systems/SoundFX.js';
import { Icons } from './icons.js';

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
        <!-- Event Top Identifier -->
        <div class="event-badge">
          <span class="badge-dot"></span>
          <span>Club Battle · TechVerse · DevOps Club</span>
        </div>

        <!-- Editorial Hero Title & Clear Narrative Hierarchy -->
        <div class="hero-header-block">
          <h1 class="hero-title"><span class="brand-swipe">SWIPE</span><span class="brand-ops highlight-cyan">OPS</span></h1>
          <p class="hero-subtitle">The Production Rescue Mission</p>
          <p class="hero-tagline">
            Three critical incidents. 45 seconds. Can you keep the cluster online?
          </p>
        </div>

        <!-- Continuous Organic CI/CD Delivery Pipeline -->
        <div class="live-pipeline-rail pipeline-container">
          <div class="rail-header">
            <div class="rail-meta">
              <span class="rail-tag">Delivery workflow</span>
              <span class="rail-sub">Cluster rollout · Runner 04</span>
            </div>
            <div class="rail-live-status">
              <span class="status-indicator-dot"></span>
              <span class="status-indicator-label">Pipeline Active</span>
            </div>
          </div>

          <!-- Continuous Flow Track with Organic Nodes -->
          <div class="continuous-pipeline-flow">
            <!-- Stage 1: Source -->
            <div class="flow-stage stage-ready">
              <div class="flow-stage-head">
                <div class="flow-icon-bubble">${Icons.gitBranch(16)}</div>
                <div class="flow-stage-info">
                  <span class="flow-stage-name">Source</span>
                  <span class="flow-stage-status status-ready">Ready</span>
                </div>
              </div>
            </div>

            <!-- Inter-stage Connector Track -->
            <div class="flow-connector connector-active">
              <div class="flow-packet"></div>
            </div>

            <!-- Stage 2: Build -->
            <div class="flow-stage stage-pass">
              <div class="flow-stage-head">
                <div class="flow-icon-bubble">${Icons.cpu(16)}</div>
                <div class="flow-stage-info">
                  <span class="flow-stage-name">Build</span>
                  <span class="flow-stage-status status-pass">Pass</span>
                </div>
              </div>
            </div>

            <div class="flow-connector connector-active">
              <div class="flow-packet"></div>
            </div>

            <!-- Stage 3: Test -->
            <div class="flow-stage stage-pass">
              <div class="flow-stage-head">
                <div class="flow-icon-bubble">${Icons.flask(16)}</div>
                <div class="flow-stage-info">
                  <span class="flow-stage-name">Tests</span>
                  <span class="flow-stage-status status-pass">Pass</span>
                </div>
              </div>
            </div>

            <div class="flow-connector connector-idle"></div>

            <!-- Stage 4: Deploy -->
            <div class="flow-stage stage-standby">
              <div class="flow-stage-head">
                <div class="flow-icon-bubble">${Icons.rocket(16)}</div>
                <div class="flow-stage-info">
                  <span class="flow-stage-name">Deploy</span>
                  <span class="flow-stage-status status-standby">Standby</span>
                </div>
              </div>
            </div>

            <div class="flow-connector connector-idle"></div>

            <!-- Stage 5: Monitor -->
            <div class="flow-stage stage-pass">
              <div class="flow-stage-head">
                <div class="flow-icon-bubble">${Icons.activity(16)}</div>
                <div class="flow-stage-info">
                  <span class="flow-stage-name">Monitor</span>
                  <span class="flow-stage-status status-pass">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Primary Action Callout -->
        <div class="hero-actions">
          <button class="btn-primary-action start-btn" id="btn-start-mission">
            <span class="btn-primary-icon">${Icons.zap(18)}</span>
            <span class="btn-primary-text">START MISSION</span>
            <span class="btn-primary-arrow">${Icons.arrowRight(16)}</span>
          </button>
        </div>

        <!-- Cohesive Secondary Controls Bar -->
        <div class="hero-subactions">
          <button class="btn btn-secondary" id="btn-how-to-play">
            <span class="btn-icon">${Icons.bookOpen(15)}</span>
            <span>How to play</span>
          </button>
          <button class="btn btn-secondary" id="btn-leaderboard">
            <span class="btn-icon">${Icons.trophy(15)}</span>
            <span>Leaderboard</span>
          </button>
          <button class="btn btn-secondary audio-toggle-btn" id="btn-toggle-audio" title="Toggle Sound FX">
            <span class="btn-icon" id="audio-icon">${isSoundOn ? Icons.volume2(15) : Icons.volumeX(15)}</span>
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
      container.querySelector('#audio-icon').innerHTML = active ? Icons.volume2(15) : Icons.volumeX(15);
      container.querySelector('#audio-label').textContent = active ? 'Sound on' : 'Muted';
    });
  }
}
