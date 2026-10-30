/**
 * IncidentEngine
 * Manages the 15-question incident bank and selects exactly 3 unique,
 * non-repeating scenarios for each 3-round mission session.
 */

import { INCIDENT_BANK } from '../data/incidents.js';

export class IncidentEngine {
  constructor() {
    this.allIncidents = [...INCIDENT_BANK];
    this.sessionQueue = [];
    this.currentRoundIndex = -1;
    this.totalRounds = 3;
    this.activeIncident = null;
  }

  /**
   * Prepares a fresh 3-round mission session.
   * Selects exactly 3 distinct incidents at random without repetition.
   */
  prepareMission() {
    // Fisher-Yates shuffle of the 15-question bank
    const shuffled = [...this.allIncidents];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pick exactly 3 unique scenarios for the 3 rounds
    this.sessionQueue = shuffled.slice(0, 3);
    this.currentRoundIndex = -1;
    this.activeIncident = null;
    return this.sessionQueue;
  }

  hasNextRound() {
    return this.currentRoundIndex + 1 < this.totalRounds;
  }

  nextRound() {
    if (!this.hasNextRound()) {
      return null;
    }

    this.currentRoundIndex++;
    this.activeIncident = this.sessionQueue[this.currentRoundIndex];

    return {
      incident: this.activeIncident,
      roundNumber: this.currentRoundIndex + 1,
      totalRounds: this.totalRounds
    };
  }

  getCurrent() {
    return this.activeIncident;
  }

  getCurrentRoundNumber() {
    return this.currentRoundIndex + 1;
  }

  getTotalRounds() {
    return this.totalRounds;
  }
}
