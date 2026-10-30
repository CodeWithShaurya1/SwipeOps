/**
 * ProductionHealth Component
 * Compact, fluid pill-based telemetry cluster displaying the 4 fictional production metrics:
 * - Service Availability
 * - Data Integrity
 * - Security Posture
 * - Deployment Stability
 * 
 * Supports the incident decision without dominating the central viewport.
 */

export class ProductionHealth {
  constructor(productionState) {
    this.productionState = productionState;
    this.container = null;
    this.unsubscribe = null;
  }

  mount(container) {
    this.container = container;
    this.renderSkeleton();
    this.unsubscribe = this.productionState.subscribe((metrics) => {
      this.update(metrics);
    });
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="health-cluster-bar glass-surface" id="health-cluster-bar" aria-label="Production Health Telemetry">
        <!-- Service Availability -->
        <div class="health-pill" id="card-availability" title="Service Availability: Cluster Uptime">
          <div class="pill-glyph">🌐</div>
          <div class="pill-info">
            <div class="pill-top">
              <span class="pill-title">Availability</span>
              <span class="pill-pct" id="val-availability">100%</span>
            </div>
            <div class="pill-track">
              <div class="pill-fill" id="bar-availability" style="width: 100%; background: var(--color-success);"></div>
            </div>
          </div>
        </div>

        <!-- Data Integrity -->
        <div class="health-pill" id="card-integrity" title="Data Integrity: Replication & Consistency">
          <div class="pill-glyph">🛡️</div>
          <div class="pill-info">
            <div class="pill-top">
              <span class="pill-title">Integrity</span>
              <span class="pill-pct" id="val-integrity">100%</span>
            </div>
            <div class="pill-track">
              <div class="pill-fill" id="bar-integrity" style="width: 100%; background: var(--color-success);"></div>
            </div>
          </div>
        </div>

        <!-- Security Posture -->
        <div class="health-pill" id="card-security" title="Security Posture: Access Control & CVEs">
          <div class="pill-glyph">🔐</div>
          <div class="pill-info">
            <div class="pill-top">
              <span class="pill-title">Security</span>
              <span class="pill-pct" id="val-security">100%</span>
            </div>
            <div class="pill-track">
              <div class="pill-fill" id="bar-security" style="width: 100%; background: var(--color-success);"></div>
            </div>
          </div>
        </div>

        <!-- Deployment Stability -->
        <div class="health-pill" id="card-stability" title="Deployment Stability: Pod Health & Rollouts">
          <div class="pill-glyph">⚡</div>
          <div class="pill-info">
            <div class="pill-top">
              <span class="pill-title">Stability</span>
              <span class="pill-pct" id="val-stability">100%</span>
            </div>
            <div class="pill-track">
              <div class="pill-fill" id="bar-stability" style="width: 100%; background: var(--color-success);"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  update(metrics) {
    if (!this.container) return;

    const getColor = (val) => {
      if (val >= 75) return 'var(--color-success)';
      if (val >= 40) return 'var(--color-warning)';
      return 'var(--color-danger)';
    };

    const keys = ['availability', 'integrity', 'security', 'stability'];
    keys.forEach((key) => {
      const val = metrics[key] ?? 100;
      const cardEl = this.container.querySelector(`#card-${key}`);
      const valEl = this.container.querySelector(`#val-${key}`);
      const barEl = this.container.querySelector(`#bar-${key}`);

      if (valEl && barEl) {
        const prev = parseInt(valEl.textContent, 10);
        const color = getColor(val);
        valEl.textContent = `${val}%`;
        valEl.style.color = color;
        valEl.style.textShadow = val >= 75
          ? '0 0 8px rgba(52, 211, 153, 0.45)'
          : (val >= 40 ? '0 0 8px rgba(251, 191, 36, 0.40)' : '0 0 10px rgba(244, 63, 94, 0.50)');
        barEl.style.width = `${val}%`;
        barEl.style.background = color;
        barEl.style.boxShadow = val >= 75
          ? '0 0 8px rgba(52, 211, 153, 0.5)'
          : (val >= 40 ? '0 0 8px rgba(251, 191, 36, 0.5)' : '0 0 10px rgba(244, 63, 94, 0.65)');

        if (!isNaN(prev) && prev !== val && cardEl) {
          cardEl.classList.remove('metric-impacted');
          void cardEl.offsetWidth; // trigger reflow
          cardEl.classList.add('metric-impacted');
          setTimeout(() => {
            if (cardEl) cardEl.classList.remove('metric-impacted');
          }, 650);
        }
      }
    });
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
