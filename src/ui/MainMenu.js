/**
 * MainMenu Component
 * Human-designed editorial landing screen with a continuous software delivery pipeline,
 * refined typography, and purposeful interactive controls.
 */

import { sound } from '../systems/SoundFX.js';
import { Icons } from './icons.js';

export class MainMenu {
  constructor({ onStartMission, onHowToPlay, onLeaderboard, onOpenAdmin }) {
    this.onStartMission = onStartMission;
    this.onHowToPlay = onHowToPlay;
    this.onLeaderboard = onLeaderboard;
    this.onOpenAdmin = onOpenAdmin;
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
            Three production outages. 45 seconds on the clock. Triage alerts and keep the cluster alive.
          </p>
        </div>

        <!-- Real-Time Delivery Pipeline Visualisation -->
        <div class="live-pipeline-rail pipeline-container">
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

            <div class="flow-connector connector-active">
              <div class="flow-packet"></div>
            </div>

            <!-- Stage 5: Monitor -->
            <div class="flow-stage stage-active">
              <div class="flow-stage-head">
                <div class="flow-icon-bubble">${Icons.activity(16)}</div>
                <div class="flow-stage-info">
                  <span class="flow-stage-name">Monitor</span>
                  <span class="flow-stage-status status-active">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Primary Action Callout: Interactive Swipe Slider -->
        <div class="hero-actions">
          <div class="swipe-slider-container">
            <div 
              class="swipe-slider-track" 
              id="swipe-slider-track" 
              role="slider" 
              tabindex="0" 
              aria-label="Swipe to start mission"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="0"
            >
              <div class="swipe-slider-progress" id="swipe-slider-progress"></div>
              <div class="swipe-slider-label" id="swipe-slider-label">
                <span class="swipe-slider-text">SWIPE TO START MISSION</span>
                <span class="swipe-slider-chevrons">
                  <span class="chevron c1">❯</span>
                  <span class="chevron c2">❯</span>
                  <span class="chevron c3">❯</span>
                </span>
              </div>
              <div class="swipe-slider-thumb" id="swipe-slider-thumb">
                <span class="thumb-icon">${Icons.zap(20)}</span>
              </div>
            </div>
            <button id="btn-start-mission" class="sr-only" aria-hidden="true" tabindex="-1"></button>
          </div>
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
          <button class="btn btn-secondary admin-portal-btn" id="btn-admin-portal" title="Restricted Event Organizer Console" style="border-color: rgba(139, 92, 246, 0.4); color: #c4b5fd;">
            <span class="btn-icon">⚡</span>
            <span>Admin</span>
          </button>
        </div>
      </div>
    `;

    // Initialize Swipe Slider physics & interactions
    this.setupSwipeSlider(container);

    // Fallback trigger if #btn-start-mission is clicked
    const hiddenStartBtn = container.querySelector('#btn-start-mission');
    if (hiddenStartBtn) {
      hiddenStartBtn.addEventListener('click', () => {
        sound.playClick();
        this.onStartMission();
      });
    }

    container.querySelector('#btn-how-to-play').addEventListener('click', () => {
      sound.playClick();
      this.onHowToPlay();
    });

    container.querySelector('#btn-leaderboard').addEventListener('click', () => {
      sound.playClick();
      this.onLeaderboard();
    });

    const adminBtn = container.querySelector('#btn-admin-portal');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        sound.playClick();
        if (typeof this.onOpenAdmin === 'function') {
          this.onOpenAdmin();
        }
      });
    }

    const audioBtn = container.querySelector('#btn-toggle-audio');
    audioBtn.addEventListener('click', () => {
      const active = sound.toggle();
      container.querySelector('#audio-icon').innerHTML = active ? Icons.volume2(15) : Icons.volumeX(15);
      container.querySelector('#audio-label').textContent = active ? 'Sound on' : 'Muted';
    });
  }

  setupSwipeSlider(container) {
    const track = container.querySelector('#swipe-slider-track');
    const thumb = container.querySelector('#swipe-slider-thumb');
    const progress = container.querySelector('#swipe-slider-progress');
    const label = container.querySelector('#swipe-slider-label');
    const labelText = container.querySelector('.swipe-slider-text');
    const chevrons = container.querySelector('.swipe-slider-chevrons');

    if (!track || !thumb) return;

    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxDist = 0;
    let isCompleted = false;
    let wasDragged = false;

    const calcMaxDist = () => {
      const trackWidth = track.clientWidth || 340;
      const thumbWidth = thumb.clientWidth || 48;
      return Math.max(1, trackWidth - thumbWidth - 10);
    };

    const updatePosition = (x, animated = false) => {
      if (animated) {
        thumb.style.transition = 'transform 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        progress.style.transition = 'width 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        label.style.transition = 'opacity 0.2s ease';
      } else {
        thumb.style.transition = 'none';
        progress.style.transition = 'none';
        label.style.transition = 'none';
      }

      thumb.style.transform = `translateX(${x}px)`;
      progress.style.width = `${x + 28}px`;

      const dist = maxDist > 0 ? maxDist : 280;
      const pct = Math.max(0, Math.min(1, x / dist));
      track.setAttribute('aria-valuenow', Math.round(pct * 100));
      label.style.opacity = `${Math.max(0, 1 - pct * 1.5)}`;
    };

    const triggerComplete = () => {
      if (isCompleted) return;
      isCompleted = true;
      maxDist = calcMaxDist();
      updatePosition(maxDist, true);

      track.classList.add('completed');
      if (labelText) {
        labelText.textContent = 'MISSION INITIATED ⚡';
        labelText.classList.add('initiated');
      }
      if (chevrons) chevrons.style.display = 'none';

      sound.playClick();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([30, 50, 30]); } catch (_) {}
      }

      setTimeout(() => {
        this.onStartMission();
      }, 240);
    };

    const onPointerDown = (e) => {
      if (isCompleted) return;
      isDragging = true;
      wasDragged = false;
      startX = e.clientX;
      maxDist = calcMaxDist();
      currentX = 0;
      thumb.classList.add('is-dragging');
      track.classList.add('is-interacting');
      try {
        thumb.setPointerCapture(e.pointerId);
      } catch (_) {}
    };

    const onPointerMove = (e) => {
      if (!isDragging || isCompleted) return;
      const dx = e.clientX - startX;
      maxDist = calcMaxDist();
      currentX = Math.max(0, Math.min(dx, maxDist));
      if (currentX > 8) {
        wasDragged = true;
      }
      updatePosition(currentX, false);

      if (currentX >= maxDist * 0.82) {
        isDragging = false;
        thumb.classList.remove('is-dragging');
        track.classList.remove('is-interacting');
        triggerComplete();
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging || isCompleted) return;
      isDragging = false;
      thumb.classList.remove('is-dragging');
      track.classList.remove('is-interacting');
      try {
        thumb.releasePointerCapture(e.pointerId);
      } catch (_) {}

      maxDist = calcMaxDist();
      if (currentX >= maxDist * 0.75) {
        triggerComplete();
      } else {
        currentX = 0;
        updatePosition(0, true);
        setTimeout(() => {
          if (!isCompleted) {
            thumb.style.transition = '';
            progress.style.transition = '';
            label.style.transition = '';
            label.style.opacity = '1';
          }
        }, 280);
      }
    };

    thumb.addEventListener('pointerdown', onPointerDown);
    thumb.addEventListener('pointermove', onPointerMove);
    thumb.addEventListener('pointerup', onPointerUp);
    thumb.addEventListener('pointercancel', onPointerUp);

    track.addEventListener('click', (e) => {
      if (isCompleted || wasDragged) return;
      triggerComplete();
    });

    track.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        triggerComplete();
      }
    });
  }
}
