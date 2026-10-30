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

    // Check if an active attempt was interrupted by a browser refresh
    const savedSession = this.getSavedActiveSession();
    if (savedSession && savedSession.playerData && savedSession.playerData.attemptId) {
      storage.checkStudentStatus(savedSession.playerData.enrollment).then((check) => {
        if (check.eligible && check.status === 'ACTIVE_ATTEMPT') {
          this.playerData = savedSession.playerData;
          this.startMission(true);
        } else {
          this.clearActiveSession();
          this.showMainMenu();
        }
      }).catch(() => {
        this.clearActiveSession();
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
      onViewLeaderboard: () => this.showLeaderboard()
    });
    registration.render(this.appContainer);
    this.activeScreen = registration;
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

// Bootstrap once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.init();
});
