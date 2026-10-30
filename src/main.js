/**
 * SWIPEOPS — Main Application Entry Point
 * Event: Club Battle: TechVerse | Organizing Club: DevOps Club
 * Manages screen routing, session state, one-attempt enforcement,
 * refresh resilience, and administrative access.
 */

import './styles/main.css';
import { MainMenu } from './ui/MainMenu.js';
import { Registration } from './ui/Registration.js';
import { MissionScreen } from './ui/MissionScreen.js';
import { GameOver } from './ui/GameOver.js';
import { Leaderboard } from './ui/Leaderboard.js';
import { AdminDashboard } from './ui/AdminDashboard.js';
import { HowToPlayModal } from './ui/HowToPlayModal.js';
import { AccessRestricted } from './ui/AccessRestricted.js';

import { IncidentEngine } from './systems/IncidentEngine.js';
import { ScoringEngine } from './systems/ScoringEngine.js';
import { ProductionState } from './systems/ProductionState.js';
import { MissionTimer } from './systems/MissionTimer.js';
import { devopsBg } from './systems/DevOpsBackground.js';
import { storage } from './systems/StorageManager.js';

const ACTIVE_MISSION_SESSION_KEY = 'swipeops_active_mission';

class GameApp {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.activeScreen = null;
    this.playerData = null;

    // Active mission subsystem instances
    this.incidentEngine = null;
    this.scoringEngine = null;
    this.productionState = null;
    this.missionTimer = null;
  }

  init() {
    // Mount living animated DevOps background canvas
    devopsBg.mount();

    // Attach unload listener: closing/refreshing during active mission consumes attempt immediately
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.activeScreen instanceof MissionScreen && this.playerData && this.playerData.attemptId) {
          const stats = this.scoringEngine ? this.scoringEngine.getStats() : { score: 0, accuracy: 0, correct: 0, incorrect: 0, timeout: 0, maxStreak: 0 };
          const duration = this.missionTimer ? this.missionTimer.getMissionElapsed() : 45;
          storage.completeAttempt(this.playerData.attemptId, {
            enrollment: this.playerData.enrollment,
            finalScore: stats.score,
            accuracy: stats.accuracy,
            correct: stats.correct,
            incorrect: stats.incorrect,
            timeout: stats.timeout,
            maxStreak: stats.maxStreak,
            missionDuration: duration
          });
        }
      });
    }

    // Check if an attempt was interrupted by a browser refresh
    const savedSession = this.getSavedActiveSession();
    if (savedSession && savedSession.playerData && savedSession.playerData.enrollment) {
      const studentEnroll = savedSession.playerData.enrollment;

      // Mark the interrupted attempt as consumed so refreshing cannot restore a fresh attempt
      if (savedSession.playerData.attemptId) {
        storage.completeAttempt(savedSession.playerData.attemptId, {
          enrollment: studentEnroll,
          finalScore: 0,
          accuracy: 0,
          correct: 0,
          incorrect: 0,
          timeout: 3,
          maxStreak: 0,
          missionDuration: 45
        }).catch(() => {});
      }
      this.clearActiveSession();

      // Check authoritative record and immediately route to Access Restricted if already played
      storage.checkStudentStatus(studentEnroll).then((check) => {
        if (!check.eligible && check.status === 'ALREADY_PLAYED') {
          this.showAccessRestricted(check.student || savedSession.playerData);
        } else {
          this.showMainMenu();
        }
      }).catch(() => {
        this.showMainMenu();
      });
      return;
    }

    this.showMainMenu();
  }

  getSavedActiveSession() {
    try {
      const data = sessionStorage.getItem(ACTIVE_MISSION_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (_) {
      return null;
    }
  }

  saveActiveSession() {
    try {
      if (this.playerData && this.playerData.attemptId) {
        sessionStorage.setItem(ACTIVE_MISSION_SESSION_KEY, JSON.stringify({
          playerData: this.playerData,
          startedAt: Date.now()
        }));
      }
    } catch (_) {}
  }

  clearActiveSession() {
    try {
      sessionStorage.removeItem(ACTIVE_MISSION_SESSION_KEY);
    } catch (_) {}
  }

  showMainMenu() {
    this.teardownActive();
    devopsBg.setScreenMode('menu');
    const menu = new MainMenu({
      onStartMission: () => this.showRegistration(),
      onHowToPlay: () => HowToPlayModal.show(),
      onLeaderboard: () => this.showLeaderboard(),
      onOpenAdmin: () => this.showAdminDashboard()
    });
    menu.render(this.appContainer);
    this.activeScreen = menu;
  }

  showRegistration() {
    this.teardownActive();
    devopsBg.setScreenMode('registration');
    const registration = new Registration({
      onReadyToLaunch: (playerData) => {
        this.playerData = playerData;
        this.startMission();
      },
      onBackToMenu: () => this.showMainMenu(),
      onViewLeaderboard: () => this.showLeaderboard(),
      onAccessRestricted: (studentData) => this.showAccessRestricted(studentData)
    });
    registration.render(this.appContainer);
    this.activeScreen = registration;
  }

  showAccessRestricted(studentData) {
    this.teardownActive();
    devopsBg.setScreenMode('restricted');
    const accessRestricted = new AccessRestricted({
      studentData,
      onRegisterNew: () => this.showRegistration(),
      onGoBack: () => this.showMainMenu(),
      onAttemptReset: (clearance) => {
        this.playerData = clearance;
        this.startMission();
      }
    });
    accessRestricted.mount(this.appContainer);
    this.activeScreen = accessRestricted;
  }

  startMission(isResumed = false) {
    if (!this.playerData || !this.playerData.enrollment || !this.playerData.attemptId) {
      this.showRegistration();
      return;
    }

    this.teardownActive();
    devopsBg.setScreenMode('gameplay');

    // Save active attempt to session storage to guard against accidental browser refresh
    this.saveActiveSession();

    // Instantiate fresh systems for this mission session
    this.incidentEngine = new IncidentEngine();
    this.incidentEngine.prepareMission();

    this.scoringEngine = new ScoringEngine();
    this.productionState = new ProductionState();

    this.missionTimer = new MissionTimer({
      totalDuration: 45, // 45 seconds total mission limit
      roundDuration: 15  // 15 seconds per round (3 rounds total)
    });

    // Start 45-second global mission ceiling
    this.missionTimer.startMission();

    const missionScreen = new MissionScreen({
      playerData: this.playerData,
      incidentEngine: this.incidentEngine,
      scoringEngine: this.scoringEngine,
      productionState: this.productionState,
      missionTimer: this.missionTimer,
      onMissionComplete: () => this.showGameOver()
    });

    missionScreen.mount(this.appContainer);
    this.activeScreen = missionScreen;
  }

  showGameOver() {
    // Clear active mission session so returning student cannot replay without clearance
    this.clearActiveSession();

    const scoringStats = this.scoringEngine.getStats();
    const healthMetrics = this.productionState.getMetrics();
    const missionDuration = this.missionTimer.getMissionElapsed();

    this.teardownActive();
    devopsBg.setScreenMode('gameover');

    const gameOver = new GameOver({
      playerData: this.playerData,
      scoringStats,
      healthMetrics,
      missionDuration,
      onViewLeaderboard: () => this.showLeaderboard(),
      onNextPlayer: () => {
        this.playerData = null;
        this.showRegistration();
      },
      onReturnToMenu: () => {
        this.playerData = null;
        this.showMainMenu();
      }
    });

    gameOver.mount(this.appContainer);
    this.activeScreen = gameOver;
  }

  showLeaderboard() {
    this.teardownActive();
    devopsBg.setScreenMode('leaderboard');
    const leaderboard = new Leaderboard({
      onBackToMenu: () => this.showMainMenu(),
      onStartMission: () => this.showRegistration(),
      onOpenAdmin: () => this.showAdminDashboard()
    });
    leaderboard.mount(this.appContainer);
    this.activeScreen = leaderboard;
  }

  showAdminDashboard() {
    this.teardownActive();
    devopsBg.setScreenMode('menu');
    const admin = new AdminDashboard({
      onClose: () => this.showMainMenu()
    });
    admin.mount(this.appContainer);
    this.activeScreen = admin;
  }

  teardownActive() {
    if (this.missionTimer) {
      this.missionTimer.stopAll();
    }
    if (this.activeScreen && typeof this.activeScreen.destroy === 'function') {
      this.activeScreen.destroy();
    }
    this.activeScreen = null;
  }
}

// Enforce all text inputs across the entire application in capital letters
document.addEventListener('input', (e) => {
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.type !== 'file' && target.type !== 'checkbox' && target.type !== 'radio') {
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const oldVal = target.value;
    const newVal = oldVal.toUpperCase();
    if (oldVal !== newVal) {
      target.value = newVal;
      if (start !== null && end !== null) {
        try {
          target.setSelectionRange(start, end);
        } catch (_) {}
      }
    }
  }
}, true);

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.init();
});

