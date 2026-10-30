/**
 * ScoringEngine
 * Strictly manages point calculations, streaks, and accuracy.
 */

export class ScoringEngine {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }

  reset() {
    this.score = 0;
    this.correctDecisions = 0;
    this.incorrectDecisions = 0;
    this.timedOutDecisions = 0;
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.incidentsResolved = 0;
    this.scoredIncidentIds = new Set();
    this.notify();
  }

  /**
   * Process an incident decision outcome.
   * Ensures idempotency: an incident can only be scored once.
   * @param {string} incidentId
   * @param {'correct' | 'incorrect' | 'timeout'} outcome
   * @returns {{ pointsAwarded: number, bonusAwarded: number, streak: number, isStreakBonus: boolean }}
   */
  processOutcome(incidentId, outcome) {
    if (this.scoredIncidentIds.has(incidentId)) {
      console.warn(`Incident ${incidentId} was already scored. Ignoring duplicate invocation.`);
      return { pointsAwarded: 0, bonusAwarded: 0, streak: this.currentStreak, isStreakBonus: false };
    }

    this.scoredIncidentIds.add(incidentId);
    this.incidentsResolved++;

    let pointsAwarded = 0;
    let bonusAwarded = 0;
    let isStreakBonus = false;

    if (outcome === 'correct') {
      this.correctDecisions++;
      this.currentStreak++;
      if (this.currentStreak > this.maxStreak) {
        this.maxStreak = this.currentStreak;
      }

      pointsAwarded = 100;
      this.score += pointsAwarded;

      // Every 3 consecutive correct decisions awards +50 bonus points
      if (this.currentStreak > 0 && this.currentStreak % 3 === 0) {
        bonusAwarded = 50;
        this.score += bonusAwarded;
        isStreakBonus = true;
      }
    } else if (outcome === 'incorrect') {
      this.incorrectDecisions++;
      this.currentStreak = 0;
    } else if (outcome === 'timeout') {
      this.timedOutDecisions++;
      this.currentStreak = 0;
    }

    this.notify();

    return {
      pointsAwarded,
      bonusAwarded,
      streak: this.currentStreak,
      isStreakBonus
    };
  }

  getAccuracy() {
    const totalAnswered = this.correctDecisions + this.incorrectDecisions + this.timedOutDecisions;
    if (totalAnswered === 0) return 100;
    return Math.round((this.correctDecisions / totalAnswered) * 100);
  }

  getStats() {
    return {
      score: this.score,
      correct: this.correctDecisions,
      incorrect: this.incorrectDecisions,
      timeout: this.timedOutDecisions,
      totalAnswered: this.correctDecisions + this.incorrectDecisions + this.timedOutDecisions,
      accuracy: this.getAccuracy(),
      currentStreak: this.currentStreak,
      maxStreak: this.maxStreak,
      incidentsResolved: this.incidentsResolved
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const stats = this.getStats();
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch (err) {
        console.error('ScoringEngine listener error:', err);
      }
    }
  }
}
