/**
 * Production Environment State Manager
 * Tracks 4 core operational indicators:
 * - Service Availability
 * - Data Integrity
 * - Security Posture
 * - Deployment Stability
 */

export class ProductionState {
  constructor(initialValues = {}) {
    this.availability = initialValues.availability ?? 100;
    this.integrity = initialValues.integrity ?? 100;
    this.security = initialValues.security ?? 100;
    this.stability = initialValues.stability ?? 100;

    this.listeners = new Set();
  }

  reset() {
    this.availability = 100;
    this.integrity = 100;
    this.security = 100;
    this.stability = 100;
    this.notify();
  }

  getMetrics() {
    return {
      availability: Math.round(this.availability),
      integrity: Math.round(this.integrity),
      security: Math.round(this.security),
      stability: Math.round(this.stability),
      overall: Math.round(this.getOverallHealth())
    };
  }

  getOverallHealth() {
    return (this.availability + this.integrity + this.security + this.stability) / 4;
  }

  /**
   * Apply impact deltas from an incident response
   * @param {Object} impact { availability, integrity, security, stability }
   * @param {boolean} isCorrect Whether the player made the correct choice
   */
  applyIncidentOutcome(impact = {}, isCorrect = true) {
    const clamp = (val) => Math.min(100, Math.max(0, val));

    if (isCorrect) {
      // Correct choice preserves or boosts degraded metrics
      this.availability = clamp(this.availability + (impact.availability || 0));
      this.integrity = clamp(this.integrity + (impact.integrity || 0));
      this.security = clamp(this.security + (impact.security || 0));
      this.stability = clamp(this.stability + (impact.stability || 0));
    } else {
      // Penalty applies inversely or as defined by the scenario
      // If impact had positive numbers, inverted penalty represents the missed mitigation
      const penAvail = impact.availability ? -Math.abs(impact.availability * 1.2) : -10;
      const penInteg = impact.integrity ? -Math.abs(impact.integrity * 1.2) : 0;
      const penSec = impact.security ? -Math.abs(impact.security * 1.2) : 0;
      const penStab = impact.stability ? -Math.abs(impact.stability * 1.2) : -10;

      this.availability = clamp(this.availability + penAvail);
      this.integrity = clamp(this.integrity + penInteg);
      this.security = clamp(this.security + penSec);
      this.stability = clamp(this.stability + penStab);
    }

    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Send immediate initial state
    listener(this.getMetrics());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      try {
        listener(metrics);
      } catch (err) {
        console.error('ProductionState listener error:', err);
      }
    }
  }
}
