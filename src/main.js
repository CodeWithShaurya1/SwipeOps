/**
 * DEVOPS ARENA — Main Application Entry Point
 * Manages screen routing and mission lifecycle state.
 */

import './styles/main.css';
import { MainMenu } from './ui/MainMenu.js';
import { Registration } from './ui/Registration.js';
import { MissionScreen } from './ui/MissionScreen.js';
import { GameOver } from './ui/GameOver.js';
import { Leaderboard } from './ui/Leaderboard.js';
import { HowToPlayModal } from './ui/HowToPlayModal.js';

import { IncidentEngine } from './systems/IncidentEngine.js';
import { ScoringEngine } from './systems/ScoringEngine.js';
import { ProductionState } from './systems/ProductionState.js';
import { MissionTimer } from './systems/MissionTimer.js';
import { devopsBg } from './systems/DevOpsBackground.js';

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
    this.showMainMenu();
  }

  showMainMenu() {
    this.teardownActive();
    devopsBg.setScreenMode('menu');
    const menu = new MainMenu({
      onStartMission: () => this.showRegistration(),
      onHowToPlay: () => HowToPlayModal.show(),
      onLeaderboard: () => this.showLeaderboard()
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
      onBackToMenu: () => this.showMainMenu()
    });
    registration.render(this.appContainer);
    this.activeScreen = registration;
  }

  startMission() {
    this.teardownActive();
    devopsBg.setScreenMode('gameplay');

    // Instantiate fresh, decoupled systems for this mission session
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
      onPlayAgain: () => this.startMission(),
      onNextPlayer: () => this.showRegistration(),
      onReturnToMenu: () => this.showMainMenu()
    });

    gameOver.mount(this.appContainer);
    this.activeScreen = gameOver;
  }

  showLeaderboard() {
    this.teardownActive();
    devopsBg.setScreenMode('leaderboard');
    const leaderboard = new Leaderboard({
      onBackToMenu: () => this.showMainMenu(),
      onStartMission: () => this.showRegistration()
    });
    leaderboard.mount(this.appContainer);
    this.activeScreen = leaderboard;
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
