/**
 * IncidentCard Component — Premium Tinder-Style SwipeOps Deck
 * 
 * Features:
 * - 3-Layer Physical Card Deck: Active card with two subtly stacked background cards
 * - Real-time continuous drag physics with rotation, tilt, dynamic shadows, and scale
 * - Dynamic parallax lift on background cards during active dragging
 * - Directional visual stamps with custom action titles (👈 ROLL BACK / INSPECT LOGS 👉)
 * - Integrated in-card decision choice tray with real-time drag highlighting
 * - Spring snap-back on incomplete swipes & momentum fling on deliberate swipes
 * - Full multi-input: Touch gestures, mouse drag, keyboard [←]/[→], and tactile click zones
 * - Zero double-firing guarantees & timeout cancellation handling
 */

import { sound } from '../systems/SoundFX.js';
import { Icons } from './icons.js';

export class IncidentCard {
  constructor({ onSelectAction }) {
    this.onSelectAction = onSelectAction;
    this.isLocked = false;
    this.container = null;

    // Card Elements
    this.cardEl = null;
    this.cardDepth1 = null;
    this.cardDepth2 = null;
    this.stampLeftEl = null;
    this.stampRightEl = null;
    this.choiceLeftEl = null;
    this.choiceRightEl = null;
    this.leftBtnEl = null;
    this.rightBtnEl = null;

    // Pointer state
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.isDragging = false;
    this.hasMoved = false;
    this.startTime = 0;
    this.hasPlayedThreshold = false;
    this.activePointerId = null;

    // Drag tuning
    this.threshold = 110; // Drag threshold in px to commit decision

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
  }

  mount(container, incidentData, nextIncidentData = null) {
    this.container = container;
    this.incident = incidentData;
    this.nextIncident = nextIncidentData;
    this.isLocked = false;

    this.render();
    this.attachEvents();
  }

  render() {
    const inc = this.incident;
    const nextInc = this.nextIncident;

    const clueHtml = inc.clue
      ? `
        <div class="deck-clue-badge">
          <span class="clue-icon">${Icons.terminal(14)}</span>
          <span class="clue-text">${this.escapeHtml(inc.clue)}</span>
        </div>
      `
      : '';

    this.container.innerHTML = `
      <div class="swipeops-deck-wrapper">
        <!-- 3-Layer Dating-App Style Card Deck -->
        <div class="tinder-deck-container" id="tinder-deck-container">
          
          <!-- Background Card Depth 2 (Deepest Queue Layer) -->
          <div class="deck-card card-depth-2" id="deck-card-depth-2" aria-hidden="true">
            <div class="depth-card-inner">
              <div class="depth-card-header">
                <span class="depth-card-pill"></span>
                <span class="depth-card-tag">Incident queue</span>
              </div>
              <div class="depth-card-circuit-grid">
                <div class="circuit-line"></div>
                <div class="circuit-line"></div>
                <div class="circuit-line"></div>
              </div>
            </div>
          </div>

          <!-- Background Card Depth 1 (Mid Layer, Shifts Up on Drag) -->
          <div class="deck-card card-depth-1" id="deck-card-depth-1" aria-hidden="true">
            <div class="depth-card-inner">
              <div class="depth-card-header">
                <span class="depth-card-pill"></span>
                <span class="depth-card-tag">Staged incident queue</span>
              </div>
              <div class="depth-card-circuit-grid">
                <div class="circuit-line"></div>
                <div class="circuit-line"></div>
                <div class="circuit-line"></div>
              </div>
              <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-primary); font-weight: 700; letter-spacing: 0.04em;">
                Next incident ready
              </div>
            </div>
          </div>

          <!-- Active Interactive Top Card -->
          <div class="deck-card card-active card-enter glass-surface" id="active-swipe-card" style="touch-action: none;">
            
            <!-- Dynamic Directional Stamps (Scale & Fade with Drag) -->
            <div class="swipe-stamp stamp-left" id="stamp-left">
              <span class="stamp-icon">${Icons.arrowLeft(16)}</span>
              <span class="stamp-label">${this.escapeHtml(inc.leftAction.title.toUpperCase())}</span>
            </div>
            <div class="swipe-stamp stamp-right" id="stamp-right">
              <span class="stamp-label">${this.escapeHtml(inc.rightAction.title.toUpperCase())}</span>
              <span class="stamp-icon">${Icons.arrowRight(16)}</span>
            </div>

            <!-- Card Header: Severity & Category -->
            <div class="deck-card-header">
              <span class="severity-pill severity-${inc.severity.toLowerCase()}">${inc.severity} severity</span>
              <span class="deck-category">${inc.category}</span>
            </div>

            <!-- Incident Subject & Situation -->
            <h2 class="deck-incident-title">${inc.title}</h2>
            <p class="deck-incident-desc">${inc.description}</p>

            ${clueHtml}

            <!-- Integrated In-Card Decision Choices Tray -->
            <div class="deck-decision-tray">
              <div class="deck-choice-card choice-left" id="choice-preview-left">
                <div class="choice-tag"><span class="choice-arrow">${Icons.arrowLeft(12)}</span><span>Swipe left</span></div>
                <div class="choice-title">${inc.leftAction.title}</div>
                <div class="choice-desc">${inc.leftAction.description}</div>
              </div>

              <div class="deck-choice-card choice-right" id="choice-preview-right">
                <div class="choice-tag"><span>Swipe right</span><span class="choice-arrow">${Icons.arrowRight(12)}</span></div>
                <div class="choice-title">${inc.rightAction.title}</div>
                <div class="choice-desc">${inc.rightAction.description}</div>
              </div>
            </div>

            <!-- Drag Prompt Cue at Bottom of Active Card -->
            <div class="deck-swipe-prompt">
              <span class="prompt-arrow"><span class="prompt-icon">${Icons.arrowLeft(12)}</span> Swipe left</span>
              <span class="prompt-center">Drag or flick to decide</span>
              <span class="prompt-arrow">Swipe right <span class="prompt-icon">${Icons.arrowRight(12)}</span></span>
            </div>
          </div>

        </div>

        <!-- Tactile Decision Triggers (Fallback Controls & Keyboard Guide) -->
        <div class="deck-controls-row">
          <button type="button" class="deck-trigger-btn trigger-left" id="deck-btn-left" aria-label="Swipe Left to select ${inc.leftAction.title}">
            <span class="trigger-shortcut">[←]</span>
            <span class="trigger-icon">${Icons.arrowLeft(14)}</span>
            <span class="trigger-title">${inc.leftAction.title}</span>
          </button>

          <div class="deck-swipe-hint-pill">
            <span class="hint-pulse"></span>
            <span>Hold or flick card to swipe</span>
          </div>

          <button type="button" class="deck-trigger-btn trigger-right" id="deck-btn-right" aria-label="Swipe Right to select ${inc.rightAction.title}">
            <span class="trigger-title">${inc.rightAction.title}</span>
            <span class="trigger-icon">${Icons.arrowRight(14)}</span>
            <span class="trigger-shortcut">[→]</span>
          </button>
        </div>
      </div>
    `;

    this.cardEl = this.container.querySelector('#active-swipe-card');
    this.cardDepth1 = this.container.querySelector('#deck-card-depth-1');
    this.cardDepth2 = this.container.querySelector('#deck-card-depth-2');
    this.stampLeftEl = this.container.querySelector('#stamp-left');
    this.stampRightEl = this.container.querySelector('#stamp-right');
    this.choiceLeftEl = this.container.querySelector('#choice-preview-left');
    this.choiceRightEl = this.container.querySelector('#choice-preview-right');
    this.leftBtnEl = this.container.querySelector('#deck-btn-left');
    this.rightBtnEl = this.container.querySelector('#deck-btn-right');
  }

  attachEvents() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('pointermove', this.handlePointerMove);
      window.addEventListener('pointerup', this.handlePointerUp);
      window.addEventListener('pointercancel', this.handlePointerCancel);
    }

    // Fallback click on action triggers
    if (this.leftBtnEl) {
      this.leftBtnEl.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        this.triggerChoice('left');
      });
    }

    if (this.rightBtnEl) {
      this.rightBtnEl.addEventListener('click', (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        this.triggerChoice('right');
      });
    }

    // Pointer events on the card directly
    if (this.cardEl) {
      this.cardEl.addEventListener('pointerdown', this.handlePointerDown);
      this.cardEl.addEventListener('pointermove', this.handlePointerMove);
      this.cardEl.addEventListener('pointerup', this.handlePointerUp);
      this.cardEl.addEventListener('pointercancel', this.handlePointerCancel);
    }
  }

  handleKeyDown(e) {
    if (this.isLocked) return;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      this.triggerChoice('left');
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      this.triggerChoice('right');
    }
  }

  handlePointerDown(e) {
    if (this.isLocked) return;
    if (e.button !== undefined && e.button !== 0) return; // Primary mouse button only

    this.isDragging = true;
    this.hasMoved = false;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentX = e.clientX;
    this.currentY = e.clientY;
    this.startTime = performance.now();
    this.hasPlayedThreshold = false;
    this.activePointerId = e.pointerId;

    if (this.cardEl && this.cardEl.offsetWidth) {
      this.threshold = Math.max(90, Math.min(160, this.cardEl.offsetWidth * 0.22));
    }

    sound.playCardPickup();

    try {
      this.cardEl.setPointerCapture(e.pointerId);
    } catch (_) {}

    // Disable transitions during continuous dragging
    this.cardEl.style.transition = 'none';
    if (this.cardDepth1) this.cardDepth1.style.transition = 'none';
    if (this.cardDepth2) this.cardDepth2.style.transition = 'none';
  }

  handlePointerMove(e) {
    if (!this.isDragging || !this.cardEl || this.isLocked) return;

    this.currentX = e.clientX;
    this.currentY = e.clientY;
    const deltaX = this.currentX - this.startX;
    const deltaY = (this.currentY - this.startY) * 0.15; // subtle natural Y-axis compliance

    if (Math.abs(deltaX) > 4) {
      this.hasMoved = true;
    }

    // Dynamic rotation capped at +/- 15 degrees
    const rotation = Math.max(-16, Math.min(16, (deltaX / this.threshold) * 12));
    const scale = 1.02;

    this.cardEl.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) rotate(${rotation}deg) scale(${scale})`;

    // Dynamic shadow shift with tilt
    const shadowX = -deltaX * 0.12;
    this.cardEl.style.boxShadow = `${shadowX}px 24px 50px rgba(0, 0, 0, 0.75)`;

    // Normalized drag progress (0.0 to 1.0)
    const progress = Math.min(1, Math.max(0, Math.abs(deltaX) / this.threshold));

    // Audio cue when crossing commitment threshold
    if (progress >= 0.95 && !this.hasPlayedThreshold) {
      this.hasPlayedThreshold = true;
      sound.playCardThreshold();
    } else if (progress < 0.7) {
      this.hasPlayedThreshold = false;
    }

    // Parallax response on the 2 background cards
    if (this.cardDepth1) {
      const midY = 14 - progress * 6;
      const midScale = 0.95 + progress * 0.025;
      const midX = -deltaX * 0.03;
      this.cardDepth1.style.transform = `translate3d(${midX}px, ${midY}px, 0) scale(${midScale})`;
      this.cardDepth1.style.opacity = (0.82 + progress * 0.12).toString();
    }

    if (this.cardDepth2) {
      const backY = 26 - progress * 4;
      const backScale = 0.90 + progress * 0.02;
      const backX = -deltaX * 0.015;
      this.cardDepth2.style.transform = `translate3d(${backX}px, ${backY}px, 0) scale(${backScale})`;
      this.cardDepth2.style.opacity = (0.50 + progress * 0.10).toString();
    }

    // Directional feedback on stamps & in-card choices
    if (deltaX < -8) {
      // Swiping LEFT
      if (this.stampLeftEl) {
        this.stampLeftEl.style.opacity = progress.toString();
        this.stampLeftEl.style.transform = `scale(${0.85 + progress * 0.15}) rotate(-12deg)`;
      }
      if (this.stampRightEl) this.stampRightEl.style.opacity = '0';

      this.cardEl.classList.add('dragging-left');
      this.cardEl.classList.remove('dragging-right');

      if (this.choiceLeftEl) {
        this.choiceLeftEl.classList.add('active-highlight');
        this.choiceLeftEl.classList.remove('dimmed');
      }
      if (this.choiceRightEl) {
        this.choiceRightEl.classList.remove('active-highlight');
        this.choiceRightEl.classList.add('dimmed');
      }

      this.leftBtnEl.classList.add('active-highlight');
      this.rightBtnEl.classList.remove('active-highlight');
    } else if (deltaX > 8) {
      // Swiping RIGHT
      if (this.stampRightEl) {
        this.stampRightEl.style.opacity = progress.toString();
        this.stampRightEl.style.transform = `scale(${0.85 + progress * 0.15}) rotate(12deg)`;
      }
      if (this.stampLeftEl) this.stampLeftEl.style.opacity = '0';

      this.cardEl.classList.add('dragging-right');
      this.cardEl.classList.remove('dragging-left');

      if (this.choiceRightEl) {
        this.choiceRightEl.classList.add('active-highlight');
        this.choiceRightEl.classList.remove('dimmed');
      }
      if (this.choiceLeftEl) {
        this.choiceLeftEl.classList.remove('active-highlight');
        this.choiceLeftEl.classList.add('dimmed');
      }

      this.rightBtnEl.classList.add('active-highlight');
      this.leftBtnEl.classList.remove('active-highlight');
    } else {
      // Centered / Minimal movement
      if (this.stampLeftEl) this.stampLeftEl.style.opacity = '0';
      if (this.stampRightEl) this.stampRightEl.style.opacity = '0';
      this.cardEl.classList.remove('dragging-left', 'dragging-right');

      if (this.choiceLeftEl) this.choiceLeftEl.classList.remove('active-highlight', 'dimmed');
      if (this.choiceRightEl) this.choiceRightEl.classList.remove('active-highlight', 'dimmed');

      this.leftBtnEl.classList.remove('active-highlight');
      this.rightBtnEl.classList.remove('active-highlight');
    }
  }

  handlePointerUp(e) {
    if (!this.isDragging || !this.cardEl) return;
    this.isDragging = false;

    const deltaX = this.currentX - this.startX;
    const duration = performance.now() - this.startTime;
    const velocity = Math.abs(deltaX) / (duration || 1); // px per ms

    // Commit condition: exceeded threshold OR quick flick (> 0.42 px/ms with minimal 28px move)
    const isFlick = velocity > 0.42 && Math.abs(deltaX) > 28;
    const isOverThreshold = Math.abs(deltaX) >= this.threshold;

    if (isOverThreshold || isFlick) {
      const side = deltaX < 0 ? 'left' : 'right';
      this.triggerChoice(side);
    } else {
      this.snapBack();
    }
  }

  handlePointerCancel() {
    if (!this.isDragging || !this.cardEl) return;
    this.isDragging = false;
    this.snapBack();
  }

  snapBack() {
    // Spring physics curve
    const springTransition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease-out, border-color 0.2s';
    this.cardEl.style.transition = springTransition;
    this.cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg) scale(1)';
    this.cardEl.style.boxShadow = '';

    // Return background cards to their resting positions
    if (this.cardDepth1) {
      this.cardDepth1.style.transition = 'transform 0.35s ease-out, opacity 0.3s ease-out';
      this.cardDepth1.style.transform = 'translate3d(0, 14px, 0) scale(0.95)';
      this.cardDepth1.style.opacity = '0.82';
    }

    if (this.cardDepth2) {
      this.cardDepth2.style.transition = 'transform 0.35s ease-out, opacity 0.3s ease-out';
      this.cardDepth2.style.transform = 'translate3d(0, 26px, 0) scale(0.90)';
      this.cardDepth2.style.opacity = '0.50';
    }

    if (this.stampLeftEl) this.stampLeftEl.style.opacity = '0';
    if (this.stampRightEl) this.stampRightEl.style.opacity = '0';
    this.cardEl.classList.remove('dragging-left', 'dragging-right');

    if (this.choiceLeftEl) this.choiceLeftEl.classList.remove('active-highlight', 'dimmed');
    if (this.choiceRightEl) this.choiceRightEl.classList.remove('active-highlight', 'dimmed');

    this.leftBtnEl.classList.remove('active-highlight');
    this.rightBtnEl.classList.remove('active-highlight');
  }

  triggerChoice(side) {
    if (this.isLocked) return;
    this.isLocked = true;

    sound.playCardCommit();

    if (this.cardEl) {
      // Rapid momentum fling off-screen
      const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const flingX = side === 'left' ? -windowWidth - 350 : windowWidth + 350;
      const flingRot = side === 'left' ? -28 : 28;

      this.cardEl.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease-out';
      this.cardEl.style.transform = `translate3d(${flingX}px, -40px, 0) rotate(${flingRot}deg) scale(0.92)`;
      this.cardEl.style.opacity = '0';

      // Keep selected stamp prominently visible during fling
      if (side === 'left' && this.stampLeftEl) {
        this.stampLeftEl.style.opacity = '1';
        this.stampLeftEl.classList.add('stamp-committed');
      } else if (side === 'right' && this.stampRightEl) {
        this.stampRightEl.style.opacity = '1';
        this.stampRightEl.classList.add('stamp-committed');
      }
    }

    // Smoothly promote background Card 1 into foreground
    if (this.cardDepth1) {
      this.cardDepth1.style.transition = 'transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.24s ease-out';
      this.cardDepth1.style.transform = 'translate3d(0, 0, 0) scale(1)';
      this.cardDepth1.style.opacity = '0.98';
    }

    // Shift Card 2 into Card 1's resting spot
    if (this.cardDepth2) {
      this.cardDepth2.style.transition = 'transform 0.26s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.24s ease-out';
      this.cardDepth2.style.transform = 'translate3d(0, 14px, 0) scale(0.95)';
      this.cardDepth2.style.opacity = '0.82';
    }

    // Trigger round evaluation once
    this.onSelectAction(side, this.incident);
  }

  lock() {
    this.isLocked = true;
    this.isDragging = false;

    if (this.cardEl) {
      this.cardEl.style.transition = 'transform 0.3s ease-out, opacity 0.25s ease-out';
      this.cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg) scale(0.98)';
      this.cardEl.style.opacity = '0.45';
      this.cardEl.style.cursor = 'not-allowed';
    }

    if (this.leftBtnEl) {
      this.leftBtnEl.disabled = true;
      this.leftBtnEl.style.pointerEvents = 'none';
      this.leftBtnEl.style.opacity = '0.5';
    }
    if (this.rightBtnEl) {
      this.rightBtnEl.disabled = true;
      this.rightBtnEl.style.pointerEvents = 'none';
      this.rightBtnEl.style.opacity = '0.5';
    }
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerup', this.handlePointerUp);
      window.removeEventListener('pointercancel', this.handlePointerCancel);
    }
    if (this.cardEl) {
      this.cardEl.removeEventListener('pointerdown', this.handlePointerDown);
      this.cardEl.removeEventListener('pointermove', this.handlePointerMove);
      this.cardEl.removeEventListener('pointerup', this.handlePointerUp);
      this.cardEl.removeEventListener('pointercancel', this.handlePointerCancel);
    }
  }
}
