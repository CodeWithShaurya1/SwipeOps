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
    this.colWidth = 44; // Wide pitch for clean negative space without clutter
    this.tokens = [
      'git push', 'git pull', 'docker', 'kubectl', 'helm',
      'CI/CD', 'build', 'test', 'deploy', 'logs', 'YAML',
      'env', '01', '{}', '</>', 'k8s', 'pod', 'prod',
      'commit', '200 OK', '404', '500', 'bash', '::'
    ];
    this.chars = '01{}</>$:;=-+*~#@!%?010101';

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
      
      // Central Quiet Zone: 26% to 74% of viewport width
      const xRatio = x / w;
      const isCenterZone = xRatio > 0.26 && xRatio < 0.74;

      // Density: Center zone sparse (32%), edges active (68%)
      const shouldActivate = isCenterZone ? Math.random() < 0.32 : Math.random() < 0.68;

      const streamLength = 9 + Math.floor(Math.random() * 14); // 9 to 23 chars
      
      // Speed targets: 1.8x-2.2x faster than previous (~1.5 base)
      // Highlight quick burst (15%), primary medium (70%), ambient depth (15%)
      const speedRoll = Math.random();
      let speed;
      let isFastHighlight = false;

      if (speedRoll < 0.15 && !isCenterZone) {
        speed = 5.8 + Math.random() * 3.6; // High-velocity telemetry stream
        isFastHighlight = true;
      } else if (speedRoll < 0.85) {
        speed = 2.6 + Math.random() * 2.8; // Primary dynamic stream
      } else {
        speed = 1.8 + Math.random() * 1.4; // Slower secondary stream
      }

      // Generate characters
      const items = [];
      for (let j = 0; j < streamLength; j++) {
        const isToken = Math.random() < 0.28;
        const text = isToken 
          ? this.tokens[Math.floor(Math.random() * this.tokens.length)]
          : this.chars[Math.floor(Math.random() * this.chars.length)];
        
        items.push({
          text,
          isToken,
          colorType: Math.random() < 0.82 ? 'cyan' : 'violet',
          glitchTimer: Math.floor(Math.random() * 100)
        });
      }

      // Distribute y immediately across screen height so it is dynamic on load!
      this.columns.push({
        x,
        y: Math.random() * h,
        speed,
        active: shouldActivate,
        isCenterZone,
        isFastHighlight,
        length: streamLength,
        items,
        fontSize: isCenterZone ? 11 : (isFastHighlight ? 13 : 12),
        opacityMultiplier: isCenterZone ? 0.28 : 0.88
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
          let alpha = Math.max(0.04, trailFraction * 0.48) * col.opacityMultiplier;

          // Leading character is brighter with cyan/teal glow
          const isLeader = j === 0;
          if (isLeader) {
            alpha = Math.min(0.96, alpha * 2.4);
            ctx.fillStyle = col.isFastHighlight ? '#FFFFFF' : '#E0F8FF';
            ctx.shadowColor = '#46D5F5';
            ctx.shadowBlur = 10;
          } else {
            ctx.shadowBlur = 0;
            if (item.colorType === 'cyan') {
              ctx.fillStyle = `rgba(70, 213, 245, ${alpha})`;
            } else {
              ctx.fillStyle = `rgba(155, 123, 255, ${alpha * 0.9})`;
            }
          }

          ctx.fillText(item.text, col.x, charY);
          ctx.shadowBlur = 0;
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
