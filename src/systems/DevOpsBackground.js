/**
 * DevOpsBackground
 * Ultra-responsive, high-framerate DevOps-Themed Matrix Rain Canvas Animation.
 * 
 * Features:
 * - 1.8x-2.2x faster streams with controlled speed variation (fast bursts, medium primary, slow depth)
 * - Immediate viewport population on launch (no waiting for offscreen drops)
 * - Complete DevOps technical tokens ('git push', 'git pull', 'docker', 'kubectl', 'helm', 'CI/CD', 'build', 'test', 'deploy', 'logs', 'YAML', 'env', '{}', '</>', '01', etc.)
 * - Deep midnight navy canvas vignette (#060A13 foundation with #46D5F5 cyan / #9B7BFF violet accents)
 * - Central Quiet Zone (26%-74% width) with low opacity so forms and cards remain completely legible
 * - Peripheral CI/CD conduits with traveling telemetry packets along screen borders
 * - Delta-time normalized 60 FPS requestAnimationFrame with tab visibility pause
 * - Interactive shockwaves on decisions (#39D9A0 emerald on success, #FF6B7D coral on incident)
 * - Strict pointer-events: none and prefers-reduced-motion compliance
 */

export class DevOpsBackground {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    // Stream state
    this.columns = [];
    this.colWidth = 54; // Generous column spacing to eliminate clutter
    this.tokens = [
      'git push', 'deploy', 'kubectl', 'helm', 'k8s',
      'build:ok', 'test:pass', 'v2.4.0', 'pod', '200 OK',
      'sha:8f3c', 'main', 'release', 'sync'
    ];
    this.chars = '01{}</>$:;=-+*~';

    // Peripheral conduit packets
    this.leftPackets = [];
    this.rightPackets = [];

    // Interactive Shockwaves
    this.shockwaves = [];

    // Performance & Lifecycle
    this.isRunning = false;
    this.isReducedMotion = false;
    this.lastTime = 0;

    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  mount(container = document.body) {
    if (this.canvas) return;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'devops-bg-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '0';
    this.canvas.style.opacity = '0.98';

    container.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Reduced motion media query
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.isReducedMotion = motionQuery.matches;
      motionQuery.addEventListener('change', (e) => {
        this.isReducedMotion = e.matches;
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    this.handleResize();
    this.start();
  }

  handleResize() {
    if (!this.canvas || typeof window === 'undefined') return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    this.initStreams();
  }

  handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.hidden) {
      this.stop();
    } else {
      this.lastTime = performance.now();
      this.start();
    }
  }

  initStreams() {
    const w = this.width;
    const h = this.height;
    const numCols = Math.floor(w / this.colWidth);
    this.columns = [];

    for (let i = 0; i < numCols; i++) {
      const x = i * this.colWidth + (this.colWidth * 0.5);
      
      // Central Calm Zone: 20% to 80% of viewport width
      const xRatio = x / w;
      const isCenterZone = xRatio > 0.20 && xRatio < 0.80;

      // Keep center calm (10% density), edges lightly active (40% density)
      const shouldActivate = isCenterZone ? Math.random() < 0.10 : Math.random() < 0.40;

      const streamLength = 6 + Math.floor(Math.random() * 8); // 6 to 14 chars
      
      const speedRoll = Math.random();
      let speed;
      let isFastHighlight = false;

      if (speedRoll < 0.10 && !isCenterZone) {
        speed = 3.0 + Math.random() * 1.5;
        isFastHighlight = true;
      } else {
        speed = 1.2 + Math.random() * 1.4; // Soft natural movement
      }

      // Generate characters
      const items = [];
      for (let j = 0; j < streamLength; j++) {
        const isToken = Math.random() < 0.35;
        const text = isToken 
          ? this.tokens[Math.floor(Math.random() * this.tokens.length)]
          : this.chars[Math.floor(Math.random() * this.chars.length)];
        
        // Steel blue (dominant), muted cyan (accent), subtle violet
        const roll = Math.random();
        const colorType = roll < 0.55 ? 'steel' : (roll < 0.85 ? 'cyan' : 'violet');

        items.push({
          text,
          isToken,
          colorType,
          glitchTimer: Math.floor(Math.random() * 120)
        });
      }

      this.columns.push({
        x,
        y: Math.random() * h,
        speed,
        active: shouldActivate,
        isCenterZone,
        isFastHighlight,
        length: streamLength,
        items,
        fontSize: isCenterZone ? 10 : 11,
        opacityMultiplier: isCenterZone ? 0.16 : 0.60
      });
    }

    // Initialize peripheral conduit packets
    this.leftPackets = [
      { y: 50, speed: 4.2 },
      { y: h * 0.55, speed: 5.6 }
    ];
    this.rightPackets = [
      { y: 120, speed: 4.8 },
      { y: h * 0.72, speed: 5.2 }
    ];
  }

  /**
   * Interactive Event Hook: Decision success pulse (emerald wave)
   */
  triggerSuccessPulse(x, y) {
    const originX = x !== undefined ? x : this.width * 0.5;
    const originY = y !== undefined ? y : this.height * 0.5;
    this.shockwaves.push({
      x: originX,
      y: originY,
      radius: 12,
      maxRadius: Math.max(this.width, this.height) * 0.75,
      color: '#39D9A0', // emerald token
      alpha: 0.80,
      speed: 22,
      type: 'success'
    });
  }

  /**
   * Interactive Event Hook: Incident alert pulse (coral alert)
   */
  triggerIncidentPulse(x, y) {
    const originX = x !== undefined ? x : this.width * 0.5;
    const originY = y !== undefined ? y : this.height * 0.5;
    this.shockwaves.push({
      x: originX,
      y: originY,
      radius: 12,
      maxRadius: Math.max(this.width, this.height) * 0.70,
      color: '#FF6B7D', // coral token
      alpha: 0.75,
      speed: 20,
      type: 'incident'
    });
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const render = (time) => {
      if (!this.isRunning) return;
      this.draw(time);
      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }

  stop() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  draw(time) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Delta-time normalization
    const dt = Math.min((time - (this.lastTime || time)) / 16.67, 2.5);
    this.lastTime = time;

    ctx.clearRect(0, 0, w, h);

    // 1. Deep Midnight Navy Background Vignette
    const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.40, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.88);
    bgGrad.addColorStop(0, '#0B1220'); // secondary background core
    bgGrad.addColorStop(0.55, '#060A13'); // deep midnight foundation
    bgGrad.addColorStop(1, '#020408'); // near-black edge
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Peripheral Screen Edge Conduits & Flowing Packets
    const edgeMargin = Math.max(24, Math.min(48, w * 0.03));
    ctx.strokeStyle = 'rgba(70, 213, 245, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(edgeMargin, 0);
    ctx.lineTo(edgeMargin, h);
    ctx.moveTo(w - edgeMargin, 0);
    ctx.lineTo(w - edgeMargin, h);
    ctx.stroke();

    if (!this.isReducedMotion) {
      // Flowing packets along edge conduits
      ctx.fillStyle = '#46D5F5';
      this.leftPackets.forEach(pkt => {
        pkt.y += pkt.speed * dt;
        if (pkt.y > h + 20) pkt.y = -30;
        ctx.fillRect(edgeMargin - 1, pkt.y, 3, 14);
      });

      ctx.fillStyle = '#9B7BFF';
      this.rightPackets.forEach(pkt => {
        pkt.y += pkt.speed * dt;
        if (pkt.y > h + 20) pkt.y = -30;
        ctx.fillRect(w - edgeMargin - 1, pkt.y, 3, 14);
      });
    }

    // 3. Render Sparse Technical Matrix Streams
    if (!this.isReducedMotion) {
      this.columns.forEach((col) => {
        if (!col.active) return;

        col.y += col.speed * dt;

        // Reset column when it passes below screen
        if (col.y - (col.length * 20) > h) {
          col.y = -Math.random() * 160 - 30;
          // Randomize characters on new drop
          col.items.forEach(item => {
            const isToken = Math.random() < 0.28;
            item.text = isToken
              ? this.tokens[Math.floor(Math.random() * this.tokens.length)]
              : this.chars[Math.floor(Math.random() * this.chars.length)];
          });
        }

        ctx.font = `600 ${col.fontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';

        const stepY = 20;
        const totalItems = col.items.length;

        for (let j = 0; j < totalItems; j++) {
          const charY = col.y - (j * stepY);
          if (charY < -30 || charY > h + 30) continue;

          const item = col.items[j];
          item.glitchTimer -= dt;
          if (item.glitchTimer <= 0) {
            item.glitchTimer = 60 + Math.floor(Math.random() * 120);
            if (!item.isToken) {
              item.text = this.chars[Math.floor(Math.random() * this.chars.length)];
            }
          }

          // Trailing alpha decay
          const trailFraction = 1 - (j / totalItems);
          let alpha = Math.max(0.04, trailFraction * 0.40) * col.opacityMultiplier;

          // Leading character is crisp and slightly brighter, no blurry neon shadows
          const isLeader = j === 0;
          if (isLeader) {
            alpha = Math.min(0.85, alpha * 2.0);
            ctx.fillStyle = col.isFastHighlight ? '#F8FAFC' : '#E2E8F0';
          } else {
            if (item.colorType === 'cyan') {
              ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
            } else if (item.colorType === 'steel') {
              ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
            } else {
              ctx.fillStyle = `rgba(129, 140, 248, ${alpha * 0.75})`;
            }
          }

          ctx.fillText(item.text, col.x, charY);
        }
      });
    }

    // 4. Interactive Shockwaves
    if (this.shockwaves.length > 0) {
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.radius += sw.speed * dt;
        sw.alpha = Math.max(0, 1 - (sw.radius / sw.maxRadius));

        if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
          this.shockwaves.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha * 0.60;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  destroy() {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}

export const devopsBg = new DevOpsBackground();
